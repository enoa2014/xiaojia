import { z } from 'zod';

export const ExportTaskCreateSchema = z.object({
  templateId: z.string().min(1).optional(),
  type: z.string().min(1),
  params: z.record(z.unknown()).default({}),
  clientToken: z.string().min(1).optional(),
  requestId: z.string().min(1).optional(),
});

export const ExportTaskStatusSchema = z.object({
  taskId: z.string().min(1),
});

export const ExportTaskHistorySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});
