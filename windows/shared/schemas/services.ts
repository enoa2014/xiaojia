import { z } from "zod";

export const ServicesListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  filter: z
    .object({
      patientId: z.string().optional(),
      status: z.string().optional(),
      createdBy: z.string().optional(),
    })
    .optional(),
});

export const ServiceCreateSchema = z.object({
  id: z.string().min(1).optional(),
  patientId: z.string().min(1),
  type: z.string().min(1),
  date: z.string().min(1),
  description: z.string().optional().nullable(),
  images: z.array(z.string()).optional().default([]),
  status: z.enum(["draft", "pending", "approved", "rejected"]).optional().default("pending"),
  createdBy: z.string().optional().nullable(),
});

export const ServiceReviewSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});
