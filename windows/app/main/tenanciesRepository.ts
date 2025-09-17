import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { TenanciesListSchema, TenancyCreateSchema, TenancyUpdateSchema } from "../../shared/schemas/tenancies.js";
import type { TenancyListResult, TenancyRecord } from "../../shared/types/tenancies.js";

export class TenanciesRepository {
  constructor(private readonly db: InstanceType<typeof Database>) {}

  list(rawParams: unknown): TenancyListResult {
    const params = TenanciesListSchema.parse(rawParams ?? {});
    const where: string[] = [];
    const bindings: unknown[] = [];

    if (params.filter) {
      const { patientId, idCard, active } = params.filter;
      if (patientId) {
        where.push("patient_id = ?");
        bindings.push(patientId);
      }
      if (idCard) {
        where.push("id_card = ?");
        bindings.push(idCard);
      }
      if (active !== undefined) {
        if (active) {
          where.push("(check_out_date IS NULL OR check_out_date = '')");
        } else {
          where.push("check_out_date IS NOT NULL AND check_out_date <> ''");
        }
      }
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (params.page - 1) * params.pageSize;

    const listSql = `SELECT * FROM tenancies ${whereClause} ORDER BY check_in_date DESC LIMIT ? OFFSET ?`;
    const rows = this.db
      .prepare(listSql)
      .all(...bindings, params.pageSize, offset) as Record<string, unknown>[];

    const countSql = `SELECT COUNT(*) as total FROM tenancies ${whereClause}`;
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

  getById(id: string): TenancyRecord | null {
    const row = this.db
      .prepare("SELECT * FROM tenancies WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  create(rawInput: unknown): TenancyRecord {
    const payload = TenancyCreateSchema.parse(rawInput ?? {});
    const id = payload.id ?? randomUUID();
    const now = Date.now();

    this.db
      .prepare(
        `INSERT INTO tenancies (
          id, patient_id, id_card, check_in_date, check_out_date,
          room, bed, subsidy, extra, created_at, updated_at
        ) VALUES (
          @id, @patient_id, @id_card, @check_in_date, @check_out_date,
          @room, @bed, @subsidy, @extra, @created_at, @updated_at
        )`
      )
      .run({
        id,
        patient_id: payload.patientId,
        id_card: payload.idCard ?? null,
        check_in_date: payload.checkInDate,
        check_out_date: payload.checkOutDate ?? null,
        room: payload.room ?? null,
        bed: payload.bed ?? null,
        subsidy: payload.subsidy ?? null,
        extra: payload.extra ?? null,
        created_at: now,
        updated_at: now,
      });

    return this.getById(id)!;
  }

  update(rawInput: unknown): TenancyRecord {
    const { id, patch } = TenancyUpdateSchema.parse(rawInput ?? {});
    const current = this.getById(id);
    if (!current) {
      throw new Error("E_NOT_FOUND");
    }

    const merged: TenancyRecord = {
      ...current,
      patientId: patch.patientId ?? current.patientId,
      idCard: patch.idCard ?? current.idCard,
      checkInDate: patch.checkInDate ?? current.checkInDate,
      checkOutDate: patch.checkOutDate ?? current.checkOutDate,
      room: patch.room ?? current.room,
      bed: patch.bed ?? current.bed,
      subsidy: patch.subsidy ?? current.subsidy,
      extra: patch.extra ?? current.extra,
      updatedAt: Date.now(),
    };

    this.db
      .prepare(
        `UPDATE tenancies SET
          patient_id = @patient_id,
          id_card = @id_card,
          check_in_date = @check_in_date,
          check_out_date = @check_out_date,
          room = @room,
          bed = @bed,
          subsidy = @subsidy,
          extra = @extra,
          updated_at = @updated_at
        WHERE id = @id`
      )
      .run({
        id: merged.id,
        patient_id: merged.patientId,
        id_card: merged.idCard,
        check_in_date: merged.checkInDate,
        check_out_date: merged.checkOutDate,
        room: merged.room,
        bed: merged.bed,
        subsidy: merged.subsidy,
        extra: merged.extra,
        updated_at: merged.updatedAt,
      });

    return this.getById(id)!;
  }

  private mapRow(row: Record<string, unknown>): TenancyRecord {
    return {
      id: String(row.id),
      patientId: row.patient_id ? String(row.patient_id) : null,
      idCard: row.id_card ? String(row.id_card) : null,
      checkInDate: String(row.check_in_date ?? ""),
      checkOutDate: row.check_out_date ? String(row.check_out_date) : null,
      room: row.room ? String(row.room) : null,
      bed: row.bed ? String(row.bed) : null,
      subsidy: row.subsidy == null ? null : Number(row.subsidy),
      extra: row.extra ? String(row.extra) : null,
      createdAt: Number(row.created_at ?? Date.now()),
      updatedAt: Number(row.updated_at ?? Date.now()),
    };
  }
}
