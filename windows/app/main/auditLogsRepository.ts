import Database from 'better-sqlite3';
import { AuditLogListSchema } from '../../shared/schemas/auditLogs.js';
import type { AuditLogListResult, AuditLogRecord } from '../../shared/types/audits.js';

type DatabaseHandle = InstanceType<typeof Database>;

type RawAuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  target: string | null;
  request_id: string | null;
  details: string | null;
  created_at: number | null;
};

const toTimestamp = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const parseJsonObject = (raw: unknown): Record<string, unknown> | null => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch (error) {
      console.warn('[auditLogsRepository] parse json failed', error);
      return null;
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
};

export class AuditLogsRepository {
  constructor(private readonly db: DatabaseHandle) {}

  list(rawParams: unknown): AuditLogListResult {
    const params = AuditLogListSchema.parse(rawParams ?? {});
    const where: string[] = [];
    const bindings: unknown[] = [];

    if (params.filter) {
      const { from, to, action, actorId } = params.filter;
      const fromTs = toTimestamp(from);
      const toTs = toTimestamp(to);
      if (fromTs != null) {
        where.push('created_at >= ?');
        bindings.push(fromTs);
      }
      if (toTs != null) {
        where.push('created_at <= ?');
        bindings.push(toTs);
      }
      if (action) {
        where.push('action = ?');
        bindings.push(action);
      }
      if (actorId) {
        where.push('actor_id = ?');
        bindings.push(actorId);
      }
    }

    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const offset = (params.page - 1) * params.pageSize;

    const selectSql =
      'SELECT id, actor_id, action, target, request_id, details, created_at FROM audit_logs' +
      whereClause +
      ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const countSql = 'SELECT COUNT(*) as total FROM audit_logs' + whereClause;

    const rows = this.db
      .prepare(selectSql)
      .all(...bindings, params.pageSize, offset) as RawAuditRow[];

    const { total } = this.db
      .prepare(countSql)
      .get(...bindings) as { total: number };

    return {
      items: rows.map((row) => this.mapRow(row)),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  private mapRow(row: RawAuditRow): AuditLogRecord {
    return {
      id: String(row.id),
      actorId: row.actor_id ?? null,
      action: String(row.action ?? ''),
      target: parseJsonObject(row.target),
      requestId: row.request_id ?? null,
      details: parseJsonObject(row.details),
      createdAt: Number(row.created_at ?? Date.now()),
    };
  }
}
