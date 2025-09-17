import { z } from 'zod';

const timestampInput = z.union([z.number(), z.string()]);

export const AuditLogListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  filter: z
    .object({
      from: timestampInput.optional(),
      to: timestampInput.optional(),
      action: z.string().min(1).max(128).optional(),
      actorId: z.string().min(1).max(128).optional(),
    })
    .partial()
    .optional(),
});
