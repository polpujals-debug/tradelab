import "server-only";
import { getTrade, type TradeListItem } from "./queries";

/** Forma pública (API/MCP) d'una operació. */
export function toTradeDTO(t: TradeListItem) {
  return {
    id: t.id, asset: t.symbol, direction: t.direction, status: t.status,
    entry_at: t.entry_at, exit_at: t.exit_at,
    entry_price: t.entry_price, stop_loss: t.stop_loss, take_profit: t.take_profit, exit_price: t.exit_price,
    quantity: t.quantity, leverage: t.leverage, fees: t.fees, capital_at_entry: t.capital_at_entry,
    position_value: t.position_value, risk_amount: t.risk_amount, risk_pct: t.risk_pct, planned_rr: t.planned_rr,
    net_pnl: t.net_pnl, pnl_pct: t.pnl_pct, r_multiple: t.r_multiple, compliance_pct: t.compliance_pct,
    setup: t.setup, bias_1h: t.bias_1h, analysis_id: t.analysis_id, strategy_id: t.strategy_id, source: t.source,
    tags: t.tags.map((g) => ({ kind: g.kind, name: g.name })), local_date: t.local_date,
  };
}

export async function getTradeDTO(id: string) {
  const d = await getTrade(id);
  if (!d) return null;
  return {
    ...toTradeDTO({ ...d.metrics, tags: d.tags, thumb: null }),
    confirmation_5m: d.trade.confirmation_5m, trigger_1m: d.trade.trigger_1m,
    emotion_before: d.trade.emotion_before, emotion_after: d.trade.emotion_after,
    notes: d.trade.notes, lesson: d.trade.lesson,
    checklist: d.checklist.map((c) => ({ rule_id: c.id, text: c.text, passed: c.passed })),
    images: d.media.map((m) => ({ id: m.id, kind: m.kind, url: m.url, thumb_url: m.thumb_url })),
  };
}
