import { z } from 'zod';

export const ActivitiesListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  filter: z
    .object({
      status: z.string().optional(),
      keyword: z.string().optional(),
    })
    .partial()
    .optional(),
  sort: z.record(z.string(), z.union([z.literal(1), z.literal(-1)])).optional(),
});

export const ActivityCreateSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().optional(),
  capacity: z.number().int().min(0).optional(),
  status: z.string().optional(),
  description: z.string().optional(),
});

export const ActivityUpdateSchema = z.object({
  id: z.string(),
  patch: ActivityCreateSchema.partial(),
});
