import { z } from "zod";

export const TenancyCreateSchema = z.object({
  id: z.string().min(1).optional(),
  patientId: z.string().min(1),
  idCard: z.string().min(6).max(32).optional().nullable(),
  checkInDate: z.string().min(1),
  checkOutDate: z.string().min(1).optional().nullable(),
  room: z.string().max(50).optional().nullable(),
  bed: z.string().max(50).optional().nullable(),
  subsidy: z.number().finite().optional().nullable(),
  extra: z.string().max(200).optional().nullable(),
});

export const TenancyUpdateSchema = z.object({
  id: z.string().min(1),
  patch: TenancyCreateSchema.partial(),
});

export const TenanciesListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  filter: z
    .object({
      patientId: z.string().optional(),
      idCard: z.string().optional(),
      active: z.boolean().optional(),
    })
    .optional(),
});
