export interface PatientRecord {
  id: string;
  name: string;
  idCard: string | null;
  idCardTail: string | null;
  phone: string | null;
  birthDate: string | null;
  gender: string | null;
  nativePlace: string | null;
  ethnicity: string | null;
  hospital: string | null;
  hospitalDiagnosis: string | null;
  doctorName: string | null;
  symptoms: string | null;
  medicalCourse: string | null;
  followupPlan: string | null;
  familyEconomy: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PatientListResult {
  items: PatientRecord[];
  total: number;
  page: number;
  pageSize: number;
}
