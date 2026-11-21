export const APP_TZ = "Europe/Madrid";

/** Data local (YYYY-MM-DD) d'un instant a la zona indicada. */
export function localDate(date: Date | string, tz = APP_TZ): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Dilluns de la setmana (ISO) d'una data local. */
export function startOfWeek(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  return addDays(day, -dow);
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/** Instant UTC corresponent a les 00:00 locals d'un dia (gestiona l'horari d'estiu). */
export function zonedMidnightUtc(day: string, tz = APP_TZ): Date {
  const guess = new Date(`${day}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(guess);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asLocal = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess.getTime() - (asLocal - guess.getTime()));
}
