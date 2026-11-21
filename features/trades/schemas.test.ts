import { describe, expect, it } from "vitest";
import { analysisCreateSchema } from "@/features/analyses/schemas";
import { marketReportCreateSchema } from "@/features/market-reports/schemas";
import { symbolSchema, tradeCreateSchema } from "./schemas";

describe("validació d'entrades (API i formularis)", () => {
  it("normalitza els símbols", () => {
    expect(symbolSchema.parse("btcusdt")).toBe("BTC/USDT");
    expect(symbolSchema.parse(" eth/usdt ")).toBe("ETH/USDT");
    expect(symbolSchema.safeParse("bitcoin!").success).toBe(false);
  });

  it("operació: l'SL ha d'anar al costat correcte segons la direcció", () => {
    const ok = tradeCreateSchema.safeParse({ asset: "BTC/USDT", entry_price: 100, stop_loss: 98 });
    expect(ok.success).toBe(true);
    const bad = tradeCreateSchema.safeParse({ asset: "BTC/USDT", direction: "short", entry_price: 100, stop_loss: 98 });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues[0].path).toEqual(["stop_loss"]);
  });

  it("operació: el TP ha d'anar a favor i una tancada necessita sortida", () => {
    expect(tradeCreateSchema.safeParse({ asset: "BTC/USDT", entry_price: 100, stop_loss: 98, take_profit: 95 }).success).toBe(false);
    expect(tradeCreateSchema.safeParse({ asset: "BTC/USDT", entry_price: 100, stop_loss: 98, status: "closed" }).success).toBe(false);
    expect(tradeCreateSchema.safeParse({ asset: "BTC/USDT", entry_price: 100, stop_loss: 98, status: "closed", exit_price: 103 }).success).toBe(true);
  });

  it("anàlisi: temporalitats normalitzades i validades", () => {
    const a = analysisCreateSchema.parse({ asset: "BTCUSDT", timeframes: ["1h", "5m"], bias: "bullish", content_md: "Explicació prou llarga" });
    expect(a.timeframes).toEqual(["1H", "5m"]);
    expect(a.levels).toEqual({ supports: [], resistances: [], ma50: null });
    expect(a.source).toBe("claude");
    expect(analysisCreateSchema.safeParse({ asset: "BTCUSDT", timeframes: ["7m"], bias: "bullish", content_md: "Explicació prou llarga" }).success).toBe(false);
  });

  it("anàlisi: cada imatge necessita exactament una font", () => {
    const base = { asset: "BTCUSDT", timeframes: ["1H"], bias: "neutral", content_md: "Explicació prou llarga" };
    expect(analysisCreateSchema.safeParse({ ...base, images: [{ url: "https://x.com/a.png" }] }).success).toBe(true);
    expect(analysisCreateSchema.safeParse({ ...base, images: [{}] }).success).toBe(false);
    expect(analysisCreateSchema.safeParse({ ...base, images: [{ url: "https://x.com/a.png", base64: "AAAAAAAAAAAAAAAAAAAA" }] }).success).toBe(false);
  });

  it("informe de mercat", () => {
    expect(marketReportCreateSchema.safeParse({ type: "daily", title: "Informe", content_md: "Contingut prou llarg per ser vàlid" }).success).toBe(true);
    expect(marketReportCreateSchema.safeParse({ type: "monthly", title: "Informe", content_md: "Contingut prou llarg per ser vàlid" }).success).toBe(false);
  });
});
