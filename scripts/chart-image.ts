/**
 * Genera captures de gràfic d'espelmes (estil fosc tipus TradingView) amb la MA50,
 * per a les dades d'exemple. Ús exclusiu del seed.
 */
export interface ChartImageOptions {
  symbol: string;
  timeframe: string;
  startPrice: number;
  volatility: number; // en tant per u per espelma (ex.: 0.003)
  drift: number; // tendència per espelma (ex.: 0.0006)
  seed: number;
  candles?: number;
  levels?: { price: number; kind: "support" | "resistance" }[];
  marker?: { index: number; direction: "long" | "short"; stop?: number; target?: number };
  width?: number;
  height?: number;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Candle { o: number; h: number; l: number; c: number }

export function makeCandles(o: ChartImageOptions): Candle[] {
  const rnd = mulberry32(o.seed);
  const n = (o.candles ?? 110) + 50;
  const out: Candle[] = [];
  let price = o.startPrice;
  for (let i = 0; i < n; i++) {
    // ones suaus perquè hi hagi impulsos i retrocessos
    const wave = Math.sin(i / 9) * o.volatility * 0.6;
    const change = o.drift + wave + (rnd() - 0.5) * 2 * o.volatility;
    const open = price;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + rnd() * o.volatility * 0.8);
    const low = Math.min(open, close) * (1 - rnd() * o.volatility * 0.8);
    out.push({ o: open, h: high, l: low, c: close });
    price = close;
  }
  return out;
}

const fmt = (v: number) => (v >= 1000 ? v.toFixed(0) : v >= 10 ? v.toFixed(2) : v.toFixed(3));

export function chartSvg(opts: ChartImageOptions): { svg: string; lastPrice: number; ma50: number } {
  const W = opts.width ?? 1280;
  const H = opts.height ?? 720;
  const all = makeCandles(opts);
  const ma: number[] = all.map((_, i) => (i < 49 ? NaN : all.slice(i - 49, i + 1).reduce((s, c) => s + c.c, 0) / 50));
  const candles = all.slice(50);
  const maVis = ma.slice(50);

  const pad = { l: 16, r: 86, t: 56, b: 36 };
  const lo = Math.min(...candles.map((c) => c.l), ...(opts.levels?.map((l) => l.price) ?? []));
  const hi = Math.max(...candles.map((c) => c.h), ...(opts.levels?.map((l) => l.price) ?? []));
  const range = hi - lo;
  const min = lo - range * 0.06;
  const max = hi + range * 0.06;
  const y = (p: number) => pad.t + ((max - p) / (max - min)) * (H - pad.t - pad.b);
  const cw = (W - pad.l - pad.r) / candles.length;
  const x = (i: number) => pad.l + i * cw + cw / 2;

  const parts: string[] = [];
  parts.push(`<rect width="${W}" height="${H}" fill="#0E1117"/>`);
  for (let g = 0; g <= 6; g++) {
    const gy = pad.t + (g / 6) * (H - pad.t - pad.b);
    const price = max - (g / 6) * (max - min);
    parts.push(`<line x1="${pad.l}" x2="${W - pad.r}" y1="${gy}" y2="${gy}" stroke="#1C2230" stroke-width="1"/>`);
    parts.push(`<text x="${W - pad.r + 10}" y="${gy + 4}" fill="#6B7280" font-size="13" font-family="monospace">${fmt(price)}</text>`);
  }
  for (let g = 0; g < candles.length; g += 12) {
    parts.push(`<line x1="${x(g)}" x2="${x(g)}" y1="${pad.t}" y2="${H - pad.b}" stroke="#161B26" stroke-width="1"/>`);
  }
  for (const lv of opts.levels ?? []) {
    const color = lv.kind === "support" ? "#10B981" : "#EF4444";
    parts.push(`<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(lv.price)}" y2="${y(lv.price)}" stroke="${color}" stroke-width="1.5" stroke-dasharray="6 5" opacity="0.8"/>`);
    parts.push(`<rect x="${W - pad.r + 2}" y="${y(lv.price) - 10}" width="${pad.r - 6}" height="20" rx="3" fill="${color}"/>`);
    parts.push(`<text x="${W - pad.r + 8}" y="${y(lv.price) + 5}" fill="#05070D" font-size="12" font-weight="700" font-family="monospace">${fmt(lv.price)}</text>`);
  }
  candles.forEach((c, i) => {
    const up = c.c >= c.o;
    const color = up ? "#10B981" : "#EF4444";
    const bodyTop = y(Math.max(c.o, c.c));
    const bodyH = Math.max(1, Math.abs(y(c.o) - y(c.c)));
    parts.push(`<line x1="${x(i)}" x2="${x(i)}" y1="${y(c.h)}" y2="${y(c.l)}" stroke="${color}" stroke-width="1.2"/>`);
    parts.push(`<rect x="${x(i) - cw * 0.35}" y="${bodyTop}" width="${cw * 0.7}" height="${bodyH}" fill="${color}"/>`);
  });
  const path = maVis.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  parts.push(`<path d="${path}" fill="none" stroke="#3B82F6" stroke-width="2.2"/>`);

  if (opts.marker) {
    const m = opts.marker;
    const c = candles[Math.min(m.index, candles.length - 1)];
    const mx = x(Math.min(m.index, candles.length - 1));
    if (m.stop && m.target) {
      const x2 = W - pad.r;
      parts.push(`<rect x="${mx}" y="${Math.min(y(c.c), y(m.target))}" width="${x2 - mx}" height="${Math.abs(y(c.c) - y(m.target))}" fill="#10B981" opacity="0.16"/>`);
      parts.push(`<rect x="${mx}" y="${Math.min(y(c.c), y(m.stop))}" width="${x2 - mx}" height="${Math.abs(y(c.c) - y(m.stop))}" fill="#EF4444" opacity="0.16"/>`);
    }
    const up = m.direction === "long";
    const ay = up ? y(c.l) + 26 : y(c.h) - 26;
    parts.push(`<path d="M${mx},${up ? ay - 14 : ay + 14} l-8,${up ? 12 : -12} h16 z" fill="${up ? "#10B981" : "#EF4444"}"/>`);
  }

  const last = candles[candles.length - 1];
  parts.push(`<rect x="${W - pad.r + 2}" y="${y(last.c) - 10}" width="${pad.r - 6}" height="20" rx="3" fill="${last.c >= last.o ? "#10B981" : "#EF4444"}"/>`);
  parts.push(`<text x="${W - pad.r + 8}" y="${y(last.c) + 5}" fill="#fff" font-size="12" font-weight="700" font-family="monospace">${fmt(last.c)}</text>`);
  parts.push(`<text x="20" y="34" fill="#E5E7EB" font-size="20" font-weight="700" font-family="sans-serif">${opts.symbol.replace("/", "")} · ${opts.timeframe}</text>`);
  parts.push(`<text x="${30 + opts.symbol.length * 12 + opts.timeframe.length * 12}" y="34" fill="#3B82F6" font-size="15" font-family="sans-serif">MA 50  ${fmt(maVis[maVis.length - 1])}</text>`);

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`,
    lastPrice: last.c,
    ma50: maVis[maVis.length - 1],
  };
}
