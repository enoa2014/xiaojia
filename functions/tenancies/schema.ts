import { z } from 'zod'

export const TenanciesListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10)
})

export const TenancyCreateSchema = z.object({
  patientId: z.string().optional(),
  id_card: z.string().regex(/^\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/).optional(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  room: z.string().optional(),
  bed: z.string().optional(),
  subsidy: z.number().min(0).optional(),
  extra: z.object({ admitPersons: z.string().optional() }).partial().optional()
})

export const TenancyUpdateSchema = z.object({
  id: z.string(),
  patch: TenancyCreateSchema.partial()
})

