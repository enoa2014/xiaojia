import { z } from 'zod';

export const RegistrationsListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  filter: z
    .object({
      activityId: z.string().optional(),
      status: z.string().optional(),
      userId: z.string().optional(),
    })
    .partial()
    .optional(),
});

export const RegistrationCreateSchema = z.object({
  id: z.string().optional(),
  activityId: z.string(),
  userId: z.string().optional(),
  status: z.string().default('registered'),
  guestContact: z.string().optional(),
  registeredAt: z.number().optional(),
  checkedInAt: z.number().optional(),
});

export const RegistrationUpdateSchema = z.object({
  id: z.string(),
  patch: RegistrationCreateSchema.partial(),
});
