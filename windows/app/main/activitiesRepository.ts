import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { ActivitiesListSchema, ActivityCreateSchema, ActivityUpdateSchema } from '../../shared/schemas/activities.js';
import type { ActivityListResult, ActivityRecord } from '../../shared/types/activities.js';

const normalizeText = (value: string | null | undefined): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export class ActivitiesRepository {
  constructor(private readonly db: InstanceType<typeof Database>) {}

  list(rawParams: unknown): ActivityListResult {
    const params = ActivitiesListSchema.parse(rawParams ?? {});
    const where: string[] = [];
    const bindings: unknown[] = [];

    if (params.filter) {
      const { status, keyword } = params.filter;
      if (status) {
        where.push('status = ?');
        bindings.push(status);
      }
      if (keyword) {
        where.push('(LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))');
        bindings.push(`%${keyword}%`, `%${keyword}%`);
      }
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderClause = this.buildOrderClause(params.sort);
    const offset = (params.page - 1) * params.pageSize;

    const rows = this.db
      .prepare(`SELECT * FROM activities ${whereClause} ${orderClause} LIMIT ? OFFSET ?`)
      .all(...bindings, params.pageSize, offset) as Record<string, unknown>[];

    const { total } = this.db
      .prepare(`SELECT COUNT(*) as total FROM activities ${whereClause}`)
      .get(...bindings) as { total: number };

    return {
      items: rows.map(this.mapRow),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  getById(id: string): ActivityRecord | null {
    const row = this.db.prepare('SELECT * FROM activities WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  create(rawInput: unknown): ActivityRecord {
    const payload = ActivityCreateSchema.parse(rawInput ?? {});
    const id = payload.id ?? randomUUID();
    const now = Date.now();

    this.db.prepare(
      `INSERT INTO activities (
        id, title, date, location, capacity, status, description, created_at, updated_at
      ) VALUES (
        @id, @title, @date, @location, @capacity, @status, @description, @created_at, @updated_at
      )`
    ).run({
      id,
      title: payload.title,
      date: payload.date,
      location: normalizeText(payload.location),
      capacity: payload.capacity ?? null,
      status: payload.status ?? 'open',
      description: normalizeText(payload.description),
      created_at: now,
      updated_at: now,
    });

    return this.getById(id)!;
  }

  update(rawInput: unknown): ActivityRecord {
    const { id, patch } = ActivityUpdateSchema.parse(rawInput ?? {});
    const current = this.getById(id);
    if (!current) {
      throw new Error('E_NOT_FOUND');
    }

    const merged: ActivityRecord = {
      ...current,
      ...this.applyPatch(current, patch),
      updatedAt: Date.now(),
    };

    this.db.prepare(
      `UPDATE activities SET
        title = @title,
        date = @date,
        location = @location,
        capacity = @capacity,
        status = @status,
        description = @description,
        updated_at = @updated_at
      WHERE id = @id`
    ).run({
      ...merged,
      location: merged.location,
      description: merged.description,
      capacity: merged.capacity,
      updated_at: merged.updatedAt,
    });

    return this.getById(id)!;
  }

  private applyPatch(current: ActivityRecord, patch: Partial<ReturnType<typeof ActivityCreateSchema.parse>> | undefined) {
    if (!patch) return {};
    return {
      title: patch.title ?? current.title,
      date: patch.date ?? current.date,
      location: normalizeText(patch.location) ?? current.location,
      capacity: patch.capacity ?? current.capacity,
      status: patch.status ?? current.status,
      description: normalizeText(patch.description) ?? current.description,
    } satisfies Partial<ActivityRecord>;
  }

  private buildOrderClause(sort: Record<string, 1 | -1> | undefined): string {
    if (!sort || Object.keys(sort).length === 0) {
      return 'ORDER BY date DESC';
    }

    const keyMap: Record<string, string> = {
      date: 'date',
      createdAt: 'created_at',
      title: 'title',
    };

    const parts: string[] = [];
    for (const [field, direction] of Object.entries(sort)) {
      const column = keyMap[field] ?? field;
      if (['date', 'created_at', 'title', 'status'].includes(column)) {
        parts.push(`${column} ${direction === -1 ? 'DESC' : 'ASC'}`);
      }
    }

    if (!parts.length) {
      return 'ORDER BY date DESC';
    }

    return `ORDER BY ${parts.join(', ')}`;
  }

  private mapRow(row: Record<string, unknown>): ActivityRecord {
    return {
      id: String(row.id),
      title: String(row.title ?? ''),
      date: String(row.date ?? ''),
      location: (row.location as string | null) ?? null,
      capacity: row.capacity == null ? null : Number(row.capacity),
      status: String(row.status ?? 'open'),
      description: (row.description as string | null) ?? null,
      createdAt: Number(row.created_at ?? Date.now()),
      updatedAt: Number(row.updated_at ?? Date.now()),
    };
  }
}
