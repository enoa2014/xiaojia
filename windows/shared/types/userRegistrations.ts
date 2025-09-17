export type UserRegistrationStatus = 'pending' | 'active' | 'rejected';

export interface UserRegistrationRecord {
  id: string;
  name: string | null;
  phoneMasked: string | null;
  applyRole: 'volunteer' | 'parent';
  relativePatientName: string | null;
  relativeRelation: 'father' | 'mother' | 'guardian' | 'other' | null;
  relativePatientIdCard: string | null;
  status: UserRegistrationStatus;
  decisionBy: string | null;
  decisionReason: string | null;
  approvedAt: number | null;
  rejectedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type UserRegistrationListResult = {
  items: UserRegistrationRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type UserRegistrationDecision = 'approve' | 'reject';

export interface UserRegistrationDecisionInput {
  id: string;
  action: UserRegistrationDecision;
  role?: 'volunteer' | 'parent';
  reason?: string;
  reviewerId?: string;
}
