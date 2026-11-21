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

/** Offset (ms) de la zona respecte a UTC en un instant donat. */
function tzOffsetMs(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** "2026-11-21T10:30" (hora local de la zona) → ISO UTC. */
export function localInputToIso(value: string, tz = APP_TZ): string {
  const naive = new Date(`${value.length === 16 ? `${value}:00` : value}Z`);
  if (Number.isNaN(naive.getTime())) throw new Error(`Data invàlida: ${value}`);
  const first = naive.getTime() - tzOffsetMs(naive, tz);
  const second = naive.getTime() - tzOffsetMs(new Date(first), tz);
  return new Date(second).toISOString();
}

/** ISO UTC → "2026-11-21T10:30" en hora local (per a <input type="datetime-local">). */
export function isoToLocalInput(iso: string | null | undefined, tz = APP_TZ): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() + tzOffsetMs(d, tz)).toISOString().slice(0, 16);
}
