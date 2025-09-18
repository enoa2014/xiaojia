
import Database from 'better-sqlite3';
import type {
  PermissionField,
  PermissionRequestListResult,
  PermissionRequestRecord,
  PermissionStatus,
} from '../../shared/types/permissions.js';
import type {
  PermissionRequestApprovalUpdate,
  PermissionRequestInsert,
  PermissionRequestListParams,
  PermissionRequestRejectionUpdate,
} from '../../shared/services/permissionRequestsService.js';

type DatabaseHandle = InstanceType<typeof Database>;

type RawRow = {
  id: string;
  requester_id: string;
  patient_id: string;
  fields: string | null;
  reason: string;
  status: string;
  expires_at: number | null;
  decision_by: string | null;
  decision_reason: string | null;
  approved_at: number | null;
  rejected_at: number | null;
  created_at: number;
  updated_at: number;
};

const serializeFields = (fields: PermissionField[]): string => JSON.stringify(fields);

const parseFields = (value: unknown): PermissionField[] => {
  const normalize = (input: unknown): string[] => {
    if (!input) return [];
    if (Array.isArray(input)) return input.map((item) => String(item));
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [input];
      } catch {
        return input.length ? [input] : [];
      }
    }
    return [];
  };

  const candidates = normalize(value);
  return candidates.filter((item): item is PermissionField =>
    item === 'id_card' || item === 'phone' || item === 'diagnosis'
  );
};

const parseStatus = (status: string | null): PermissionStatus => {
  if (status === 'approved' || status === 'rejected' || status === 'pending') {
    return status;
  }
  return 'pending';
};

export class PermissionRequestsRepository {
  constructor(private readonly db: DatabaseHandle) {}

  list(params: PermissionRequestListParams): PermissionRequestListResult {
    const where: string[] = [];
    const bindings: unknown[] = [];

    if (params.filter) {
      const { patientId, requesterId, status } = params.filter;
      if (patientId) {
        where.push('patient_id = ?');
        bindings.push(patientId);
      }
      if (requesterId) {
        where.push('requester_id = ?');
        bindings.push(requesterId);
      }
      if (status) {
        where.push('status = ?');
        bindings.push(status);
      }
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (params.page - 1) * params.pageSize;

    const rows = this.db
      .prepare(
        `SELECT id, requester_id, patient_id, fields, reason, status, expires_at, decision_by, decision_reason,
                approved_at, rejected_at, created_at, updated_at
         FROM permission_requests ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...bindings, params.pageSize, offset) as RawRow[];

    const { total } = this.db
      .prepare(`SELECT COUNT(*) as total FROM permission_requests ${whereClause}`)
      .get(...bindings) as { total: number };

    return {
      items: rows.map((row) => this.mapRow(row)),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  create(data: PermissionRequestInsert): PermissionRequestRecord {
    this.db
      .prepare(
        `INSERT INTO permission_requests (
          id, requester_id, patient_id, fields, reason, status, expires_at, decision_by, decision_reason,
          approved_at, rejected_at, created_at, updated_at
        ) VALUES (
          @id, @requester_id, @patient_id, @fields, @reason, @status, @expires_at, @decision_by, @decision_reason,
          @approved_at, @rejected_at, @created_at, @updated_at
        )`
      )
      .run({
        id: data.id,
        requester_id: data.requesterId,
        patient_id: data.patientId,
        fields: serializeFields(data.fields),
        reason: data.reason,
        status: data.status,
        expires_at: data.expiresAt,
        decision_by: data.decisionBy,
        decision_reason: data.decisionReason,
        approved_at: data.approvedAt,
        rejected_at: data.rejectedAt,
        created_at: data.createdAt,
        updated_at: data.updatedAt,
      });

    return this.getById(data.id)!;
  }

  markApproved(update: PermissionRequestApprovalUpdate): PermissionRequestRecord {
    this.db
      .prepare(
        `UPDATE permission_requests SET
          status = 'approved',
          expires_at = @expires_at,
          decision_by = @decision_by,
          decision_reason = NULL,
          approved_at = @approved_at,
          rejected_at = NULL,
          updated_at = @updated_at
        WHERE id = @id`
      )
      .run({
        id: update.id,
        expires_at: update.expiresAt,
        decision_by: update.decisionBy,
        approved_at: update.approvedAt,
        updated_at: update.updatedAt,
      });

    const record = this.getById(update.id);
    if (!record) {
      throw new Error('E_NOT_FOUND');
    }
    return record;
  }

  markRejected(update: PermissionRequestRejectionUpdate): PermissionRequestRecord {
    this.db
      .prepare(
        `UPDATE permission_requests SET
          status = 'rejected',
          expires_at = NULL,
          decision_by = @decision_by,
          decision_reason = @decision_reason,
          approved_at = NULL,
          rejected_at = @rejected_at,
          updated_at = @updated_at
        WHERE id = @id`
      )
      .run({
        id: update.id,
        decision_by: update.decisionBy,
        decision_reason: update.decisionReason,
        rejected_at: update.rejectedAt,
        updated_at: update.updatedAt,
      });

    const record = this.getById(update.id);
    if (!record) {
      throw new Error('E_NOT_FOUND');
    }
    return record;
  }

  getById(id: string): PermissionRequestRecord | null {
    const row = this.db
      .prepare(
        `SELECT id, requester_id, patient_id, fields, reason, status, expires_at, decision_by, decision_reason,
                approved_at, rejected_at, created_at, updated_at
         FROM permission_requests WHERE id = ?`
      )
      .get(id) as RawRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: RawRow): PermissionRequestRecord {
    return {
      id: row.id,
      requesterId: row.requester_id,
      patientId: row.patient_id,
      fields: parseFields(row.fields),
      reason: row.reason,
      status: parseStatus(row.status),
      expiresAt: row.expires_at ?? null,
      decisionBy: row.decision_by ?? null,
      decisionReason: row.decision_reason ?? null,
      approvedAt: row.approved_at ?? null,
      rejectedAt: row.rejected_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
