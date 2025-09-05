/* Export JSONL (one JSON per line) with .json suffix for console import */
const fs = require('node:fs')
const path = require('node:path')
let XLSX
try { XLSX = require('xlsx') } catch (e) { XLSX = require(path.resolve(__dirname, '../functions/import-xlsx/node_modules/xlsx')) }

const SRC = process.argv[2] || path.resolve(process.cwd(), 'prepare/b.xlsx')
const OUT_DIR = process.argv[3] || path.resolve(process.cwd(), 'export')

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
}

// Helpers for Chinese ID validation and similarity
function normId(s) {
  if (!s) return null
  const t = String(s).trim().toUpperCase().replace(/\s+/g, '')
  return t || null
}
function isValidId18(id) {
  id = normId(id)
  if (!id || id.length !== 18) return false
  if (!/^\d{17}[0-9X]$/.test(id)) return false
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const codes = ['1','0','X','9','8','7','6','5','4','3','2']
  let sum = 0
  for (let i = 0; i < 17; i++) sum += parseInt(id[i], 10) * weights[i]
  const check = codes[sum % 11]
  return check === id[17]
}
function hamming18(a, b) {
  a = normId(a); b = normId(b)
  if (!a || !b || a.length !== 18 || b.length !== 18) return Infinity
  let d = 0
  for (let i = 0; i < 18; i++) if (a[i] !== b[i]) d++
  return d
}

function toISO(d) {
  if (d === null || d === undefined || d === '') return null
  if (typeof d === 'number') {
    try {
      const x = XLSX.SSF.parse_date_code(d)
      return new Date(Date.UTC(x.y, x.m - 1, x.d)).toISOString().slice(0, 10)
    } catch (e) {}
  }
  const t = new Date(d)
  if (!isNaN(t.getTime())) return t.toISOString().slice(0, 10)
  // try replace dots with dashes
  const s = String(d).replace(/\./g, '-')
  const t2 = new Date(s)
  if (!isNaN(t2.getTime())) return t2.toISOString().slice(0, 10)
  return null
}

function pickPhoneAndId(raw) {
  raw = String(raw || '')
  const phoneMatch = raw.match(/1[3-9]\d{9}/)
  const idMatch = raw.match(/\d{17}[\dXx]/)
  let name = raw
  if (phoneMatch) name = name.replace(phoneMatch[0], '')
  if (idMatch) name = name.replace(idMatch[0], '')
  name = name.replace(/[\s，,、]+/g, ' ').trim()
  return {
    name: name || null,
    phone: phoneMatch ? phoneMatch[0] : null,
    id_card: idMatch ? idMatch[0] : null
  }
}

function mergeHeaderRows(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true })
  const h1 = (rows[0] || []).map(h => (h == null ? null : String(h).trim()))
  const h2 = (rows[1] || []).map(h => (h == null ? null : String(h).trim()))
  const headers = []
  for (let i = 0; i < Math.max(h1.length, h2.length); i++) headers.push(h2[i] || h1[i] || `col_${i}`)
  const data = []
  for (let r = 2; r < rows.length; r++) {
    const arr = rows[r] || []
    if (!arr || arr.length === 0 || arr.every(x => x == null || String(x).trim() === '')) continue
    const o = {}
    for (let c = 0; c < headers.length; c++) o[headers[c]] = arr[c] == null ? '' : arr[c]
    data.push(o)
  }
  return { headers, rows: data }
}

function pick(row, keys) {
  for (const k of keys) {
    if (k in row) return row[k]
  }
  return ''
}

function tail4(idc) {
  const s = String(idc || '').replace(/\s/g, '')
  return s.length >= 4 ? s.slice(-4) : null
}

function norm(s) { return String(s || '').trim() || null }

function main() {
  const wb = XLSX.readFile(SRC)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const merged = mergeHeaderRows(ws)
  const rows = merged.rows

  // Aggregation maps
  const patientsById = new Map() // id_card -> patient
  const patientsByName = new Map() // name -> patient (for records without id only)
  const patientsArr = []
  const tenanciesArr = []
  const tenKeySet = new Set()

  rows.forEach((r, idx) => {
    const name = norm(pick(r, COLS.name))
    let idc = normId(pick(r, COLS.id_card))
    const cin = toISO(pick(r, COLS.checkInDate))
    const birth = toISO(pick(r, COLS.birthDate))
    // Extract from parents if missing
    if (!idc) {
      const f = pickPhoneAndId(norm(pick(r, COLS.fatherMixed)) || '')
      const m = pickPhoneAndId(norm(pick(r, COLS.motherMixed)) || '')
      idc = normId(m.id_card || f.id_card || null)
    }
    // Parent info (for identity resolution)
    const gender = norm(pick(r, COLS.gender))
    const nativePlace = norm(pick(r, COLS.nativePlace))
    const ethnicity = norm(pick(r, COLS.ethnicity))
    const address = norm(pick(r, COLS.address))
    const hospital = norm(pick(r, COLS.hospital))
    const hospitalDiagnosis = norm(pick(r, COLS.hospitalDiagnosis))
    const doctorName = norm(pick(r, COLS.doctorName))
    const symptoms = norm(pick(r, COLS.symptoms))
    const medicalCourse = norm(pick(r, COLS.medicalCourse))
    const followupPlan = norm(pick(r, COLS.followupPlan))
    const father = pickPhoneAndId(norm(pick(r, COLS.fatherMixed)) || '')
    const mother = pickPhoneAndId(norm(pick(r, COLS.motherMixed)) || '')
    father.id_card = normId(father.id_card)
    mother.id_card = normId(mother.id_card)
    const otherGuardians = norm(pick(r, COLS.otherGuardians))
    const familyEconomy = norm(pick(r, COLS.familyEconomy))
    const admitPersons = norm(pick(r, COLS.admitPersons))

    // Resolve/Create patient per enhanced rule set
    // 1) If id equals a parent's id -> treat as child's id missing
    if (idc && (idc === father.id_card || idc === mother.id_card)) {
      idc = null
    }
    // 2) If id present but invalid checksum, try fuzzy match existing ids (<=2 chars diff) with same name+birth/phone
    const primaryPhone = mother.phone || father.phone || null
    if (idc && !isValidId18(idc)) {
      let mapped = null
      if (patientsById.size > 0 && (name || birth || primaryPhone)) {
        for (const [eid, ep] of patientsById.entries()) {
          const d = hamming18(idc, eid)
          if (d <= 2) {
            const sameName = !name || (ep.name && ep.name === name)
            const sameBirth = !birth || (ep.birthDate && ep.birthDate === birth)
            const phoneOverlap = primaryPhone && ((ep.motherPhone && ep.motherPhone === primaryPhone) || (ep.fatherPhone && ep.fatherPhone === primaryPhone))
            if ((sameName && sameBirth) || phoneOverlap) { mapped = eid; break }
          }
        }
      }
      if (mapped) idc = mapped; else idc = null
    }

    let p = null
    // 3) Try exact id match
    if (idc && patientsById.has(idc)) p = patientsById.get(idc)
    // 4) Without id, try name + birth + primaryPhone
    const nbpKey = name && birth && primaryPhone ? `${name}|${birth}|${primaryPhone}` : null
    if (!p && nbpKey && patientsByName.get(nbpKey)) p = patientsByName.get(nbpKey)
    // 5) Fallback: name + birth
    const nbKey = name && birth ? `${name}|${birth}` : null
    if (!p && nbKey && patientsByName.get(nbKey)) p = patientsByName.get(nbKey)
    // 6) Fallback: name only
    if (!p && name) p = patientsByName.get(name) || null

    const shouldCreateNew = () => {
      if (!p) return true
      // If both have id and different, but looks like typo (<=2 diffs) and other features align, then NOT a new patient
      if (p.id_card && idc && p.id_card !== idc) {
        const typo = hamming18(p.id_card, idc) <= 2
        const sameName = !name || (p.name === name)
        const sameBirth = !birth || (p.birthDate === birth)
        const phoneOverlap = primaryPhone && ((p.motherPhone === primaryPhone) || (p.fatherPhone === primaryPhone))
        if (typo && (sameName || sameBirth || phoneOverlap)) return false
        return true
      }
      return false
    }

    if (shouldCreateNew()) {
      p = {
        name: name || null,
        id_card: idc || null,
        id_card_tail: idc ? tail4(idc) : null,
        birthDate: birth,
        gender, nativePlace, ethnicity, address,
        hospital, hospitalDiagnosis, doctorName, symptoms, medicalCourse, followupPlan,
        fatherName: father.name, fatherPhone: father.phone, fatherIdCard: father.id_card,
        motherName: mother.name, motherPhone: mother.phone, motherIdCard: mother.id_card,
        otherGuardians, familyEconomy,
        createdAt: Date.now()
      }
      patientsArr.push(p)
      if (p.id_card) patientsById.set(p.id_card, p)
      if (nbpKey) patientsByName.set(nbpKey, p)
      else if (nbKey) patientsByName.set(nbKey, p)
      else if (p.name) patientsByName.set(p.name, p)
    } else {
      // Merge missing fields
      if (!p.id_card && idc) { p.id_card = idc; p.id_card_tail = tail4(idc); patientsById.set(idc, p) }
      const fill = (k, v) => { if (v && !p[k]) p[k] = v }
      fill('birthDate', birth)
      ;['gender','nativePlace','ethnicity','address','hospital','hospitalDiagnosis','doctorName','symptoms','medicalCourse','followupPlan','otherGuardians','familyEconomy'].forEach(k => fill(k, eval(k)))
      ;[['fatherName', father.name],['fatherPhone', father.phone],['fatherIdCard', father.id_card],['motherName', mother.name],['motherPhone', mother.phone],['motherIdCard', mother.id_card]].forEach(([k,v])=>fill(k,v))
    }

    // Tenancy
    if (cin || admitPersons) {
      const keyLeft = idc || (name || `ROW#${idx}`)
      const dupKey = `${keyLeft}|${cin || ''}|${(admitPersons||'').replace(/\s+/g,'')}`
      if (!tenKeySet.has(dupKey)) {
        tenKeySet.add(dupKey)
        tenanciesArr.push({
          patientKey: keyLeft,
          id_card: idc || null,
          patientName: name || null,
          checkInDate: cin,
          checkOutDate: null,
          room: null,
          bed: null,
          subsidy: null,
          extra: { admitPersons },
          createdAt: Date.now()
        })
      }
    }
  })

  // Post-merge pass: collapse same-name records where one has id and another doesn't
  const byName = new Map()
  patientsArr.forEach((p, i) => {
    const n = (p.name || '').trim()
    if (!n) return
    if (!byName.has(n)) byName.set(n, [])
    byName.get(n).push({ p, i })
  })
  const toRemove = new Set()
  for (const [n, items] of byName.entries()) {
    if (items.length < 2) continue
    const withId = items.filter(x => x.p.id_card)
    const withoutId = items.filter(x => !x.p.id_card)
    if (withId.length >= 1 && withoutId.length >= 1) {
      const base = withId[0].p
      for (const x of withoutId) {
        const q = x.p
        const fill = (k, v) => { if (v && !base[k]) base[k] = v }
        ;['birthDate','gender','nativePlace','ethnicity','address','hospital','hospitalDiagnosis','doctorName','symptoms','medicalCourse','followupPlan','otherGuardians','familyEconomy'].forEach(k => fill(k, q[k]))
        ;[['fatherName','fatherPhone','fatherIdCard'],['motherName','motherPhone','motherIdCard']].forEach(keys => keys.forEach(k => fill(k, q[k])))
        toRemove.add(x.i)
      }
    }
  }
  const patientsMerged = patientsArr.filter((_, idx) => !toRemove.has(idx))

  // Write JSONL files with .json suffix
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
  const fPatients = path.join(OUT_DIR, 'patients.json')
  const fTenancies = path.join(OUT_DIR, 'tenancies.json')
  const toLines = arr => arr.map(o => JSON.stringify(o)).join('\n') + '\n'
  fs.writeFileSync(fPatients, toLines(patientsMerged), 'utf8')
  fs.writeFileSync(fTenancies, toLines(tenanciesArr), 'utf8')

  const summary = {
    src: SRC,
    out: { patients: fPatients, tenancies: fTenancies },
    counts: { patients: patientsMerged.length, tenancies: tenanciesArr.length }
  }
  console.log(JSON.stringify(summary, null, 2))
}

main()
