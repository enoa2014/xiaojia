export interface ActivityRecord {
  id: string;
  title: string;
  date: string;
  location: string | null;
  capacity: number | null;
  status: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ActivityListResult {
  items: ActivityRecord[];
  total: number;
  page: number;
  pageSize: number;
}
