import argparse, pandas as pd, json, os, re, math
from datetime import datetime
from typing import List

RAW_HEADERS = [
  '序号', '姓名', '性别', '入住时间', '入住人', '出生日期', '籍贯', '民族', '身份证号',
  '就诊医院', '医院诊断', '医生姓名', '症状详情', '医治过程', '后续治疗安排', '家庭地址',
  '父亲姓名、电话、身份证号', '母亲姓名、电话、身份证号', '其他监护人', '家庭经济'
]

HEADERS = {
  'name': '姓名',
  'id_card': '身份证号',
  'checkInDate': '入住时间',
  'birthDate': '出生日期',
  'gender': '性别',
  'nativePlace': '籍贯',
  'ethnicity': '民族',
  'hospital': '就诊医院',
  'hospitalDiagnosis': '医院诊断',
  'doctorName': '医生姓名',
  'symptoms': '症状详情',
  'medicalCourse': '医治过程',
  'followupPlan': '后续治疗安排',
  'fatherMixed': '父亲姓名、电话、身份证号',
  'motherMixed': '母亲姓名、电话、身份证号',
  'otherGuardians': '其他监护人',
  'familyEconomy': '家庭经济',
  'admitPersons': '入住人',
  'homeAddress': '家庭地址'
}

def normalize_headers(df: pd.DataFrame) -> pd.DataFrame:
  if df.empty:
    return df
  header1 = [str(x).strip() if not pd.isna(x) else '' for x in df.iloc[0].tolist()]
  header2 = [str(x).strip() if not pd.isna(x) else '' for x in df.iloc[1].tolist()]
  columns: List[str] = []
  length = max(len(header1), len(header2))
  for i in range(length):
    h2 = header2[i] if i < len(header2) else ''
    h1 = header1[i] if i < len(header1) else ''
    col = h2 or h1 or f'col_{i}'
    columns.append(col)
  data = df.iloc[2:].copy()
  data.columns = columns
  return data


def to_iso(v):
  if pd.isna(v) or v == '':
    return None
  if isinstance(v, (int, float)) and not math.isnan(v):
    try:
      return pd.to_datetime(v, unit='D', origin='1899-12-30').date().isoformat()
    except Exception:
      pass
  try:
    return pd.to_datetime(str(v)).date().isoformat()
  except Exception:
    return None

def tail4(s):
  s = re.sub(r'\s', '', str(s or ''))
  return s[-4:] if len(s) >= 4 else None

def pick_phone_and_id(raw):
  raw = str(raw or '')
  phone = None
  m_phone = re.search(r'1[3-9]\d{9}', raw)
  if m_phone:
    phone = m_phone.group(0)
  idc = None
  m_id = re.search(r'\d{17}[\dXx]', raw)
  if m_id:
    idc = m_id.group(0)
  name = raw
  if phone:
    name = name.replace(phone, '')
  if idc:
    name = name.replace(idc, '')
  name = re.sub(r'[\\s,、]+', ' ', name).strip()
  return name or None, phone, idc


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--in', dest='fin', required=True)
  ap.add_argument('--out', dest='outdir', required=True)
  args = ap.parse_args()
  os.makedirs(args.outdir, exist_ok=True)

  raw = pd.read_excel(args.fin, header=None)
  df = normalize_headers(raw)
  patients = []
  tenancies = []
  seen_patients = set()
  seen_ten = set()

  for _, row in df.iterrows():
    name = str(row.get(HEADERS['name']) or '').strip()
    idc = str(row.get(HEADERS['id_card']) or '').strip()
    if not name and not idc:
      continue

    cin = to_iso(row.get(HEADERS['checkInDate']))
    birth = to_iso(row.get(HEADERS['birthDate']))
    gender = str(row.get(HEADERS['gender']) or '').strip() or None
    nativePlace = str(row.get(HEADERS['nativePlace']) or '').strip() or None
    ethnicity = str(row.get(HEADERS['ethnicity']) or '').strip() or None
    hospital = str(row.get(HEADERS['hospital']) or '').strip() or None
    hospitalDiagnosis = str(row.get(HEADERS['hospitalDiagnosis']) or '').strip() or None
    doctorName = str(row.get(HEADERS['doctorName']) or '').strip() or None
    symptoms = str(row.get(HEADERS['symptoms']) or '').strip() or None
    medicalCourse = str(row.get(HEADERS['medicalCourse']) or '').strip() or None
    followupPlan = str(row.get(HEADERS['followupPlan']) or '').strip() or None
    homeAddress = str(row.get(HEADERS['homeAddress']) or '').strip() or None

    fatherMixed = row.get(HEADERS['fatherMixed'])
    fatherName, fatherPhone, fatherIdCard = pick_phone_and_id(fatherMixed)

    motherMixed = row.get(HEADERS['motherMixed'])
    motherName, motherPhone, motherIdCard = pick_phone_and_id(motherMixed)

    otherGuardians = str(row.get(HEADERS['otherGuardians']) or '').strip() or None
    familyEconomy = str(row.get(HEADERS['familyEconomy']) or '').strip() or None
    admitPersons = str(row.get(HEADERS['admitPersons']) or '').strip() or None

    if idc:
      if idc not in seen_patients:
        patients.append({
          "name": name or None,
          "id_card": idc,
          "id_card_tail": tail4(idc),
          "gender": gender,
          "birthDate": birth,
          "nativePlace": nativePlace,
          "ethnicity": ethnicity,
          "hospital": hospital,
          "hospitalDiagnosis": hospitalDiagnosis,
          "doctorName": doctorName,
          "symptoms": symptoms,
          "medicalCourse": medicalCourse,
          "followupPlan": followupPlan,
          "homeAddress": homeAddress,
          "fatherName": fatherName,
          "fatherPhone": fatherPhone,
          "fatherIdCard": fatherIdCard,
          "motherName": motherName,
          "motherPhone": motherPhone,
          "motherIdCard": motherIdCard,
          "otherGuardians": otherGuardians,
          "familyEconomy": familyEconomy,
          "createdAt": int(pd.Timestamp.now().timestamp() * 1000)
        })
        seen_patients.add(idc)
    else:
      # fallback to name-only records
      key = name
      if key and key not in seen_patients:
        patients.append({
          "name": name or None,
          "id_card": None,
          "id_card_tail": None,
          "gender": gender,
          "birthDate": birth,
          "nativePlace": nativePlace,
          "ethnicity": ethnicity,
          "hospital": hospital,
          "hospitalDiagnosis": hospitalDiagnosis,
          "doctorName": doctorName,
          "symptoms": symptoms,
          "medicalCourse": medicalCourse,
          "followupPlan": followupPlan,
          "homeAddress": homeAddress,
          "fatherName": fatherName,
          "fatherPhone": fatherPhone,
          "fatherIdCard": fatherIdCard,
          "motherName": motherName,
          "motherPhone": motherPhone,
          "motherIdCard": motherIdCard,
          "otherGuardians": otherGuardians,
          "familyEconomy": familyEconomy,
          "createdAt": int(pd.Timestamp.now().timestamp() * 1000)
        })
        seen_patients.add(key)

    if cin or admitPersons:
      key = (idc or name, cin, admitPersons)
      if key not in seen_ten:
        tenancies.append({
          "patientKey": idc or name,
          "id_card": idc or None,
          "checkInDate": cin,
          "checkOutDate": None,
          "room": None,
          "bed": None,
          "subsidy": None,
          "extra": {"admitPersons": admitPersons},
          "createdAt": int(pd.Timestamp.now().timestamp() * 1000)
        })
        seen_ten.add(key)

  with open(os.path.join(args.outdir, 'patients.jsonl'), 'w', encoding='utf-8') as f:
    for d in patients:
      f.write(json.dumps(d, ensure_ascii=False) + "\n")

  with open(os.path.join(args.outdir, 'tenancies.jsonl'), 'w', encoding='utf-8') as f:
    for d in tenancies:
      f.write(json.dumps(d, ensure_ascii=False) + "\n")

  print(f"Generated {len(patients)} patients, {len(tenancies)} tenancies")

if __name__ == '__main__':
  main()
