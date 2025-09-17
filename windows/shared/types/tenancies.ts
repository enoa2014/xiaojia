export interface TenancyRecord {
  id: string;
  patientId: string | null;
  idCard: string | null;
  checkInDate: string;
  checkOutDate: string | null;
  room: string | null;
  bed: string | null;
  subsidy: number | null;
  extra: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface TenancyListResult {
  items: TenancyRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TenancyCreateInput {
  id?: string;
  patientId: string;
  idCard?: string | null;
  checkInDate: string;
  checkOutDate?: string | null;
  room?: string | null;
  bed?: string | null;
  subsidy?: number | null;
  extra?: string | null;
}

export interface TenancyUpdateInput {
  id: string;
  patch: Partial<TenancyCreateInput>;
}
