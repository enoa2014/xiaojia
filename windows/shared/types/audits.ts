export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  action: string;
  target: Record<string, unknown> | null;
  requestId: string | null;
  details: Record<string, unknown> | null;
  createdAt: number;
}

export interface AuditLogListResult {
  items: AuditLogRecord[];
  total: number;
  page: number;
  pageSize: number;
}
