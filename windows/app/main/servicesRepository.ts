import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { ServiceCreateSchema, ServiceReviewSchema, ServicesListSchema } from "../../shared/schemas/services.js";
import type { ServiceListResult, ServiceRecord } from "../../shared/types/services.js";

export class ServicesRepository {
  constructor(private readonly db: InstanceType<typeof Database>) {}

  list(rawParams: unknown): ServiceListResult {
    const params = ServicesListSchema.parse(rawParams ?? {});
    const where: string[] = [];
    const bindings: unknown[] = [];

    if (params.filter) {
      const { patientId, status, createdBy } = params.filter;
      if (patientId) {
        where.push("patient_id = ?");
        bindings.push(patientId);
      }
      if (status) {
        where.push("status = ?");
        bindings.push(status);
      }
      if (createdBy) {
        where.push("created_by = ?");
        bindings.push(createdBy);
      }
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (params.page - 1) * params.pageSize;

    const selectSql = `SELECT * FROM services ${whereClause} ORDER BY date DESC LIMIT ? OFFSET ?`;
    const rows = this.db
      .prepare(selectSql)
      .all(...bindings, params.pageSize, offset) as Record<string, unknown>[];

    const countSql = `SELECT COUNT(*) as total FROM services ${whereClause}`;
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

  getById(id: string): ServiceRecord | null {
    const row = this.db
      .prepare("SELECT * FROM services WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  create(rawInput: unknown): ServiceRecord {
    const payload = ServiceCreateSchema.parse(rawInput ?? {});
    const id = payload.id ?? randomUUID();
    const now = Date.now();

    this.db
      .prepare(
        `INSERT INTO services (
          id, patient_id, type, date, description, images, status,
          created_by, created_at, updated_at, review_reason, reviewed_at
        ) VALUES (
          @id, @patient_id, @type, @date, @description, @images, @status,
          @created_by, @created_at, @updated_at, NULL, NULL
        )`
      )
      .run({
        id,
        patient_id: payload.patientId,
        type: payload.type,
        date: payload.date,
        description: payload.description ?? null,
        images: payload.images && payload.images.length ? JSON.stringify(payload.images.slice(0, 9)) : null,
        status: payload.status ?? "pending",
        created_by: payload.createdBy ?? null,
        created_at: now,
        updated_at: now,
      });

    return this.getById(id)!;
  }

  review(rawInput: unknown): ServiceRecord {
    const input = ServiceReviewSchema.parse(rawInput ?? {});
    const current = this.getById(input.id);
    if (!current) {
      throw new Error("E_NOT_FOUND");
    }

    const status = input.action === "approve" ? "approved" : "rejected";
    const now = Date.now();

    this.db
      .prepare(
        `UPDATE services SET
          status = @status,
          review_reason = @review_reason,
          reviewed_at = @reviewed_at,
          updated_at = @updated_at
        WHERE id = @id`
      )
      .run({
        id: current.id,
        status,
        review_reason: input.reason ?? null,
        reviewed_at: now,
        updated_at: now,
      });

    return this.getById(current.id)!;
  }

  private mapRow(row: Record<string, unknown>): ServiceRecord {
    const imagesRaw = row.images as string | null;
    let images: string[] = [];
    if (Array.isArray(row.images)) {
      images = (row.images as unknown[]).map((item) => String(item));
    } else if (typeof imagesRaw === "string" && imagesRaw.trim().length) {
      try {
        const parsed = JSON.parse(imagesRaw);
        if (Array.isArray(parsed)) {
          images = parsed.map((item) => String(item));
        }
      } catch (error) {
        console.warn("[servicesRepository] failed to parse images", error);
        images = [imagesRaw];
      }
    }

    return {
      id: String(row.id),
      patientId: String(row.patient_id ?? ""),
      type: String(row.type ?? ""),
      date: String(row.date ?? ""),
      description: row.description ? String(row.description) : null,
      images,
      status: (row.status as ServiceRecord["status"]) ?? "pending",
      createdBy: row.created_by ? String(row.created_by) : null,
      createdAt: Number(row.created_at ?? Date.now()),
      updatedAt: row.updated_at == null ? null : Number(row.updated_at),
      reviewReason: row.review_reason ? String(row.review_reason) : null,
      reviewedAt: row.reviewed_at == null ? null : Number(row.reviewed_at),
    };
  }
}
