import { z } from "zod";
import { imageInputSchema } from "@/features/media/images-schema";
import { biasSchema, symbolSchema } from "@/features/trades/schemas";

export const reportTypeSchema = z.enum(["daily", "weekly", "adhoc"]);

export const marketReportCreateSchema = z.object({
  type: reportTypeSchema,
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().max(500).optional(),
  content_md: z.string().trim().min(20, "L'informe és massa curt").max(100_000),
  report_date: z.iso.date().optional(),
  btc_bias: biasSchema.optional(),
  eth_bias: biasSchema.optional(),
  watchlist: z.array(symbolSchema).max(20).default([]),
  images: z.array(imageInputSchema).max(6).default([]),
});
export type MarketReportCreate = z.output<typeof marketReportCreateSchema>;

export const marketReportListSchema = z.object({
  type: reportTypeSchema.optional(),
  unread: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
