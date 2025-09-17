import { z } from "zod";

export const StatsDailySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export const StatsWeeklySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  weeks: z.number().int().min(1).max(53),
});

export const StatsMonthlySchema = z.object({
  year: z.number().int().min(2000).max(2100),
});

export const StatsYearlySchema = z.object({
  years: z.number().int().min(1).max(10).default(5),
});
