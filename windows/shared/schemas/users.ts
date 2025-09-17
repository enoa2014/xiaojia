import { z } from 'zod';

export const UserRelativeSchema = z.object({
  patientName: z.string().min(1).max(50),
  relation: z.enum(['father', 'mother', 'guardian', 'other']),
  patientIdCard: z.string().regex(/^[0-9]{17}[0-9Xx]$/),
});

export const UserRegisterSchema = z
  .object({
    nickname: z.string().min(1).max(30).optional(),
    password: z.string().min(6).max(100),
    name: z.string().min(2).max(30),
    phone: z.string().regex(/^1\d{10}$/),
    idCard: z.string().regex(/^[0-9]{17}[0-9Xx]$/),
    applyRole: z.enum(['volunteer', 'parent']),
    relative: UserRelativeSchema.optional(),
    test: z.boolean().optional(),
  })
  .refine((value) => value.applyRole !== 'parent' || !!value.relative, {
    message: '需要填写亲属信息',
    path: ['relative'],
  });

export const UserLoginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

export type UserRegisterInput = z.infer<typeof UserRegisterSchema>;
export type UserLoginInput = z.infer<typeof UserLoginSchema>;

export const UserRegistrationsListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'active', 'rejected']).default('pending'),
});

export const UserReviewRegistrationSchema = z
  .object({
    id: z.string().min(1),
    action: z.enum(['approve', 'reject']),
    role: z.enum(['volunteer', 'parent']).optional(),
    reason: z.string().max(200).optional(),
    reviewerId: z.string().min(1).optional(),
  })
  .refine((value) => value.action !== 'approve' || !!value.role, {
    message: '?????????',
    path: ['role'],
  })
  .refine((value) => value.action !== 'reject' || !!(value.reason && value.reason.trim().length >= 5), {
    message: '?????? 5 ????',
    path: ['reason'],
  });

export type UserRegistrationsListInput = z.infer<typeof UserRegistrationsListSchema>;
export type UserReviewRegistrationInput = z.infer<typeof UserReviewRegistrationSchema>;
