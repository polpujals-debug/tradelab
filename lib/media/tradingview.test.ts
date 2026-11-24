import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ db: () => ({}) }));
const { tradingViewSnapshotUrl } = await import("./process-image");

describe("enllaços de captura de TradingView", () => {
  it("converteix l'enllaç /x/ID a la imatge directa", () => {
    expect(tradingViewSnapshotUrl("https://www.tradingview.com/x/AbCd1234/")).toBe("https://s3.tradingview.com/snapshots/a/AbCd1234.png");
    expect(tradingViewSnapshotUrl("https://es.tradingview.com/x/Zx9kLm2Q")).toBe("https://s3.tradingview.com/snapshots/z/Zx9kLm2Q.png");
  });
  it("ignora altres URL", () => {
    expect(tradingViewSnapshotUrl("https://example.com/x/AbCd1234/")).toBeNull();
    expect(tradingViewSnapshotUrl("https://www.tradingview.com/chart/AbCd1234/")).toBeNull();
  });
});
