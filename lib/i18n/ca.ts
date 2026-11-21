import type { Enum } from "@/lib/supabase/types";

/** Etiquetes de la interfície (català). Punt únic per si algun dia s'afegeix un altre idioma. */
export const L = {
  direction: { long: "Long", short: "Short" } satisfies Record<Enum<"trade_direction">, string>,
  status: { planned: "Planificada", open: "Oberta", closed: "Tancada", cancelled: "Cancel·lada" } satisfies Record<Enum<"trade_status">, string>,
  bias: { bullish: "Alcista", bearish: "Baixista", neutral: "Neutral" } satisfies Record<Enum<"market_bias">, string>,
  outcome: { pending: "Pendent", fulfilled: "Complert", partial: "Parcial", failed: "Fallat" } satisfies Record<Enum<"analysis_outcome">, string>,
  mediaKind: { before: "Abans", during: "Durant", after: "Després", analysis: "Anàlisi", report: "Informe", example: "Exemple" } satisfies Record<Enum<"media_kind">, string>,
  tagKind: { error: "Errors", emotion: "Emocions", setup: "Setups" } satisfies Record<Enum<"tag_kind">, string>,
  reportType: { daily: "Diari", weekly: "Setmanal", adhoc: "Ad hoc" } satisfies Record<Enum<"report_type">, string>,
  conceptStatus: { pending: "Pendent", learning: "Aprenent", mastered: "Dominat" } satisfies Record<Enum<"concept_status">, string>,
  source: { claude: "Claude", manual: "Manual", scheduled: "Tasca programada" } satisfies Record<Enum<"content_source">, string>,
  accountType: { paper: "Paper", real: "Real" } satisfies Record<Enum<"account_type">, string>,
} as const;

export const EMOTIONS = ["Calma", "Confiança", "Ansietat", "Eufòria", "Frustració", "Por", "Impaciència", "Avorriment"] as const;
