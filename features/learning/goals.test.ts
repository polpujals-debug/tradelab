import { describe, expect, it } from "vitest";
import { goalProgress } from "./goals";

const base = { manual_progress: 0, starts_on: "2026-11-01", deadline: "2026-11-30" };
const trades = [
  { local_date: "2026-10-30", net_pnl: 10 },
  { local_date: "2026-11-02", net_pnl: -4 },
  { local_date: "2026-11-05", net_pnl: 6 },
  { local_date: "2026-11-10", net_pnl: 0 },
];

describe("goalProgress", () => {
  it("operacions guanyadores dins la finestra", () => {
    const g = goalProgress({ ...base, kind: "winning_trades", target: 1 }, trades, [], "2026-11-21");
    expect(g).toMatchObject({ current: 1, done: true, pct: 100 });
  });
  it("P&L net i win rate (sense break-even)", () => {
    expect(goalProgress({ ...base, kind: "net_pnl", target: 10 }, trades, [], "2026-11-21").current).toBe(2);
    expect(goalProgress({ ...base, kind: "win_rate", target: 50 }, trades, [], "2026-11-21").current).toBe(50);
  });
  it("ratxa des de l'inici de l'objectiu", () => {
    const g = goalProgress({ ...base, kind: "journal_streak", target: 30 }, [], ["2026-10-31", "2026-11-19", "2026-11-20", "2026-11-21"], "2026-11-21");
    expect(g.current).toBe(3);
    expect(g.pct).toBe(10);
  });
  it("objectiu vençut", () => {
    expect(goalProgress({ ...base, kind: "trades_count", target: 10 }, trades, [], "2026-12-05").expired).toBe(true);
  });
  it("manual", () => {
    expect(goalProgress({ ...base, kind: "custom", target: 5, manual_progress: 2 }, [], [], "2026-11-21").pct).toBe(40);
  });
});
