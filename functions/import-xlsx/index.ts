
import cloud from 'wx-server-sdk'
import * as XLSX from 'xlsx'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 真实表头映射（来自截图）
const HEADERS = {
  name: '姓名',
  id_card: '身份证号',
  checkInDate: '入住时间',
  birthDate: '出生日期',
  gender: '性别',
  nativePlace: '籍贯',
  ethnicity: '民族',
  hospital: '就诊医院',
  hospitalDiagnosis: '医院诊断',
  doctorName: '医生姓名',
  symptoms: '症状详情',
  medicalCourse: '医疗过程',
  followupPlan: '后续治疗安排',
  motherMixed: '母亲姓名、电话、身份证',
  otherGuardians: '其他监护人',
  familyEconomy: '家庭经济',
  admitPersons: '入住人'
} as const

function tail4(idc?: string|null) {
  const s = (idc||'').replace(/\s/g,'')
  return s.length>=4 ? s.slice(-4) : null
}
function toISO(d:any): string|null {
  if (d===null || d===undefined || d==='') return null
  if (typeof d === 'number') {
    try {
      const x = XLSX.SSF.parse_date_code(d)
      const iso = new Date(Date.UTC(x.y, x.m-1, x.d)).toISOString().slice(0,10)
      return iso
    } catch(e) {}
  }
  const t = new Date(d)
  if (!isNaN(t.getTime())) return t.toISOString().slice(0,10)
  return null
}

function pickPhoneAndId(raw: string) {
  const phoneMatch = raw.match(/1[3-9]\d{9}/)
  const idMatch = raw.match(/\d{17}[\dXx]/)
  let name = raw
  if (phoneMatch) name = name.replace(phoneMatch[0], '')
  if (idMatch) name = name.replace(idMatch[0], '')
  name = name.replace(/[\\s，,、]+/g,' ').trim()
  return {
    name: name || null,
    phone: phoneMatch ? phoneMatch[0] : null,
    id_card: idMatch ? idMatch[0] : null
  }
}

export const main = async (event:any) => {
  const { action, payload } = event || {}
  if (action !== 'fromCos') return { ok:false, error:{ code:'E_ACTION', msg:'unsupported action' } }
  const fileID = payload?.fileID
  if (!fileID) return { ok:false, error:{ code:'E_ARG', msg:'fileID required' } }

  const { fileContent } = await cloud.downloadFile({ fileID })
  const wb = XLSX.read(fileContent, { type: 'buffer' })
  const wsname = wb.SheetNames[0]
  const ws = wb.Sheets[wsname]
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
  if (!rows.length) return { ok:true, data:{ importedPatients:0, importedTenancies:0, sheet:wsname } }

  let importedPatients = 0, importedTenancies = 0
  const seenPatients = new Set<string>()

  for (const r of rows) {
    const name = String(r[HEADERS.name]||'').trim()
    const idc = String(r[HEADERS.id_card]||'').trim()
    const cin = toISO(r[HEADERS.checkInDate])
    const birth = toISO(r[HEADERS.birthDate])
    const gender = String(r[HEADERS.gender]||'').trim() || null
    const nativePlace = String(r[HEADERS.nativePlace]||'').trim() || null
    const ethnicity = String(r[HEADERS.ethnicity]||'').trim() || null
    const hospital = String(r[HEADERS.hospital]||'').trim() || null
    const hospitalDiagnosis = String(r[HEADERS.hospitalDiagnosis]||'').trim() || null
    const doctorName = String(r[HEADERS.doctorName]||'').trim() || null
    const symptoms = String(r[HEADERS.symptoms]||'').trim() || null
    const medicalCourse = String(r[HEADERS.medicalCourse]||'').trim() || null
    const followupPlan = String(r[HEADERS.followupPlan]||'').trim() || null
    const motherRaw = String(r[HEADERS.motherMixed]||'').trim()
    const mother = pickPhoneAndId(motherRaw)
    const otherGuardians = String(r[HEADERS.otherGuardians]||'').trim() || null
    const familyEconomy = String(r[HEADERS.familyEconomy]||'').trim() || null
    const admitPersons = String(r[HEADERS.admitPersons]||'').trim() || null

    // Upsert patient by id_card
    if (idc && !seenPatients.has(idc)) {
      const existed = await db.collection('Patients').where({ id_card: idc }).limit(1).get()
      if (!existed.data.length) {
        await db.collection('Patients').add({ data: {
          name: name || null,
          id_card: idc,
          id_card_tail: tail4(idc),
          gender, birthDate: birth, nativePlace, ethnicity,
          hospital, hospitalDiagnosis, doctorName, symptoms,
          medicalCourse, followupPlan, motherName: mother.name,
          motherPhone: mother.phone, motherIdCard: mother.id_card,
          otherGuardians, familyEconomy,
          createdAt: Date.now()
        }})
        importedPatients++
      }
      seenPatients.add(idc)
    }

    // Insert tenancy if admission info exists
    if (cin || admitPersons) {
      await db.collection('Tenancies').add({ data: {
        patientKey: idc || name,
        id_card: idc || null,
        checkInDate: cin,
        checkOutDate: null,
        room: null,
        bed: null,
        subsidy: null,
        extra: { admitPersons },
        createdAt: Date.now()
      }})
      importedTenancies++
    }
  }

  return { ok:true, data:{ importedPatients, importedTenancies, rows: rows.length, sheet: wsname } }
}
