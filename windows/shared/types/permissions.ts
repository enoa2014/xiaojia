export type PermissionField = 'id_card' | 'phone' | 'diagnosis';

export type PermissionStatus = 'pending' | 'approved' | 'rejected';

export interface PermissionRequestRecord {
  id: string;
  requesterId: string;
  patientId: string;
  fields: PermissionField[];
  reason: string;
  status: PermissionStatus;
  expiresAt: number | null;
  decisionBy: string | null;
  decisionReason: string | null;
  approvedAt: number | null;
  rejectedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type PermissionRequestListResult = {
  items: PermissionRequestRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type PermissionRequestCreateInput = {
  patientId: string;
  fields: PermissionField[];
  reason: string;
  expiresDays: number;
};

export type PermissionRequestDecisionInput = {
  id: string;
  action: 'approve' | 'reject';
  reason?: string;
  expiresDays?: number;
};
