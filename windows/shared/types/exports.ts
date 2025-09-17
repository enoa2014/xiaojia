export type ExportTaskStatus = 'pending' | 'running' | 'done' | 'failed';
export type ExportTaskType = 'statsMonthly' | 'statsAnnual' | 'custom';

export interface ExportTaskRecord {
  id: string;
  templateId: string | null;
  type: ExportTaskType | string;
  params: Record<string, unknown>;
  status: ExportTaskStatus;
  downloadUrl: string | null;
  clientToken: string | null;
  requestId: string | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null;
  error: string | null;
}

export interface ExportTaskHistoryResult {
  items: ExportTaskRecord[];
  total: number;
  page: number;
  pageSize: number;
}
