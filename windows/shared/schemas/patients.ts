import { z } from 'zod';

export const PatientsListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  filter: z
    .object({
      name: z.string().min(1).max(30).optional(),
      id_card_tail: z.string().min(2).max(4).optional(),
      createdFrom: z.number().optional(),
      createdTo: z.number().optional(),
    })
    .partial()
    .optional(),
  sort: z.record(z.string(), z.union([z.literal(1), z.literal(-1)])).optional(),
});

export const PatientCreateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(30),
  id_card: z
    .string()
    .regex(/^\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/),
  phone: z.string().regex(/^1[3-9]\d{9}$/).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.string().optional(),
  nativePlace: z.string().optional(),
  ethnicity: z.string().optional(),
  hospital: z.string().optional(),
  hospitalDiagnosis: z.string().optional(),
  doctorName: z.string().optional(),
  symptoms: z.string().optional(),
  medicalCourse: z.string().optional(),
  followupPlan: z.string().optional(),
  motherName: z.string().optional(),
  motherPhone: z.string().regex(/^1[3-9]\d{9}$/).optional(),
  motherIdCard: z
    .string()
    .regex(/^\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/)
    .optional(),
  otherGuardians: z.string().optional(),
  familyEconomy: z.string().optional(),
});

export const PatientUpdateSchema = z.object({
  id: z.string(),
  patch: PatientCreateSchema.partial(),
});
