import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import type { z } from 'zod';
import { PatientsListSchema, PatientCreateSchema, PatientUpdateSchema } from '../../shared/schemas/patients.js';
import type { PatientListResult, PatientRecord } from '../../shared/types/patients.js';

export class PatientsRepository {
  constructor(private readonly db: InstanceType<typeof Database>) {}

  list(rawParams: unknown): PatientListResult {
    const params = PatientsListSchema.parse(rawParams ?? {});
    const where: string[] = [];
    const bindings: unknown[] = [];

    if (params.filter) {
      const { name, id_card_tail: tail, createdFrom, createdTo } = params.filter;
      if (name) {
        where.push('LOWER(name) LIKE LOWER(?)');
        bindings.push(`${name}%`);
      }
      if (tail) {
        where.push('id_card_tail = ?');
        bindings.push(tail);
      }
      if (createdFrom) {
        where.push('created_at >= ?');
        bindings.push(createdFrom);
      }
      if (createdTo) {
        where.push('created_at <= ?');
        bindings.push(createdTo);
      }
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderClause = this.buildOrderClause(params.sort);
    const offset = (params.page - 1) * params.pageSize;

    const listSql = `SELECT * FROM patients ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
    const countSql = `SELECT COUNT(*) as total FROM patients ${whereClause}`;
    const listBindings = [...bindings, params.pageSize, offset];
    console.log('[patientsRepository] list sql', { sql: listSql, bindings: listBindings });

    const rows = this.db
      .prepare(listSql)
      .all(...listBindings) as Record<string, unknown>[];

    console.log('[patientsRepository] count sql', { sql: countSql, bindings });
    const { total } = this.db
      .prepare(countSql)
      .get(...bindings) as { total: number };

    return {
      items: rows.map(this.mapRow),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  getById(id: string): PatientRecord | null {
    const row = this.db.prepare('SELECT * FROM patients WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  create(rawInput: unknown): PatientRecord {
    const payload = PatientCreateSchema.parse(rawInput ?? {});
    const id = payload.id ?? randomUUID();
    const now = Date.now();

    try {
      this.db.prepare(
        `INSERT INTO patients (
          id, name, id_card, id_card_tail, phone, birth_date, gender, native_place, ethnicity,
          hospital, hospital_diagnosis, doctor_name, symptoms, medical_course, followup_plan,
          family_economy, created_at, updated_at
        ) VALUES (
          @id, @name, @id_card, @id_card_tail, @phone, @birth_date, @gender, @native_place, @ethnicity,
          @hospital, @hospital_diagnosis, @doctor_name, @symptoms, @medical_course, @followup_plan,
          @family_economy, @created_at, @updated_at
        )`
      ).run({
        id,
        name: payload.name,
        id_card: payload.id_card,
        id_card_tail: payload.id_card ? payload.id_card.slice(-4) : null,
        phone: payload.phone ?? null,
        birth_date: payload.birthDate ?? null,
        gender: payload.gender ?? null,
        native_place: payload.nativePlace ?? null,
        ethnicity: payload.ethnicity ?? null,
        hospital: payload.hospital ?? null,
        hospital_diagnosis: payload.hospitalDiagnosis ?? null,
        doctor_name: payload.doctorName ?? null,
        symptoms: payload.symptoms ?? null,
        medical_course: payload.medicalCourse ?? null,
        followup_plan: payload.followupPlan ?? null,
        family_economy: payload.familyEconomy ?? null,
        created_at: now,
        updated_at: now,
      });
    } catch (err: any) {
      if (String(err?.message ?? '').includes('UNIQUE constraint failed: patients.id_card')) {
        throw new Error('E_CONFLICT:ID_CARD_EXISTS');
      }
      throw err;
    }

    return this.getById(id)!;
  }

  update(rawInput: unknown): PatientRecord {
    const { id, patch } = PatientUpdateSchema.parse(rawInput ?? {});
    const current = this.getById(id);
    if (!current) {
      throw new Error('E_NOT_FOUND');
    }

    const merged: PatientRecord = {
      ...current,
      ...this.mapPatch(patch),
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: Date.now(),
    };

    this.db.prepare(
      `UPDATE patients SET
        name = @name,
        id_card = @id_card,
        id_card_tail = @id_card_tail,
        phone = @phone,
        birth_date = @birth_date,
        gender = @gender,
        native_place = @native_place,
        ethnicity = @ethnicity,
        hospital = @hospital,
        hospital_diagnosis = @hospital_diagnosis,
        doctor_name = @doctor_name,
        symptoms = @symptoms,
        medical_course = @medical_course,
        followup_plan = @followup_plan,
        family_economy = @family_economy,
        updated_at = @updated_at
      WHERE id = @id`
    ).run({
      ...this.toDbRow(merged),
      updated_at: merged.updatedAt,
    });

    return this.getById(id)!;
  }

  private buildOrderClause(sort: Record<string, 1 | -1> | undefined): string {
    if (!sort || Object.keys(sort).length === 0) {
      return 'ORDER BY created_at DESC';
    }

    const keyMap: Record<string, string> = {
      createdAt: 'created_at',
      created_at: 'created_at',
      name: 'name',
    };

    const parts: string[] = [];
    for (const [field, direction] of Object.entries(sort)) {
      const column = keyMap[field] ?? field;
      if (column === 'created_at' || column === 'name') {
        parts.push(`${column} ${direction === -1 ? 'DESC' : 'ASC'}`);
      }
    }

    if (!parts.length) {
      return 'ORDER BY created_at DESC';
    }

    return `ORDER BY ${parts.join(', ')}`;
  }

  private mapRow(row: Record<string, unknown>): PatientRecord {
    return {
      id: String(row.id),
      name: String(row.name ?? ''),
      idCard: (row.id_card as string | null) ?? null,
      idCardTail: (row.id_card_tail as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      birthDate: (row.birth_date as string | null) ?? null,
      gender: (row.gender as string | null) ?? null,
      nativePlace: (row.native_place as string | null) ?? null,
      ethnicity: (row.ethnicity as string | null) ?? null,
      hospital: (row.hospital as string | null) ?? null,
      hospitalDiagnosis: (row.hospital_diagnosis as string | null) ?? null,
      doctorName: (row.doctor_name as string | null) ?? null,
      symptoms: (row.symptoms as string | null) ?? null,
      medicalCourse: (row.medical_course as string | null) ?? null,
      followupPlan: (row.followup_plan as string | null) ?? null,
      familyEconomy: (row.family_economy as string | null) ?? null,
      createdAt: Number(row.created_at ?? Date.now()),
      updatedAt: Number(row.updated_at ?? Date.now()),
    };
  }

  private mapPatch(patch: Partial<z.infer<typeof PatientCreateSchema>> | undefined): Partial<PatientRecord> {
    if (!patch) {
      return {};
    }

    const next: Partial<PatientRecord> = {};
    if (patch.name !== undefined) next.name = patch.name;
    if (patch.id_card !== undefined) {
      next.idCard = patch.id_card;
      next.idCardTail = patch.id_card ? patch.id_card.slice(-4) : null;
    }
    if (patch.phone !== undefined) next.phone = patch.phone ?? null;
    if (patch.birthDate !== undefined) next.birthDate = patch.birthDate ?? null;
    if (patch.gender !== undefined) next.gender = patch.gender ?? null;
    if (patch.nativePlace !== undefined) next.nativePlace = patch.nativePlace ?? null;
    if (patch.ethnicity !== undefined) next.ethnicity = patch.ethnicity ?? null;
    if (patch.hospital !== undefined) next.hospital = patch.hospital ?? null;
    if (patch.hospitalDiagnosis !== undefined) next.hospitalDiagnosis = patch.hospitalDiagnosis ?? null;
    if (patch.doctorName !== undefined) next.doctorName = patch.doctorName ?? null;
    if (patch.symptoms !== undefined) next.symptoms = patch.symptoms ?? null;
    if (patch.medicalCourse !== undefined) next.medicalCourse = patch.medicalCourse ?? null;
    if (patch.followupPlan !== undefined) next.followupPlan = patch.followupPlan ?? null;
    if (patch.familyEconomy !== undefined) next.familyEconomy = patch.familyEconomy ?? null;

    return next;
  }

  private toDbRow(record: PatientRecord): Record<string, unknown> {
    return {
      id: record.id,
      name: record.name,
      id_card: record.idCard,
      id_card_tail: record.idCardTail,
      phone: record.phone,
      birth_date: record.birthDate,
      gender: record.gender,
      native_place: record.nativePlace,
      ethnicity: record.ethnicity,
      hospital: record.hospital,
      hospital_diagnosis: record.hospitalDiagnosis,
      doctor_name: record.doctorName,
      symptoms: record.symptoms,
      medical_course: record.medicalCourse,
      followup_plan: record.followupPlan,
      family_economy: record.familyEconomy,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }
}


