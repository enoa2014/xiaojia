/* Local analysis for prepare/b.xlsx */
const path = require('node:path')
let XLSX
try { XLSX = require('xlsx') } catch (e) { XLSX = require(path.resolve(__dirname, '../functions/import-xlsx/node_modules/xlsx')) }

function toISO(d) {
  if (d === null || d === undefined || d === '') return null
  if (typeof d === 'number') {
    try {
      const x = XLSX.SSF.parse_date_code(d)
      const iso = new Date(Date.UTC(x.y, x.m - 1, x.d)).toISOString().slice(0, 10)
      return iso
    } catch (e) { /* ignore */ }
  }
  const t = new Date(d)
  if (!isNaN(t.getTime())) return t.toISOString().slice(0, 10)
  return null
}

function pickPhoneAndId(raw) {
  raw = String(raw || '')
  const phoneMatch = raw.match(/1[3-9]\d{9}/)
  const idMatch = raw.match(/\d{17}[\dXx]/)
  return {
    phone: phoneMatch ? phoneMatch[0] : null,
    id_card: idMatch ? idMatch[0] : null,
  }
}

function analyze(filePath) {
  const abs = path.resolve(process.cwd(), filePath || 'prepare/b.xlsx')
  const wb = XLSX.readFile(abs)
  const sheetNames = wb.SheetNames
  const wsname = sheetNames[0]
  const ws = wb.Sheets[wsname]
  const headerRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true })
  const h1 = (headerRows[0] || []).map(h => (h == null ? null : String(h).trim()))
  const h2 = (headerRows[1] || []).map(h => (h == null ? null : String(h).trim()))
  const headers = []
  for (let i = 0; i < Math.max(h1.length, h2.length); i++) {
    headers.push(h2[i] || h1[i] || `col_${i}`)
  }
  // Build rows using merged two-row header
  const rows = []
  for (let r = 2; r < headerRows.length; r++) { // start from 3rd actual row
    const arr = headerRows[r] || []
    const obj = {}
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = arr[c] == null ? '' : arr[c]
    }
    rows.push(obj)
  }

  const N = rows.length
  const known = {
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
  }

  const presentHeaders = headers.reduce((acc, h) => (acc[h] = true, acc), {})
  const headerPresence = Object.fromEntries(Object.entries(known).map(([k, h]) => [k, !!presentHeaders[h]]))

  // Missingness per column
  const missingRates = {}
  headers.forEach(h => missingRates[h] = 0)
  rows.forEach(r => {
    headers.forEach(h => { if (!String(r[h] ?? '').trim()) missingRates[h]++ })
  })
  Object.keys(missingRates).forEach(h => { missingRates[h] = { missing: missingRates[h], rate: +(missingRates[h] / Math.max(1, N)).toFixed(4) } })

  // id_card stats
  const idVals = rows.map(r => String(r[known.id_card] || '').trim()).filter(Boolean)
  const idValid = idVals.filter(v => /^(\d{17}[\dXx])$/.test(v))
  const idSet = new Set(idVals)
  const idCounts = {}
  idVals.forEach(v => { idCounts[v] = (idCounts[v] || 0) + 1 })
  const idDupes = Object.entries(idCounts).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // dates
  const cinVals = rows.map(r => r[known.checkInDate]).filter(v => v !== undefined)
  let cinPresent = 0, cinParsed = 0
  const cinDates = []
  for (const v of cinVals) {
    if (String(v).trim() !== '') cinPresent++
    const iso = toISO(v)
    if (iso) { cinParsed++; cinDates.push(iso) }
  }
  const cinMin = cinDates.length ? cinDates.slice().sort()[0] : null
  const cinMax = cinDates.length ? cinDates.slice().sort().slice(-1)[0] : null
  const cinYearCounts = {}
  cinDates.forEach(d => { const y = d.slice(0, 4); cinYearCounts[y] = (cinYearCounts[y] || 0) + 1 })

  // birth dates
  const birthVals = rows.map(r => r[known.birthDate]).filter(v => v !== undefined)
  let birthPresent = 0, birthParsed = 0
  for (const v of birthVals) {
    if (String(v).trim() !== '') birthPresent++
    if (toISO(v)) birthParsed++
  }

  // gender distribution
  const genderCounts = {}
  rows.forEach(r => {
    const g = String(r[known.gender] || '').trim() || '(空)'
    genderCounts[g] = (genderCounts[g] || 0) + 1
  })

  // mother info extraction
  let motherPresent = 0, phoneExtracted = 0, idExtracted = 0
  const phoneSamples = new Set()
  const idSamples = new Set()
  rows.forEach(r => {
    const raw = String(r[known.motherMixed] || '').trim()
    if (raw) motherPresent++
    const info = pickPhoneAndId(raw)
    if (info.phone) { phoneExtracted++; if (phoneSamples.size < 5) phoneSamples.add(info.phone) }
    if (info.id_card) { idExtracted++; if (idSamples.size < 5) idSamples.add(info.id_card) }
  })

  // name duplicates
  const nameVals = rows.map(r => String(r[known.name] || '').trim()).filter(Boolean)
  const nameCounts = {}
  nameVals.forEach(v => { nameCounts[v] = (nameCounts[v] || 0) + 1 })
  const nameDupes = Object.entries(nameCounts).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // sample rows (selected fields)
  const sample = rows.slice(0, 5).map(r => ({
    姓名: r[known.name] || '',
    身份证号: r[known.id_card] || '',
    入住时间: r[known.checkInDate] || '',
    出生日期: r[known.birthDate] || '',
    性别: r[known.gender] || '',
    母亲信息: r[known.motherMixed] || '',
    入住人: r[known.admitPersons] || ''
  }))

  return {
    file: abs,
    sheets: sheetNames,
    primarySheet: wsname,
    rows: N,
    headers,
    headerPresence,
    missingRates,
    idCard: {
      present: idVals.length,
      validFormat: idValid.length,
      uniqueNonEmpty: idSet.size,
      topDuplicates: idDupes
    },
    checkInDate: {
      present: cinPresent,
      parsed: cinParsed,
      invalid: cinPresent - cinParsed,
      min: cinMin,
      max: cinMax,
      byYear: cinYearCounts
    },
    birthDate: { present: birthPresent, parsed: birthParsed, invalid: birthPresent - birthParsed },
    gender: genderCounts,
    motherMixed: {
      present: motherPresent,
      phoneExtracted,
      idExtracted,
      phoneSamples: Array.from(phoneSamples),
      idSamples: Array.from(idSamples)
    },
    nameDuplicatesTop: nameDupes,
    sample
  }
}

if (require.main === module) {
  const fp = process.argv[2] || 'prepare/b.xlsx'
  const res = analyze(fp)
  console.log(JSON.stringify(res, null, 2))
}

module.exports = { analyze }
