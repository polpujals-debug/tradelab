import { z } from "zod";

const price = z.coerce.number({ error: "Ha de ser un número" }).positive("Ha de ser positiu");
const optionalPrice = z.preprocess((v) => (v === "" || v === null ? undefined : v), price.optional());
const optionalText = (max = 4000) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());
const isoDate = z.iso.datetime({ offset: true, error: "Data ISO 8601 invàlida (ex.: 2026-11-21T10:30:00+01:00)" });

export const symbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{2,15}\/?[A-Z0-9]{2,10}$/, "Format d'actiu invàlid (ex.: BTC/USDT)")
  .transform((s) => (s.includes("/") ? s : s.replace(/(USDT|USDC|USD|EUR|BTC)$/, "/$1")));

export const biasSchema = z.enum(["bullish", "bearish", "neutral"]);
export const statusSchema = z.enum(["planned", "open", "closed", "cancelled"]);
export const directionSchema = z.enum(["long", "short"]);

export const tagRefSchema = z.object({
  kind: z.enum(["error", "emotion", "setup"]),
  name: z.string().trim().min(1).max(60),
});

export const ruleCheckSchema = z.object({ rule_id: z.uuid(), passed: z.boolean() });

const tradeFields = {
  asset: symbolSchema,
  direction: directionSchema.optional(),
  status: statusSchema.default("open"),
  account_id: z.uuid().optional(),
  strategy_id: z.uuid().nullish(),
  analysis_id: z.uuid().nullish(),
  entry_at: isoDate.nullish(),
  exit_at: isoDate.nullish(),
  entry_price: price,
  stop_loss: price,
  take_profit: optionalPrice.nullish(),
  exit_price: optionalPrice.nullish(),
  /** Si no s'envia, es calcula amb risk_pct (o el risc per defecte). */
  quantity: optionalPrice,
  risk_pct: z.coerce.number().positive().max(100).optional(),
  leverage: z.coerce.number().min(1).max(200).default(1),
  fees: z.coerce.number().min(0).default(0),
  capital_at_entry: z.coerce.number().positive().optional(),
  bias_1h: biasSchema.nullish(),
  confirmation_5m: optionalText(500).nullish(),
  trigger_1m: optionalText(500).nullish(),
  setup: optionalText(120).nullish(),
  emotion_before: optionalText(60).nullish(),
  emotion_after: optionalText(60).nullish(),
  notes: optionalText(10000).nullish(),
  lesson: optionalText(4000).nullish(),
  rule_checks: z.array(ruleCheckSchema).optional(),
  tags: z.array(tagRefSchema).max(30).optional(),
  source: z.enum(["claude", "manual", "scheduled"]).default("manual"),
};

function checkCoherence(
  t: { direction?: "long" | "short"; entry_price?: number; stop_loss?: number; take_profit?: number | null; status?: string; exit_price?: number | null },
  ctx: z.RefinementCtx,
) {
  if (t.entry_price !== undefined && t.stop_loss !== undefined) {
    if (t.entry_price === t.stop_loss) {
      ctx.addIssue({ code: "custom", path: ["stop_loss"], message: "L'stop loss no pot ser igual a l'entrada." });
      return;
    }
    const derived = t.stop_loss < t.entry_price ? "long" : "short";
    if (t.direction && t.direction !== derived) {
      ctx.addIssue({
        code: "custom",
        path: ["stop_loss"],
        message: t.direction === "long" ? "En un long, l'SL ha d'estar per sota de l'entrada." : "En un short, l'SL ha d'estar per sobre de l'entrada.",
      });
    }
    if (t.take_profit != null) {
      const dir = t.direction ?? derived;
      if ((dir === "long" && t.take_profit <= t.entry_price) || (dir === "short" && t.take_profit >= t.entry_price)) {
        ctx.addIssue({ code: "custom", path: ["take_profit"], message: "El take profit ha d'estar a favor de l'operació." });
      }
    }
  }
  if (t.status === "closed" && t.exit_price == null) {
    ctx.addIssue({ code: "custom", path: ["exit_price"], message: "Una operació tancada necessita preu de sortida." });
  }
}

export const tradeCreateSchema = z.object(tradeFields).superRefine(checkCoherence);
export type TradeCreateInput = z.input<typeof tradeCreateSchema>;
export type TradeCreate = z.output<typeof tradeCreateSchema>;

export const tradeUpdateSchema = z
  .object(tradeFields)
  .omit({ source: true })
  .partial()
  .superRefine(checkCoherence);
export type TradeUpdate = z.output<typeof tradeUpdateSchema>;

export const tradeCloseSchema = z.object({
  exit_price: price,
  exit_at: isoDate.optional(),
  fees: z.coerce.number().min(0).optional(),
  emotion_after: optionalText(60).nullish(),
  lesson: optionalText(4000).nullish(),
  notes: optionalText(10000).nullish(),
});
export type TradeClose = z.output<typeof tradeCloseSchema>;

export const tradeListQuerySchema = z.object({
  status: statusSchema.optional(),
  asset: symbolSchema.optional(),
  direction: directionSchema.optional(),
  result: z.enum(["win", "loss", "breakeven"]).optional(),
  setup: z.string().trim().max(120).optional(),
  tag: z.string().trim().max(60).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
export type TradeListQuery = z.output<typeof tradeListQuerySchema>;

/** Converteix un error de Zod en { camp: missatge }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
