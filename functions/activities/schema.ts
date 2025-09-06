import { z } from 'zod'

export const ActivitiesListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  filter: z.object({
    status: z.enum(['open','ongoing','done','closed']).optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  }).partial().optional(),
  sort: z.record(z.string(), z.union([z.literal(1), z.literal(-1)])).optional()
})

export const ActivityCreateSchema = z.object({
  title: z.string().min(2).max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().min(1).max(80),
  capacity: z.number().int().min(0),
  status: z.enum(['open','ongoing','done','closed']).default('open'),
  description: z.string().max(500).optional()
})

