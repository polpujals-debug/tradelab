import { APP_TZ } from "./time";

const LOCALE = "ca-ES";

export function formatMoney(value: number | null | undefined, opts: { currency?: string; sign?: boolean; decimals?: number } = {}): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const s = new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: opts.currency ?? "EUR",
    minimumFractionDigits: opts.decimals ?? 2,
    maximumFractionDigits: opts.decimals ?? 2,
    signDisplay: opts.sign ? "exceptZero" : "auto",
  }).format(value);
  return s;
}

export function formatPct(value: number | null | undefined, opts: { sign?: boolean; decimals?: number } = {}): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: opts.decimals ?? 1,
    maximumFractionDigits: opts.decimals ?? 1,
    signDisplay: opts.sign ? "exceptZero" : "auto",
  }).format(value) + " %";
}

export function formatR(value: number | null | undefined, decimals = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals, signDisplay: "exceptZero" }).format(value) + "R";
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(value);
}

/** Preus: més decimals com més petit és el valor. */
export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const d = abs >= 1000 ? 1 : abs >= 10 ? 2 : abs >= 1 ? 3 : 5;
  return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d }).format(value);
}

export function formatQty(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const d = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: d }).format(value);
}

export function formatDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  if (!value) return "—";
  const d = typeof value === "string" && value.length === 10 ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return new Intl.DateTimeFormat(LOCALE, { timeZone: APP_TZ, ...opts }).format(d);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatRelative(value: string | Date): string {
  const diff = (new Date(value).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(value);
}

export function pnlTone(value: number | null | undefined): "profit" | "loss" | "neutral" {
  if (value == null || value === 0 || !Number.isFinite(value)) return "neutral";
  return value > 0 ? "profit" : "loss";
}
