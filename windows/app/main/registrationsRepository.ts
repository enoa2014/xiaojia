import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { RegistrationsListSchema, RegistrationCreateSchema, RegistrationUpdateSchema } from '../../shared/schemas/registrations.js';
import type { RegistrationListResult, RegistrationRecord } from '../../shared/types/registrations.js';

const toNullable = (value: string | null | undefined) => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export class RegistrationsRepository {
  constructor(private readonly db: InstanceType<typeof Database>) {}

  list(rawParams: unknown): RegistrationListResult {
    const params = RegistrationsListSchema.parse(rawParams ?? {});
    const where: string[] = [];
    const bindings: unknown[] = [];

    if (params.filter) {
      const { activityId, status, userId } = params.filter;
      if (activityId) {
        where.push('activity_id = ?');
        bindings.push(activityId);
      }
      if (status) {
        where.push('status = ?');
        bindings.push(status);
      }
      if (userId) {
        where.push('user_id = ?');
        bindings.push(userId);
      }
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (params.page - 1) * params.pageSize;

    const rows = this.db
      .prepare(`SELECT * FROM registrations ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...bindings, params.pageSize, offset) as Record<string, unknown>[];

    const { total } = this.db
      .prepare(`SELECT COUNT(*) as total FROM registrations ${whereClause}`)
      .get(...bindings) as { total: number };

    return {
      items: rows.map(this.mapRow),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  getById(id: string): RegistrationRecord | null {
    const row = this.db.prepare('SELECT * FROM registrations WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  create(rawInput: unknown): RegistrationRecord {
    const payload = RegistrationCreateSchema.parse(rawInput ?? {});
    const id = payload.id ?? randomUUID();
    const now = Date.now();

    this.db.prepare(
      `INSERT INTO registrations (
        id, activity_id, user_id, status, guest_contact, registered_at, cancelled_at, checked_in_at, created_at, updated_at
      ) VALUES (
        @id, @activity_id, @user_id, @status, @guest_contact, @registered_at, @cancelled_at, @checked_in_at, @created_at, @updated_at
      )`
    ).run({
      id,
      activity_id: payload.activityId,
      user_id: payload.userId ?? null,
      status: payload.status ?? 'registered',
      guest_contact: toNullable(payload.guestContact),
      registered_at: payload.registeredAt ?? now,
      cancelled_at: null,
      checked_in_at: payload.checkedInAt ?? null,
      created_at: now,
      updated_at: now,
    });

    return this.getById(id)!;
  }

  update(rawInput: unknown): RegistrationRecord {
    const { id, patch } = RegistrationUpdateSchema.parse(rawInput ?? {});
    const current = this.getById(id);
    if (!current) {
      throw new Error('E_NOT_FOUND');
    }

    const merged: RegistrationRecord = {
      ...current,
      ...this.applyPatch(current, patch),
      updatedAt: Date.now(),
    };

    this.db.prepare(
      `UPDATE registrations SET
        activity_id = @activity_id,
        user_id = @user_id,
        status = @status,
        guest_contact = @guest_contact,
        registered_at = @registered_at,
        cancelled_at = @cancelled_at,
        checked_in_at = @checked_in_at,
        updated_at = @updated_at
      WHERE id = @id`
    ).run({
      ...merged,
      activity_id: merged.activityId,
      user_id: merged.userId,
      guest_contact: merged.guestContact,
      registered_at: merged.registeredAt,
      cancelled_at: merged.cancelledAt,
      checked_in_at: merged.checkedInAt,
      updated_at: merged.updatedAt,
    });

    return this.getById(id)!;
  }

  private applyPatch(current: RegistrationRecord, patch: Partial<ReturnType<typeof RegistrationCreateSchema.parse>> | undefined) {
    if (!patch) return {};
    return {
      activityId: patch.activityId ?? current.activityId,
      userId: patch.userId ?? current.userId,
      status: patch.status ?? current.status,
      guestContact: toNullable(patch.guestContact) ?? current.guestContact,
      registeredAt: patch.registeredAt ?? current.registeredAt,
      cancelledAt: patch.status === 'cancelled' ? Date.now() : current.cancelledAt,
      checkedInAt: patch.checkedInAt ?? current.checkedInAt,
    } satisfies Partial<RegistrationRecord>;
  }

  private mapRow(row: Record<string, unknown>): RegistrationRecord {
    return {
      id: String(row.id),
      activityId: String(row.activity_id ?? ''),
      userId: (row.user_id as string | null) ?? null,
      status: String(row.status ?? 'registered'),
      guestContact: (row.guest_contact as string | null) ?? null,
      registeredAt: row.registered_at == null ? null : Number(row.registered_at),
      cancelledAt: row.cancelled_at == null ? null : Number(row.cancelled_at),
      checkedInAt: row.checked_in_at == null ? null : Number(row.checked_in_at),
      createdAt: Number(row.created_at ?? Date.now()),
      updatedAt: Number(row.updated_at ?? Date.now()),
    };
  }
}
