import { z } from 'zod'

export const ServicesListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  filter: z.object({
    patientId: z.string().min(1).max(64).optional(),
    createdBy: z.string().min(1).max(128).optional(),
    type: z.enum(['visit','psych','goods','referral','followup']).optional(),
    status: z.enum(['review','approved','rejected']).optional()
  }).partial().optional(),
  sort: z.record(z.string(), z.union([z.literal(1), z.literal(-1)])).optional()
})

export const ServiceCreateSchema = z.object({
  patientId: z.string(),
  type: z.enum(['visit','psych','goods','referral','followup']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  desc: z.string().max(500).optional(),
  images: z.array(z.string()).max(9).optional()
})

export const ServiceReviewSchema = z.object({
  id: z.string(),
  decision: z.enum(['approved','rejected']),
  reason: z.string().min(20).max(200).optional()
})
