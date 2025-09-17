import { z } from 'zod';

export const PermissionFieldSchema = z.enum(['id_card', 'phone', 'diagnosis']);

export const PermissionRequestCreateSchema = z.object({
  patientId: z.string().min(1),
  fields: z.array(PermissionFieldSchema).nonempty(),
  reason: z.string().min(20).max(2000),
  expiresDays: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(30),
});

export const PermissionRequestListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  filter: z
    .object({
      patientId: z.string().optional(),
      requesterId: z.string().optional(),
      status: z.enum(['pending', 'approved', 'rejected']).optional(),
    })
    .optional(),
});

export const PermissionRequestDecisionSchema = z
  .object({
    id: z.string().min(1),
    action: z.enum(['approve', 'reject']),
    reason: z.string().trim().max(500).optional(),
    expiresDays: z.union([z.literal(30), z.literal(60), z.literal(90)]).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'reject' && !value.reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: '拒绝操作需要填写原因',
      });
    }
  });
