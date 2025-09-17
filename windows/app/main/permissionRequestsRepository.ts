import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import {
  PermissionRequestCreateSchema,
  PermissionRequestDecisionSchema,
  PermissionRequestListSchema,
} from '../../shared/schemas/permissions.js';
import type {
  PermissionField,
  PermissionRequestListResult,
  PermissionRequestRecord,
} from '../../shared/types/permissions.js';

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

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DECISION_ACTOR = 'local-admin';

export class PermissionRequestsRepository {
  constructor(private readonly db: DatabaseHandle) {}

  list(rawParams: unknown): PermissionRequestListResult {
    const params = PermissionRequestListSchema.parse(rawParams ?? {});
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

  create(rawInput: unknown, requesterId = 'local-user'): PermissionRequestRecord {
    const parsed = PermissionRequestCreateSchema.parse(rawInput ?? {});
    const now = Date.now();
    const expiresAt = now + parsed.expiresDays * DAY_MS;
    const id = randomUUID();

    const payload = {
      id,
      requester_id: requesterId,
      patient_id: parsed.patientId,
      fields: serializeFields(parsed.fields),
      reason: parsed.reason,
      status: 'pending',
      expires_at: expiresAt,
      decision_by: null,
      decision_reason: null,
      approved_at: null,
      rejected_at: null,
      created_at: now,
      updated_at: now,
    };

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
      .run(payload);

    return this.getById(id)!;
  }

  decide(rawInput: unknown, actorId = DEFAULT_DECISION_ACTOR): PermissionRequestRecord {
    const parsed = PermissionRequestDecisionSchema.parse(rawInput ?? {});
    const current = this.getById(parsed.id);
    if (!current) {
      throw new Error('E_NOT_FOUND');
    }

    const now = Date.now();
    const expiresDays = parsed.expiresDays ?? 30;

    if (parsed.action === 'approve') {
      const nextExpiresAt = parsed.expiresDays ? now + expiresDays * DAY_MS : current.expiresAt ?? now + 30 * DAY_MS;
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
          id: parsed.id,
          expires_at: nextExpiresAt,
          decision_by: actorId,
          approved_at: now,
          updated_at: now,
        });
    } else {
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
          id: parsed.id,
          decision_by: actorId,
          decision_reason: parsed.reason?.trim() ?? null,
          rejected_at: now,
          updated_at: now,
        });
    }

    return this.getById(parsed.id)!;
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
      status: row.status as PermissionRequestRecord['status'],
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
