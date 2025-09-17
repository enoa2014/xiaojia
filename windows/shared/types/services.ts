export type ServiceStatus = "draft" | "pending" | "approved" | "rejected";

export interface ServiceRecord {
  id: string;
  patientId: string;
  type: string;
  date: string;
  description: string | null;
  images: string[];
  status: ServiceStatus;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number | null;
  reviewReason: string | null;
  reviewedAt: number | null;
}

export interface ServiceListResult {
  items: ServiceRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ServiceCreateInput {
  id?: string;
  patientId: string;
  type: string;
  date: string;
  description?: string | null;
  images?: string[];
  status?: ServiceStatus;
  createdBy?: string | null;
}

export interface ServiceReviewInput {
  id: string;
  action: "approve" | "reject";
  reason?: string;
}
