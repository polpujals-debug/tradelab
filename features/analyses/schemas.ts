import { z } from "zod";
import { imageInputSchema } from "@/features/media/images-schema";
import { biasSchema, symbolSchema } from "@/features/trades/schemas";

export const TIMEFRAMES = ["1m", "3m", "5m", "15m", "30m", "1H", "2H", "4H", "1D", "1W"] as const;
const timeframe = z.string().trim().transform((t) => t.replace(/^(\d+)h$/i, "$1H").replace(/^(\d+)d$/i, "$1D").replace(/^(\d+)w$/i, "$1W")).pipe(z.enum(TIMEFRAMES, { error: `Temporalitat invàlida. Valors: ${TIMEFRAMES.join(", ")}` }));
const price = z.coerce.number().positive();

export const levelsSchema = z.object({
  supports: z.array(price).max(10).default([]),
  resistances: z.array(price).max(10).default([]),
  ma50: price.nullish(),
}).default({ supports: [], resistances: [], ma50: null });

export const outcomeSchema = z.enum(["pending", "fulfilled", "partial", "failed"]);

export const analysisCreateSchema = z.object({
  asset: symbolSchema,
  title: z.string().trim().min(3).max(140).optional(),
  timeframes: z.array(timeframe).min(1, "Indica almenys una temporalitat").max(6),
  bias: biasSchema,
  levels: levelsSchema,
  content_md: z.string().trim().min(10, "L'explicació és massa curta").max(50_000),
  scenario: z.string().trim().max(1000).optional(),
  review_in_days: z.coerce.number().int().min(1).max(60).default(3),
  analyzed_at: z.iso.datetime({ offset: true }).optional(),
  trade_id: z.uuid().optional(),
  images: z.array(imageInputSchema).max(6).default([]),
  source: z.enum(["claude", "manual"]).default("claude"),
});
export type AnalysisCreate = z.output<typeof analysisCreateSchema>;

export const analysisUpdateSchema = z.object({
  outcome: outcomeSchema.optional(),
  my_notes: z.string().max(10_000).nullish(),
  questions: z.string().max(10_000).nullish(),
  scenario: z.string().max(1000).nullish(),
  review_at: z.iso.date().nullish(),
  bias: biasSchema.optional(),
  levels: levelsSchema.optional(),
  content_md: z.string().min(10).max(50_000).optional(),
  trade_id: z.uuid().nullish(),
  images: z.array(imageInputSchema).max(6).optional(),
}).refine((v) => Object.keys(v).length > 0, { error: "No hi ha cap camp per actualitzar" });
export type AnalysisUpdate = z.output<typeof analysisUpdateSchema>;

export const analysisListSchema = z.object({
  asset: symbolSchema.optional(),
  timeframe: z.string().optional(),
  bias: biasSchema.optional(),
  outcome: outcomeSchema.optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type AnalysisList = z.output<typeof analysisListSchema>;
