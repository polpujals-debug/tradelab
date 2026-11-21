import { describe, expect, it } from "vitest";
import { localDate, startOfWeek, zonedMidnightUtc } from "./time";

describe("dates a Europe/Madrid", () => {
  it("una sortida a les 23:30 UTC a l'hivern ja és l'endemà a Madrid", () => {
    expect(localDate("2026-11-20T23:30:00Z")).toBe("2026-11-21");
  });
  it("mitjanit local en horari d'hivern i d'estiu", () => {
    expect(zonedMidnightUtc("2026-11-21").toISOString()).toBe("2026-11-20T23:00:00.000Z");
    expect(zonedMidnightUtc("2026-07-01").toISOString()).toBe("2026-06-30T22:00:00.000Z");
  });
  it("setmana ISO comença en dilluns", () => {
    expect(startOfWeek("2026-11-21")).toBe("2026-11-16");
    expect(startOfWeek("2026-11-16")).toBe("2026-11-16");
  });
});
