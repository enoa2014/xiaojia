#!/usr/bin/env python3
import json, os, re, sys, subprocess, tempfile
from datetime import datetime, timedelta

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.getcwd(), 'prepare', 'b.xlsx')
OUT_DIR = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.getcwd(), 'output')

COLS = {
  'name': ['姓名'],
  'id_card': ['身份证号'],
  'checkInDate': ['入住时间'],
  'birthDate': ['出生日期'],
  'gender': ['性别'],
  'nativePlace': ['籍贯'],
  'ethnicity': ['民族'],
  'hospital': ['就诊医院'],
  'hospitalDiagnosis': ['医院诊断'],
  'doctorName': ['医生姓名'],
  'symptoms': ['症状详情'],
  'medicalCourse': ['医治过程','医疗过程'],
  'followupPlan': ['后续治疗安排'],
  'fatherMixed': ['父亲姓名、电话、身份证号'],
  'motherMixed': ['母亲姓名、电话、身份证号','母亲姓名、电话、身份证'],
  'otherGuardians': ['其他监护人'],
  'familyEconomy': ['家庭经济'],
  'address': ['家庭地址'],
  'admitPersons': ['入住人']
}

def norm(s):
  if s is None: return None
  s = str(s).strip()
  return s if s else None

def norm_id(s):
  s = norm(s)
  if not s: return None
  return s.upper().replace(' ', '')

def is_valid_id18(idc):
  idc = norm_id(idc)
  if not idc or len(idc) != 18: return False
  if not re.match(r'^\d{17}[0-9X]$', idc): return False
  weights = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2]
  codes = ['1','0','X','9','8','7','6','5','4','3','2']
  s = sum(int(idc[i]) * weights[i] for i in range(17))
  return codes[s % 11] == idc[17]

def hamming18(a, b):
  a = norm_id(a); b = norm_id(b)
  if not a or not b or len(a)!=18 or len(b)!=18: return 999
  return sum(1 for i in range(18) if a[i]!=b[i])

def to_iso(d):
  if d is None or d == '':
    return None
  if isinstance(d, (int, float)):
    try:
      base = datetime(1899,12,30)
      dt = base + timedelta(days=float(d))
      return dt.strftime('%Y-%m-%d')
    except Exception:
      pass
  s = str(d).strip()
  if not s: return None
  s2 = s.replace('.', '-')
  for cand in (s, s2):
    try:
      dt = datetime.fromisoformat(cand)
      return dt.strftime('%Y-%m-%d')
    except Exception:
      pass
    try:
      dt = datetime.strptime(cand, '%Y-%m-%d')
      return dt.strftime('%Y-%m-%d')
    except Exception:
      pass
  return None

def pick_phone_id(raw):
  raw = norm(raw) or ''
  mphone = re.search(r'1[3-9]\d{9}', raw)
  mid = re.search(r'\d{17}[\dXx]', raw)
  name = raw
  if mphone: name = name.replace(mphone.group(0), '')
  if mid: name = name.replace(mid.group(0), '')
  name = re.sub(r'[\s，,、]+', ' ', name).strip()
  return {
    'name': name or None,
    'phone': mphone.group(0) if mphone else None,
    'id_card': norm_id(mid.group(0)) if mid else None
  }


def node_dump_rows(xlsx_path):
  js = ("""
const path=require('path');
let XLSX; try { XLSX=require('xlsx') } catch(e) { XLSX=require(path.resolve('functions/import-xlsx/node_modules/xlsx')) }
const p=__PATH__;
const wb=XLSX.readFile(p);
const ws=wb.Sheets[wb.SheetNames[0]];
const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true});
const h1=(rows[0]||[]).map(h=>h==null?null:String(h).trim());
const h2=(rows[1]||[]).map(h=>h==null?null:String(h).trim());
const headers=[]; for(let i=0;i<Math.max(h1.length,h2.length);i++){headers.push(h2[i]||h1[i]||`col_${i}`)}
for(let r=2;r<rows.length;r++){
  const arr=rows[r]||[];
  if(!arr || arr.length===0 || arr.every(x=>x==null || String(x).trim()==='')) continue;
  const o={}; for(let c=0;c<headers.length;c++){o[headers[c]]=(arr[c]==null?'':arr[c]);}
  console.log(JSON.stringify(o));
}
""")
  js = js.replace('__PATH__', json.dumps(xlsx_path))
  cmd = ['node','-e',js]
  out = subprocess.check_output(cmd, text=True)
  return [json.loads(line) for line in out.strip().splitlines() if line.strip()]


def pick(row, keys):
  for k in keys:
    if k in row: return row[k]
  return ''

def tail4(idc):
  s = (norm_id(idc) or '')
  return s[-4:] if len(s)>=4 else None

def main():
  rows = node_dump_rows(SRC)

  patients_by_id = {}
  patients_by_key = {}
  patients = []
  tenancies = []
  ten_keys = set()

  for idx, r in enumerate(rows):
    name = norm(pick(r, COLS['name']))
    idc = norm_id(pick(r, COLS['id_card']))
    cin = to_iso(pick(r, COLS['checkInDate']))
    birth = to_iso(pick(r, COLS['birthDate']))
    gender = norm(pick(r, COLS['gender']))
    nativePlace = norm(pick(r, COLS['nativePlace']))
    ethnicity = norm(pick(r, COLS['ethnicity']))
    address = norm(pick(r, COLS['address']))
    hospital = norm(pick(r, COLS['hospital']))
    hospitalDiagnosis = norm(pick(r, COLS['hospitalDiagnosis']))
    doctorName = norm(pick(r, COLS['doctorName']))
    symptoms = norm(pick(r, COLS['symptoms']))
    medicalCourse = norm(pick(r, COLS['medicalCourse']))
    followupPlan = norm(pick(r, COLS['followupPlan']))
    father = pick_phone_id(pick(r, COLS['fatherMixed']))
    mother = pick_phone_id(pick(r, COLS['motherMixed']))
    father['id_card'] = norm_id(father['id_card'])
    mother['id_card'] = norm_id(mother['id_card'])
    otherGuardians = norm(pick(r, COLS['otherGuardians']))
    familyEconomy = norm(pick(r, COLS['familyEconomy']))
    admitPersons = norm(pick(r, COLS['admitPersons']))

    if idc and (idc == father['id_card'] or idc == mother['id_card']):
      idc = None

    primary_phone = mother['phone'] or father['phone']
    if idc and not is_valid_id18(idc):
      mapped = None
      for eid, ep in patients_by_id.items():
        if hamming18(idc, eid) <= 2:
          sameName = (not name) or (ep.get('name') == name)
          sameBirth = (not birth) or (ep.get('birthDate') == birth)
          phoneOverlap = primary_phone and (ep.get('motherPhone') == primary_phone or ep.get('fatherPhone') == primary_phone)
          if (sameName and sameBirth) or phoneOverlap:
            mapped = eid
            break
      idc = mapped

    p = None
    if idc and idc in patients_by_id:
      p = patients_by_id[idc]
    if not p:
      keys = []
      if name and birth and primary_phone:
        keys.append(('nbp', f'{name}|{birth}|{primary_phone}'))
      if name and birth:
        keys.append(('nb', f'{name}|{birth}'))
      if name:
        keys.append(('n', name))
      for k in keys:
        if k in patients_by_key:
          p = patients_by_key[k]
          break

    create_new = False
    if not p:
      create_new = True
    else:
      if p.get('id_card') and idc and p['id_card'] != idc:
        typo = hamming18(p['id_card'], idc) <= 2
        sameName = (not name) or (p.get('name') == name)
        sameBirth = (not birth) or (p.get('birthDate') == birth)
        phoneOverlap = primary_phone and (p.get('motherPhone') == primary_phone or p.get('fatherPhone') == primary_phone)
        if not (typo and (sameName or sameBirth or phoneOverlap)):
          create_new = True

    # Decide if this row has enough info to create a patient
    has_identity = bool(name or idc)
    has_profile = any([
      birth, gender, nativePlace, ethnicity, address, hospital, hospitalDiagnosis,
      doctorName, symptoms, medicalCourse, followupPlan,
      father['name'], father['phone'], father['id_card'],
      mother['name'], mother['phone'], mother['id_card'],
      otherGuardians, familyEconomy
    ])

    if create_new and (has_identity or has_profile):
      p = {
        'name': name,
        'id_card': idc,
        'id_card_tail': tail4(idc),
        'birthDate': birth,
        'gender': gender,
        'nativePlace': nativePlace,
        'ethnicity': ethnicity,
        'address': address,
        'hospital': hospital,
        'hospitalDiagnosis': hospitalDiagnosis,
        'doctorName': doctorName,
        'symptoms': symptoms,
        'medicalCourse': medicalCourse,
        'followupPlan': followupPlan,
        'fatherName': father['name'], 'fatherPhone': father['phone'], 'fatherIdCard': father['id_card'],
        'motherName': mother['name'], 'motherPhone': mother['phone'], 'motherIdCard': mother['id_card'],
        'otherGuardians': otherGuardians,
        'familyEconomy': familyEconomy,
        'createdAt': int(datetime.utcnow().timestamp()*1000)
      }
      patients.append(p)
      if idc: patients_by_id[idc] = p
      if name and birth and primary_phone: patients_by_key[('nbp', f'{name}|{birth}|{primary_phone}')] = p
      elif name and birth: patients_by_key[('nb', f'{name}|{birth}')] = p
      elif name: patients_by_key[('n', name)] = p
    elif not create_new and p is not None:
      def fill(k,v):
        if v and not p.get(k): p[k]=v
      fill('birthDate', birth)
      for k,v in [('gender',gender),('nativePlace',nativePlace),('ethnicity',ethnicity),('address',address),('hospital',hospital),('hospitalDiagnosis',hospitalDiagnosis),('doctorName',doctorName),('symptoms',symptoms),('medicalCourse',medicalCourse),('followupPlan',followupPlan),('otherGuardians',otherGuardians),('familyEconomy',familyEconomy)]:
        fill(k,v)
      for k,v in [('fatherName',father['name']),('fatherPhone',father['phone']),('fatherIdCard',father['id_card']),('motherName',mother['name']),('motherPhone',mother['phone']),('motherIdCard',mother['id_card'])]:
        fill(k,v)
      if not p.get('id_card') and idc:
        p['id_card']=idc; p['id_card_tail']=tail4(idc); patients_by_id[idc]=p

    if cin or admitPersons:
      keyLeft = idc or (name or f'ROW#{idx}')
      dupKey = f"{keyLeft}|{cin or ''}|{(admitPersons or '').replace(' ','')}"
      if dupKey not in ten_keys:
        ten_keys.add(dupKey)
        tenancies.append({
          'patientKey': keyLeft,
          'id_card': idc,
          'patientName': name,
          'checkInDate': cin,
          'checkOutDate': None,
          'room': None,
          'bed': None,
          'subsidy': None,
          'extra': { 'admitPersons': admitPersons },
          'createdAt': int(datetime.utcnow().timestamp()*1000)
        })

  by_name = {}
  for i,p in enumerate(patients):
    n = (p.get('name') or '').strip()
    if not n: continue
    by_name.setdefault(n, []).append((i,p))
  remove_idx = set()
  for n, items in by_name.items():
    with_id = [x for x in items if x[1].get('id_card')]
    without_id = [x for x in items if not x[1].get('id_card')]
    if with_id and without_id:
      base = with_id[0][1]
      for i,q in without_id:
        def fill(k,v):
          if v and not base.get(k): base[k]=v
        fill('birthDate', q.get('birthDate'))
        for k in ['gender','nativePlace','ethnicity','address','hospital','hospitalDiagnosis','doctorName','symptoms','medicalCourse','followupPlan','otherGuardians','familyEconomy']:
          fill(k, q.get(k))
        for k in ['fatherName','fatherPhone','fatherIdCard','motherName','motherPhone','motherIdCard']:
          fill(k, q.get(k))
        remove_idx.add(i)
  patients = [p for i,p in enumerate(patients) if i not in remove_idx]

  # Final filter: drop records that are entirely empty (no name, no id, and no core fields)
  def is_meaningful(p):
    if p.get('name') or p.get('id_card'):
      return True
    keys = ['birthDate','gender','nativePlace','ethnicity','address','hospital','hospitalDiagnosis','doctorName','symptoms','medicalCourse','followupPlan','fatherName','fatherPhone','fatherIdCard','motherName','motherPhone','motherIdCard','otherGuardians','familyEconomy']
    return any(p.get(k) for k in keys)
  patients = [p for p in patients if is_meaningful(p)]

  os.makedirs(OUT_DIR, exist_ok=True)
  f_pat = os.path.join(OUT_DIR, 'patients.json')
  f_ten = os.path.join(OUT_DIR, 'tenancies.json')
  with open(f_pat,'w',encoding='utf-8') as f:
    for p in patients: f.write(json.dumps(p, ensure_ascii=False)+'\n')
  with open(f_ten,'w',encoding='utf-8') as f:
    for t in tenancies: f.write(json.dumps(t, ensure_ascii=False)+'\n')

  print(json.dumps({ 'src': SRC, 'out': { 'patients': f_pat, 'tenancies': f_ten }, 'counts': { 'patients': len(patients), 'tenancies': len(tenancies) } }, ensure_ascii=False))

if __name__ == '__main__':
  main()
