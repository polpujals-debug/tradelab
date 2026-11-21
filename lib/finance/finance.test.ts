import { describe, expect, it } from "vitest";
import {
  activityStreak, calcPositionSize, calcTradePnl, checkDiscipline, computeStats,
  equityCurve, maxDrawdown, plannedRR, PositionSizeError, profitFactor, winRate,
  type ClosedTradeLike,
} from ".";

const t = (id: string, netPnl: number, rMultiple: number | null, day: number): ClosedTradeLike => ({
  id, netPnl, rMultiple, exitAt: `2026-11-${String(day).padStart(2, "0")}T10:00:00Z`,
});

describe("calcPositionSize", () => {
  it("calcula la mida d'un long amb risc fix", () => {
    const r = calcPositionSize({ capital: 150, riskPct: 3, entry: 100, stop: 98, takeProfit: 106 });
    expect(r.direction).toBe("long");
    expect(r.riskAmount).toBe(4.5);
    expect(r.quantity).toBe(2.25);
    expect(r.positionValue).toBe(225);
    expect(r.maxLoss).toBe(4.5);
    expect(r.rr).toBe(3);
    expect(r.targets).toEqual({ r1: 102, r2: 104, r3: 106 });
    expect(r.stopDistancePct).toBe(2);
    expect(r.requiredLeverage).toBe(1.5);
  });

  it("dedueix short quan l'SL és per sobre i calcula objectius cap avall", () => {
    const r = calcPositionSize({ capital: 1000, riskPct: 1, entry: 50000, stop: 50250 });
    expect(r.direction).toBe("short");
    expect(r.quantity).toBe(0.04);
    expect(r.positionValue).toBe(2000);
    expect(r.targets.r2).toBe(49500);
    expect(r.rr).toBeNull();
  });

  it("aplica el palanquejament només al marge, no al risc", () => {
    const r = calcPositionSize({ capital: 150, riskPct: 2, entry: 90000, stop: 89640, leverage: 10 });
    expect(r.riskAmount).toBe(3);
    expect(r.quantity).toBeCloseTo(3 / 360, 8);
    expect(r.positionValue).toBe(750);
    expect(r.margin).toBe(75);
    expect(r.effectiveLeverage).toBe(5);
  });

  it("inclou les comissions estimades a la pèrdua màxima", () => {
    const r = calcPositionSize({ capital: 100, riskPct: 1, entry: 10, stop: 9, feePct: 0.1 });
    expect(r.estimatedFees).toBe(0.02);
    expect(r.maxLoss).toBe(1.02);
  });

  it("rebutja entrades invàlides", () => {
    expect(() => calcPositionSize({ capital: 100, riskPct: 1, entry: 10, stop: 10 })).toThrow(PositionSizeError);
    expect(() => calcPositionSize({ capital: 0, riskPct: 1, entry: 10, stop: 9 })).toThrow(PositionSizeError);
    expect(() => calcPositionSize({ capital: 100, riskPct: 0, entry: 10, stop: 9 })).toThrow(PositionSizeError);
    expect(() => calcPositionSize({ capital: 100, riskPct: 1, entry: 10, stop: 9, takeProfit: 8 })).toThrow(/take profit/);
  });
});

describe("calcTradePnl", () => {
  it("long guanyador: P&L, % i R", () => {
    const r = calcTradePnl({ direction: "long", entry: 100, exit: 104, stop: 98, quantity: 2.25, fees: 0.5, capitalAtEntry: 150 });
    expect(r.grossPnl).toBe(9);
    expect(r.netPnl).toBe(8.5);
    expect(r.pnlPct).toBe(5.667);
    expect(r.riskAmount).toBe(4.5);
    expect(r.rMultiple).toBe(1.889);
  });

  it("short perdedor que toca l'SL = −1R (sense comissions)", () => {
    const r = calcTradePnl({ direction: "short", entry: 50000, exit: 50250, stop: 50250, quantity: 0.04, capitalAtEntry: 1000 });
    expect(r.netPnl).toBe(-10);
    expect(r.rMultiple).toBe(-1);
    expect(r.pnlPct).toBe(-1);
  });

  it("moure l'SL fa que la pèrdua superi 1R", () => {
    const r = calcTradePnl({ direction: "long", entry: 100, exit: 97, stop: 98, quantity: 1, capitalAtEntry: 100 });
    expect(r.rMultiple).toBe(-1.5);
  });

  it("R:R planificat", () => {
    expect(plannedRR("long", 100, 98, 106)).toBe(3);
    expect(plannedRR("short", 100, 101, 98.5)).toBe(1.5);
  });
});

describe("estadístiques", () => {
  const trades = [t("a", 9, 2, 1), t("b", -4.5, -1, 2), t("c", -4.5, -1, 3), t("d", 13.5, 3, 4), t("e", 0, 0, 5)];

  it("win rate ignora el break-even", () => {
    expect(winRate(trades)).toBe(50);
    expect(winRate([])).toBeNull();
  });

  it("profit factor", () => {
    expect(profitFactor(trades)).toBe(2.5);
    expect(profitFactor([t("x", 5, 1, 1)])).toBeNull();
  });

  it("drawdown màxim des del pic", () => {
    // 150 → 159 (pic) → 154.5 → 150 (dd 9 = 5.66 %) → 163.5
    expect(maxDrawdown(trades, 150)).toEqual({ amount: 9, pct: 5.66 });
    expect(maxDrawdown([t("x", -10, -1, 1)], 100)).toEqual({ amount: 10, pct: 10 });
  });

  it("corba de capital ordenada per data", () => {
    const curve = equityCurve([trades[1], trades[0]], 150);
    expect(curve.map((p) => p.equity)).toEqual([159, 154.5]);
    expect(curve[1].drawdown).toBe(-4.5);
  });

  it("resum complet", () => {
    const s = computeStats(trades, 150);
    expect(s).toMatchObject({
      trades: 5, wins: 2, losses: 2, breakeven: 1, netPnl: 13.5,
      grossProfit: 22.5, grossLoss: -9, winRate: 50, avgR: 0.6, totalR: 3,
      profitFactor: 2.5, expectancy: 2.7, avgWin: 11.25, avgLoss: -4.5, maxDrawdown: 9,
    });
    expect(s.best?.id).toBe("d");
    expect(s.worst?.netPnl).toBe(-4.5);
  });

  it("resum buit", () => {
    const s = computeStats([], 150);
    expect(s.trades).toBe(0);
    expect(s.winRate).toBeNull();
    expect(s.maxDrawdown).toBe(0);
  });
});

describe("activityStreak", () => {
  it("compta dies seguits fins avui", () => {
    expect(activityStreak(["2026-11-19", "2026-11-20", "2026-11-21"], "2026-11-21")).toBe(3);
  });
  it("no es trenca si avui encara no s'ha registrat res", () => {
    expect(activityStreak(["2026-11-19", "2026-11-20"], "2026-11-21")).toBe(2);
  });
  it("es trenca amb un dia buit", () => {
    expect(activityStreak(["2026-11-17", "2026-11-19", "2026-11-20"], "2026-11-20")).toBe(2);
    expect(activityStreak([], "2026-11-20")).toBe(0);
  });
  it("travessa canvis de mes", () => {
    expect(activityStreak(["2026-10-31", "2026-11-01"], "2026-11-01")).toBe(2);
  });
});

describe("checkDiscipline", () => {
  const limits = { maxDailyLoss: 10, maxWeeklyLoss: 25, maxTradesPerDay: 3 };
  it("sense alertes", () => {
    expect(checkDiscipline(limits, { todayPnl: 5, weekPnl: -5, tradesToday: 1 })).toEqual([]);
  });
  it("avís al 80 % i incompliment al 100 %", () => {
    const a = checkDiscipline(limits, { todayPnl: -8, weekPnl: -26, tradesToday: 3 });
    expect(a).toEqual([
      { code: "daily_loss", level: "warning", current: 8, limit: 10 },
      { code: "weekly_loss", level: "breach", current: 26, limit: 25 },
      { code: "max_trades", level: "breach", current: 3, limit: 3 },
    ]);
  });
  it("límits desactivats", () => {
    expect(checkDiscipline({ maxDailyLoss: null, maxWeeklyLoss: null, maxTradesPerDay: null }, { todayPnl: -100, weekPnl: -100, tradesToday: 50 })).toEqual([]);
  });
});

import { riskOfRuin } from ".";

describe("riskOfRuin", () => {
  it("esperança negativa → ruïna gairebé segura", () => {
    const r = riskOfRuin({ winRate: 30, rewardRisk: 1.5, ruinR: 20 });
    expect(r.expectancyR).toBe(-0.25);
    expect(r.probability).toBeGreaterThan(95);
    expect(r.verdict).toBe("critical");
  });
  it("esperança clarament positiva → risc molt baix", () => {
    const r = riskOfRuin({ winRate: 50, rewardRisk: 2, ruinR: 20 });
    expect(r.expectancyR).toBe(0.5);
    expect(r.probability).toBeLessThan(1);
    expect(r.verdict).toBe("bulletproof");
  });
  it("un llindar de ruïna més ajustat augmenta el risc", () => {
    const tight = riskOfRuin({ winRate: 45, rewardRisk: 1.5, ruinR: 5 });
    const loose = riskOfRuin({ winRate: 45, rewardRisk: 1.5, ruinR: 30 });
    expect(tight.probability).toBeGreaterThan(loose.probability);
  });
  it("és determinista", () => {
    expect(riskOfRuin({ winRate: 40, rewardRisk: 1.6, ruinR: 10 })).toEqual(riskOfRuin({ winRate: 40, rewardRisk: 1.6, ruinR: 10 }));
  });
});
