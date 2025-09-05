
import cloud from 'wx-server-sdk'
import * as XLSX from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 真实表头映射（两行表头合并后的列名，含别名）
const COLS = {
  name: ['姓名'],
  id_card: ['身份证号'],
  checkInDate: ['入住时间'],
  birthDate: ['出生日期'],
  gender: ['性别'],
  nativePlace: ['籍贯'],
  ethnicity: ['民族'],
  hospital: ['就诊医院'],
  hospitalDiagnosis: ['医院诊断'],
  doctorName: ['医生姓名'],
  symptoms: ['症状详情'],
  medicalCourse: ['医治过程', '医疗过程'],
  followupPlan: ['后续治疗安排'],
  fatherMixed: ['父亲姓名、电话、身份证号'],
  motherMixed: ['母亲姓名、电话、身份证号', '母亲姓名、电话、身份证'],
  otherGuardians: ['其他监护人'],
  familyEconomy: ['家庭经济'],
  address: ['家庭地址'],
  admitPersons: ['入住人']
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

function mergeHeaderRows(ws: XLSX.WorkSheet) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][]
  const h1 = (rows[0] || []).map((h:any) => (h == null ? null : String(h).trim()))
  const h2 = (rows[1] || []).map((h:any) => (h == null ? null : String(h).trim()))
  const headers: string[] = []
  for (let i = 0; i < Math.max(h1.length, h2.length); i++) {
    headers.push(h2[i] || h1[i] || `col_${i}`)
  }
  const data: any[] = []
  for (let r = 2; r < rows.length; r++) {
    const arr = rows[r] || []
    // Skip completely empty rows
    if (!arr || arr.length === 0 || arr.every((x:any) => x === null || x === undefined || String(x).trim() === '')) continue
    const obj: any = {}
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c]
      const val = arr[c]
      obj[key] = val == null ? '' : val
    }
    data.push(obj)
  }
  return { headers, rows: data }
}

function pick(row: any, keys: readonly string[]) {
  for (const k of keys) {
    if (k in row) return row[k]
  }
  return ''
}

async function loadWorkbookFromCos(fileID: string) {
  const { fileContent } = await cloud.downloadFile({ fileID })
  return XLSX.read(fileContent, { type: 'buffer' })
}

function loadWorkbookFromLocal(localPath?: string) {
  const p = localPath && localPath.trim().length > 0
    ? path.resolve(localPath)
    : path.resolve(process.cwd(), '../../prepare/b.xlsx')
  const buf = fs.readFileSync(p)
  return XLSX.read(buf, { type: 'buffer' })
}

type Report = {
  importedPatients: number
  importedTenancies: number
  rows: number // processed rows in this chunk
  sheet: string
  invalidDates: number
  missingIdCards: number
  totalRows?: number
  start?: number
  limit?: number
  nextOffset?: number|null
}

async function processWorkbook(wb: XLSX.WorkBook, opts: { dryRun?: boolean, start?: number, limit?: number }) {
  const wsname = wb.SheetNames[0]
  const ws = wb.Sheets[wsname]
  const merged = mergeHeaderRows(ws)
  const rows: any[] = merged.rows
  const totalRows = rows.length
  if (!rows.length) return { ok:true, data:{ importedPatients:0, importedTenancies:0, rows:0, sheet:wsname, invalidDates:0, missingIdCards:0, totalRows, start:0, limit:0, nextOffset:null } }

  const start = Math.max(0, Math.min(Number.isFinite(opts.start as number) ? (opts.start as number) : 0, totalRows))
  const limit = Math.max(1, Math.min(Number.isFinite(opts.limit as number) ? (opts.limit as number) : 100, totalRows - start))

  let importedPatients = 0, importedTenancies = 0
  const cacheById = new Map<string, any>()
  const cacheByName = new Map<string, any>()
  let invalidDates = 0, missingIdCards = 0

  const end = start + limit
  for (let idx = start; idx < end; idx++) {
    const r = rows[idx]
    const name = String(pick(r, COLS.name) || '').trim()
    let idc = String(pick(r, COLS.id_card) || '').trim()
    const cin = toISO(pick(r, COLS.checkInDate))
    const birth = toISO(pick(r, COLS.birthDate))
    // If id_card missing, try extract from parents
    if (!idc) {
      const fInfo = pickPhoneAndId(String(pick(r, COLS.fatherMixed) || ''))
      const mInfo = pickPhoneAndId(String(pick(r, COLS.motherMixed) || ''))
      idc = mInfo.id_card || fInfo.id_card || ''
    }
    if (pick(r, COLS.checkInDate) && !cin) invalidDates++
    if (!idc) missingIdCards++
    const gender = String(pick(r, COLS.gender) || '').trim() || null
    const nativePlace = String(pick(r, COLS.nativePlace) || '').trim() || null
    const ethnicity = String(pick(r, COLS.ethnicity) || '').trim() || null
    const address = String(pick(r, COLS.address) || '').trim() || null
    const hospital = String(pick(r, COLS.hospital) || '').trim() || null
    const hospitalDiagnosis = String(pick(r, COLS.hospitalDiagnosis) || '').trim() || null
    const doctorName = String(pick(r, COLS.doctorName) || '').trim() || null
    const symptoms = String(pick(r, COLS.symptoms) || '').trim() || null
    const medicalCourse = String(pick(r, COLS.medicalCourse) || '').trim() || null
    const followupPlan = String(pick(r, COLS.followupPlan) || '').trim() || null
    const fatherRaw = String(pick(r, COLS.fatherMixed) || '').trim()
    const father = pickPhoneAndId(fatherRaw)
    const motherRaw = String(pick(r, COLS.motherMixed) || '').trim()
    const mother = pickPhoneAndId(motherRaw)
    const otherGuardians = String(pick(r, COLS.otherGuardians) || '').trim() || null
    const familyEconomy = String(pick(r, COLS.familyEconomy) || '').trim() || null
    const admitPersons = String(pick(r, COLS.admitPersons) || '').trim() || null

    // Upsert patient by id_card
    // Resolve patient by rule:
    // 1) If id_card present → look up by id_card first
    // 2) Else or not found → look up by exact name
    // 3) If found-by-name and this row has id_card and doc没有id_card → patch doc with id_card
    // 4) If none found → create
    let patientDoc: any | null = null
    if (idc && cacheById.has(idc)) patientDoc = cacheById.get(idc)
    if (!patientDoc && idc) {
      const existed = await db.collection('Patients').where({ id_card: idc }).limit(1).get()
      if (existed.data && existed.data.length) patientDoc = existed.data[0]
    }
    if (!patientDoc && name) {
      if (cacheByName.has(name)) patientDoc = cacheByName.get(name)
      if (!patientDoc) {
        const existedByName = await db.collection('Patients').where({ name }).limit(1).get()
        if (existedByName.data && existedByName.data.length) patientDoc = existedByName.data[0]
      }
    }
    if (patientDoc) {
      // Patch missing id_card onto existing named doc if needed
      if (!opts.dryRun && idc && !patientDoc.id_card) {
        try {
          await db.collection('Patients').doc(patientDoc._id).update({ data: { id_card: idc, id_card_tail: tail4(idc) } })
          patientDoc.id_card = idc
          patientDoc.id_card_tail = tail4(idc)
        } catch (e) {
          // ignore unique conflicts
        }
      }
    } else {
      // create new patient
      if (!opts.dryRun) {
        const addRes = await db.collection('Patients').add({ data: {
          name: name || null,
          id_card: idc || null,
          id_card_tail: idc ? tail4(idc) : null,
          gender, birthDate: birth, nativePlace, ethnicity, address,
          hospital, hospitalDiagnosis, doctorName, symptoms,
          medicalCourse, followupPlan,
          fatherName: father.name, fatherPhone: father.phone, fatherIdCard: father.id_card,
          motherName: mother.name, motherPhone: mother.phone, motherIdCard: mother.id_card,
          otherGuardians, familyEconomy,
          createdAt: Date.now()
        }})
        patientDoc = { _id: addRes._id, name, id_card: idc }
      }
      importedPatients++
    }
    if (patientDoc) {
      if (patientDoc.id_card) cacheById.set(patientDoc.id_card, patientDoc)
      if (patientDoc.name) cacheByName.set(patientDoc.name, patientDoc)
    }

    // Insert tenancy if admission info exists
    if (cin || admitPersons) {
      if (!opts.dryRun) {
        // Dedup tenancy: check existing by (id_card or patientKey) + checkInDate + admitPersons
        const key = idc || name
        let existedT = null
        if (key) {
          let q = db.collection('Tenancies').where({
            checkInDate: cin,
            ...(idc ? { id_card: idc } : { patientKey: name })
          }).limit(1)
          const ex = await q.get()
          if (ex.data && ex.data.length) existedT = ex.data[0]
        }
        if (!existedT) {
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
      } else {
        importedTenancies++
      }
    }
  }

  const nextOffset = end < totalRows ? end : null
  return { ok:true, data:{ importedPatients, importedTenancies, rows: limit, sheet: wsname, invalidDates, missingIdCards, totalRows, start, limit, nextOffset } }
}

export const main = async (event:any) => {
  const evt = event || {}
  const action = evt.action
  const payload = evt.payload || {}
  if (action === 'fromCos') {
    const fileID = payload && payload.fileID
    if (!fileID) return { ok:false, error:{ code:'E_ARG', msg:'fileID required' } }
    const wb = await loadWorkbookFromCos(fileID)
    const dryRun = !!payload.dryRun
    const start = (typeof payload.offset !== 'undefined') ? payload.offset : payload.start
    const limit = payload.limit
    return processWorkbook(wb, { dryRun, start, limit })
  }
  if (action === 'fromLocal') {
    const localPath: string|undefined = (payload && payload.path) || undefined
    const wb = loadWorkbookFromLocal(localPath)
    const dryRun = payload && (payload.dryRun === false ? false : true)
    const start = (typeof payload.offset !== 'undefined') ? payload.offset : payload.start
    const limit = payload.limit
    return processWorkbook(wb, { dryRun, start, limit })
  }
  return { ok:false, error:{ code:'E_ACTION', msg:'unsupported action' } }
}
