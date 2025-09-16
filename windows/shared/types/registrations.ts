export interface RegistrationRecord {
  id: string;
  activityId: string;
  userId: string | null;
  status: string;
  guestContact: string | null;
  registeredAt: number | null;
  cancelledAt: number | null;
  checkedInAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface RegistrationListResult {
  items: RegistrationRecord[];
  total: number;
  page: number;
  pageSize: number;
}
