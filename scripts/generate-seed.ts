/**
 * Genera supabase/seed.sql i les captures d'exemple de public/seed/.
 * Determinista (llavor fixa) i amb dates relatives a now() perquè el
 * dashboard sempre es vegi ple i actual.
 *
 *   npm run seed:generate
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { calcTradePnl } from "../lib/finance/pnl";
import { round } from "../lib/finance/round";
import { chartSvg, mulberry32 } from "./chart-image";

const ROOT = path.resolve(__dirname, "..");
const IMG_DIR = path.join(ROOT, "public", "seed");
mkdirSync(IMG_DIR, { recursive: true });

const rnd = mulberry32(20261121);
const rndAt = mulberry32(777); // hores de les anàlisis (separat per no alterar la resta)
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const q = (v: string | null | undefined) => (v == null ? "null" : `'${v.replace(/'/g, "''")}'`);
const ago = (minutes: number) => `now() - interval '${Math.round(minutes)} minutes'`;
/** Instant a una hora local de Madrid (minuts des de mitjanit) fa `days` dies, mai més tard que fa `capMin` minuts. */
const madridAt = (days: number, minuteOfDay: number, capMin = 5) =>
  `least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '${days} days' + interval '${Math.round(minuteOfDay)} minutes') at time zone 'Europe/Madrid', now() - interval '${Math.round(capMin)} minutes')`;
const arr = (v: string[]) => `array[${v.map(q).join(",")}]::text[]`;
let uuidCounter = 0;
const uuid = (prefix: string) => {
  uuidCounter++;
  const hex = uuidCounter.toString(16).padStart(12, "0");
  return `${prefix}-0000-4000-8000-${hex}`;
};

const sql: string[] = [];
const out = (s: string) => sql.push(s);

// ───────── Imatges ─────────
const images: Promise<unknown>[] = [];
function image(name: string, opts: Parameters<typeof chartSvg>[0]) {
  const { svg, lastPrice, ma50 } = chartSvg(opts);
  const buf = Buffer.from(svg);
  images.push(sharp(buf).webp({ quality: 78 }).toFile(path.join(IMG_DIR, `${name}.webp`)));
  images.push(sharp(buf).resize(480).webp({ quality: 70 }).toFile(path.join(IMG_DIR, `${name}_thumb.webp`)));
  return { url: `/seed/${name}.webp`, thumb: `/seed/${name}_thumb.webp`, lastPrice, ma50 };
}

// ───────── Comptes, actius, configuració ─────────
const ACCOUNT = "a0000000-0000-4000-8000-000000000001";
const ACCOUNT_REAL = "a0000000-0000-4000-8000-000000000002";
out(`-- Generat per scripts/generate-seed.ts — no editar a mà.
begin;
truncate accounts, assets, strategies, strategy_rules, analyses, trades, trade_rule_checks,
  tags, trade_tags, market_reports, concepts, concept_examples, media, goals,
  practice_attempts, settings, idempotency_keys cascade;

insert into accounts (id, name, type, initial_capital, currency, is_default) values
  ('${ACCOUNT}', 'Paper TradingView', 'paper', 150, 'EUR', true),
  ('${ACCOUNT_REAL}', 'Compte real (futur)', 'real', 0, 'EUR', false);
`);

const ASSETS = {
  "BTC/USDT": { id: "b0000000-0000-4000-8000-000000000001", price: 91800, vol: 0.0028, fav: true, digits: 1 },
  "ETH/USDT": { id: "b0000000-0000-4000-8000-000000000002", price: 3120, vol: 0.0036, fav: true, digits: 2 },
  "SOL/USDT": { id: "b0000000-0000-4000-8000-000000000003", price: 142, vol: 0.0048, fav: true, digits: 3 },
  "XRP/USDT": { id: "b0000000-0000-4000-8000-000000000004", price: 2.31, vol: 0.005, fav: false, digits: 4 },
} as const;
type Sym = keyof typeof ASSETS;
out(`insert into assets (id, symbol, type, is_favorite) values
${Object.entries(ASSETS).map(([s, a]) => `  ('${a.id}', '${s}', 'crypto', ${a.fav})`).join(",\n")};
`);

out(`insert into settings (id, default_account_id, currency, default_risk_pct, risk_warning_pct,
  max_daily_loss, max_weekly_loss, max_trades_per_day, timezone, locale) values
  (1, '${ACCOUNT}', 'EUR', 3, 2, 9, 20, 4, 'Europe/Madrid', 'ca');
`);

// ───────── Estratègia ─────────
const S1 = "c0000000-0000-4000-8000-000000000001";
const S2 = "c0000000-0000-4000-8000-000000000002";
const strategyMd = (v: number) => `## Idea
Operar **a favor del biaix de 1H** i entrar només quan l'estructura de 5m ho confirma. L'execució es fa a 1m per ajustar l'stop.

## Temporalitats
| Temporalitat | Funció | Què miro |
|---|---|---|
| **1H** | Biaix | On aniran les properes espelmes. Preu respecte a la MA50 i pendent de la mitjana. |
| **5m** | Confirmació | Estructura: màxims i mínims creixents (o decreixents), impulsos i retrocessos. |
| **1m** | Execució | Gatell: trencament del darrer mínim/màxim del retrocés o espelma de rebuig. |

## Indicador
Una sola **MA50**. Per sobre → només llargs. Per sota → només curts. Preu enganxat i MA plana → **no opero**.

## Gestió del risc
- Risc per operació: **${v === 1 ? "3" : "2,5"} %** del capital (paper). Objectiu en real: ≤ 1 %.
- SL sempre definit **abans** d'entrar, darrere de l'estructura de 5m.
- TP mínim a **2R**. Si arriba a 1R, puc moure l'SL a break-even.
- Màxim 4 operacions al dia i aturar-me si perdo 9 € en un dia.
${v === 2 ? "\n## Canvis respecte a la v1\n- Afegida la regla de *retrocés a zona* (no entrar en ple impuls).\n- R:R mínim obligatori 1:2.\n" : ""}`;

out(`insert into strategies (id, name, version, description_md, is_active, created_at) values
  ('${S1}', 'MTF MA50', 1, ${q(strategyMd(1))}, false, ${ago(60 * 24 * 45)}),
  ('${S2}', 'MTF MA50', 2, ${q(strategyMd(2))}, true, ${ago(60 * 24 * 21)});
`);

const rulesV1 = [
  "Preu per sobre/sota la MA50 a 1H (biaix clar)",
  "Estructura alcista/baixista confirmada a 5m",
  "Gatell d'entrada a 1m",
  "SL definit abans d'entrar",
];
const rulesV2 = [
  "Preu per sobre/sota la MA50 a 1H (biaix clar)",
  "Estructura alcista/baixista confirmada a 5m",
  "Retrocés a zona (MA50 o suport/resistència a 5m)",
  "Gatell d'entrada a 1m",
  "R:R ≥ 1:2",
  "SL definit abans d'entrar",
];
const ruleIds: Record<string, string[]> = { [S1]: [], [S2]: [] };
const ruleRows: string[] = [];
for (const [sid, rules] of [[S1, rulesV1], [S2, rulesV2]] as const) {
  rules.forEach((text, i) => {
    const id = uuid("d0000000");
    ruleIds[sid].push(id);
    ruleRows.push(`  ('${id}', '${sid}', ${q(text)}, ${i + 1}, true)`);
  });
}
out(`insert into strategy_rules (id, strategy_id, text, sort_order, is_required) values
${ruleRows.join(",\n")};
`);

// ───────── Etiquetes ─────────
const TAGS = {
  error: ["FOMO", "Entrada precipitada", "Moure el SL", "Sense setup", "Sobreoperar", "Operació de revenja", "Tancar abans d'hora"],
  emotion: ["Calma", "Confiança", "Ansietat", "Eufòria", "Frustració", "Por"],
  setup: ["Retrocés a MA50", "Ruptura i retest", "Rebot en suport", "Rebuig en resistència"],
} as const;
const tagId: Record<string, string> = {};
const tagRows: string[] = [];
const colors = { error: "#EF4444", emotion: "#22D3EE", setup: "#3B82F6" };
for (const [kind, names] of Object.entries(TAGS) as [keyof typeof TAGS, readonly string[]][]) {
  for (const n of names) {
    const id = uuid("e0000000");
    tagId[n] = id;
    tagRows.push(`  ('${id}', ${q(n)}, '${kind}', '${colors[kind]}')`);
  }
}
out(`insert into tags (id, name, kind, color) values
${tagRows.join(",\n")};
`);

// ───────── Anàlisis ─────────
interface AnalysisSeed { id: string; sym: Sym; daysAgo: number; bias: "bullish" | "bearish" | "neutral" }
const analyses: AnalysisSeed[] = [];
const analysisRows: string[] = [];
const mediaRows: string[] = [];

const analysisTexts = {
  bullish: (s: string, ma: string, sup: string, res: string) => `### Què veig
- **1H:** el preu cotitza **per sobre de la MA50** (${ma}) i la mitjana té pendent positiu. Els darrers mínims són creixents.
- **5m:** estructura alcista neta: impuls fort, retrocés ordenat fins a la zona de ${sup} i nou màxim.
- El volum acompanya els impulsos i s'asseca als retrocessos: bon senyal.

### Nivells clau
- Suport: **${sup}** (mínim del retrocés + MA50 de 5m)
- Resistència: **${res}** (màxim previ)

### Escenari
Mentre ${s} aguanti per sobre de ${sup}, espero continuació cap a ${res}. Entrada ideal en un retrocés a la zona amb gatell a 1m.

### Què invalidaria l'anàlisi
Un tancament de 1H per sota de la MA50.`,
  bearish: (s: string, ma: string, sup: string, res: string) => `### Què veig
- **1H:** el preu ha perdut la **MA50** (${ma}) i ara la mitjana actua com a resistència. Màxims decreixents.
- **5m:** impuls baixista fort i retrocés feble cap a ${res}; els compradors no tenen força.

### Nivells clau
- Resistència: **${res}** (zona de rebuig + MA50)
- Suport: **${sup}**

### Escenari
Biaix baixista mentre no recuperi ${res}. Busco curts en retrocessos cap a la resistència amb confirmació a 5m. Objectiu ${sup}.

### Què invalidaria l'anàlisi
Recuperar la MA50 de 1H amb un tancament clar per sobre.`,
  neutral: (s: string, ma: string, sup: string, res: string) => `### Què veig
- **1H:** el preu està **enganxat a la MA50** (${ma}) i la mitjana és plana. No hi ha biaix clar.
- **5m:** rang entre ${sup} i ${res}, amb mitges i trencaments falsos.

### Escenari
Segons la meva estratègia, **no opero** fins que el preu surti del rang i la MA50 agafi pendent. Vigilaré un trencament amb retest de ${res} (llargs) o de ${sup} (curts).`,
};

const analysisPlan: [Sym, number, AnalysisSeed["bias"], string, "fulfilled" | "failed" | "partial" | "pending"][] = [
  ["BTC/USDT", 34, "bullish", "1H,5m", "fulfilled"],
  ["ETH/USDT", 30, "bearish", "1H,5m", "failed"],
  ["SOL/USDT", 26, "bullish", "1H", "fulfilled"],
  ["BTC/USDT", 22, "neutral", "1H,5m", "partial"],
  ["ETH/USDT", 17, "bullish", "1H,5m,1m", "fulfilled"],
  ["BTC/USDT", 13, "bearish", "1H,5m", "fulfilled"],
  ["SOL/USDT", 9, "bearish", "1H,5m", "failed"],
  ["BTC/USDT", 6, "bullish", "1H,5m", "fulfilled"],
  ["ETH/USDT", 3, "neutral", "1H", "pending"],
  ["BTC/USDT", 1, "bullish", "1H,5m", "pending"],
  ["SOL/USDT", 0, "bullish", "1H,5m", "pending"],
];
const biasTitle = { bullish: "biaix alcista sobre la MA50", bearish: "pèrdua de la MA50, biaix baixista", neutral: "rang sobre la MA50 plana, sense biaix" };
analysisPlan.forEach(([sym, daysAgo, bias, tfs, outcome], i) => {
  const a = ASSETS[sym];
  const id = uuid("f0000000");
  const drift = bias === "bullish" ? 0.0007 : bias === "bearish" ? -0.0007 : 0;
  const price = a.price * (1 + (rnd() - 0.5) * 0.08);
  const sup = round(price * (1 - 0.012 - rnd() * 0.01), a.digits);
  const res = round(price * (1 + 0.015 + rnd() * 0.01), a.digits);
  const img = image(`analysis_${i + 1}`, {
    symbol: sym, timeframe: tfs.split(",")[0] === "1H" ? "1H" : "5m", startPrice: price * (bias === "bullish" ? 0.95 : bias === "bearish" ? 1.05 : 1),
    volatility: a.vol, drift, seed: 1000 + i,
    levels: [{ price: sup, kind: "support" }, { price: res, kind: "resistance" }],
  });
  const ma = round(img.ma50, a.digits);
  const fmtP = (v: number) => v.toLocaleString("ca-ES", { maximumFractionDigits: a.digits });
  const md = analysisTexts[bias](sym, fmtP(ma), fmtP(sup), fmtP(res));
  const scenario = bias === "bullish" ? `Continuació alcista cap a ${fmtP(res)} mentre aguanti ${fmtP(sup)}`
    : bias === "bearish" ? `Caiguda cap a ${fmtP(sup)} mentre no recuperi ${fmtP(res)}`
    : `Esperar sortida del rang ${fmtP(sup)}–${fmtP(res)}`;
  void (daysAgo * 1440 + 300 + rnd() * 300); // conserva la seqüència aleatòria
  const at = madridAt(daysAgo, 8 * 60 + rndAt() * 90, 30); // 08:00–09:30, abans de la sessió
  analyses.push({ id, sym, daysAgo, bias });
  const reviewed = outcome !== "pending";
  analysisRows.push(`  ('${id}', '${a.id}', ${q(`${sym.split("/")[0]}: ${biasTitle[bias]}`)}, ${arr(tfs.split(","))}, '${bias}',
   '${JSON.stringify({ supports: [sup], resistances: [res], ma50: ma })}'::jsonb, ${q(md)}, ${q(scenario)},
   '${outcome}', ((${at}) + interval '3 days')::date, ${reviewed ? `(${at}) + interval '3 days'` : "null"},
   ${q(i === 3 ? "Em costa veure quan la MA50 és 'plana'. Preguntar quin pendent es considera pla." : i === 6 ? "Vaig ignorar que a 1H hi havia una divergència. Revisar." : null)},
   ${q(i === 8 ? "Com distingeixo un rang d'un retrocés llarg?" : null)}, 'claude', ${at}, ${at})`);
  mediaRows.push(`  ('analysis', '${id}', 'analysis', '${img.url}', '${img.thumb}', 'image/webp', 1280, 720, ${q(`${sym} ${tfs.split(",")[0]}`)}, 0, ${at})`);
});
out(`insert into analyses (id, asset_id, title, timeframes, bias, levels, content_md, scenario, outcome, review_at, reviewed_at, my_notes, questions, source, analyzed_at, created_at) values
${analysisRows.join(",\n")};
`);

// ───────── Operacions ─────────
interface TradeSeed { id: string; sym: Sym; netPnl: number; errors: string[] }
const tradeRows: string[] = [];
const checkRows: string[] = [];
const tradeTagRows: string[] = [];
const tradesOut: TradeSeed[] = [];
let capital = 150;

// Dies amb activitat (dies enrere). Els darrers 7 dies seguits per tenir ratxa.
const activeDays = [41, 40, 38, 37, 36, 34, 33, 31, 30, 29, 27, 26, 24, 23, 22, 20, 19, 17, 16, 15, 13, 12, 10, 9, 8, 6, 5, 4, 3, 2, 1, 0];
// Mateixa longitud per direcció (4) perquè la seqüència aleatòria no canviï
const triggers = {
  long: ["Trencament del màxim del retrocés a 1m", "Espelma envolvent alcista a 1m", "Rebuig amb metxa inferior llarga a 1m", "Trencament de la línia de tendència baixista de 1m"],
  short: ["Trencament del mínim del retrocés a 1m", "Espelma envolvent baixista a 1m", "Rebuig amb metxa superior llarga a 1m", "Trencament de la línia de tendència alcista de 1m"],
};
const confirmations = {
  long: ["Màxims i mínims creixents a 5m", "Impuls alcista + retrocés al 50 %", "Ruptura d'estructura alcista (BOS) a 5m", "Retrocés a la MA50 de 5m amb mínim més alt"],
  short: ["Màxims i mínims decreixents a 5m", "Impuls baixista + retrocés al 50 %", "Ruptura d'estructura baixista (BOS) a 5m", "Retrocés a la MA50 de 5m amb màxim més baix"],
};
const lessons = [
  "Esperar el retrocés: entrar en ple impuls em deixa l'SL massa lluny.",
  "Si el biaix de 1H no és clar, no hi ha operació.",
  "L'SL es posa abans d'entrar i no es toca.",
  "Una pèrdua de -1R és part del pla, no un error.",
  "Després de dues pèrdues seguides, parar i revisar.",
  "Deixar córrer fins al TP: tancar abans redueix l'R mitjà.",
];

let tradeIndex = 0;
for (const daysAgo of activeDays) {
  const n = daysAgo === 0 ? 1 : 1 + Math.floor(rnd() * 2.4);
  for (let k = 0; k < n; k++) {
    tradeIndex++;
    const sym: Sym = rnd() < 0.5 ? "BTC/USDT" : rnd() < 0.6 ? "ETH/USDT" : "SOL/USDT";
    const a = ASSETS[sym];
    const strategy = daysAgo > 21 ? S1 : S2;
    const riskPct = strategy === S1 ? 3 : 2.5;
    const direction = rnd() < 0.62 ? "long" : "short";
    const sign = direction === "long" ? 1 : -1;
    const price = round(a.price * (1 + (rnd() - 0.5) * 0.1 + (41 - daysAgo) * 0.0012), a.digits);
    const stopDist = price * (0.0025 + rnd() * 0.004);
    const stop = round(price - sign * stopDist, a.digits);
    const riskPerUnit = Math.abs(price - stop);
    const rrPlanned = pick([2, 2, 2.5, 3]);
    const tp = round(price + sign * riskPerUnit * rrPlanned, a.digits);
    const qty = round((capital * riskPct) / 100 / riskPerUnit, 6);

    // Resultat: la v2 i el compliment milloren el win rate (aprenentatge visible)
    const learning = strategy === S2 ? 0.1 : 0;
    const hasError = rnd() < (strategy === S1 ? 0.42 : 0.24);
    const errors: string[] = [];
    if (hasError) {
      errors.push(pick(TAGS.error));
      if (rnd() < 0.25) errors.push(pick(TAGS.error));
    }
    const uniqErrors = [...new Set(errors)];
    const winP = (hasError ? 0.18 : 0.44) + learning;
    const roll = rnd();
    let r: number;
    if (roll < winP) r = uniqErrors.includes("Tancar abans d'hora") ? 0.6 + rnd() * 0.6 : rrPlanned * (0.85 + rnd() * 0.15);
    else if (roll < winP + 0.06) r = 0;
    else r = uniqErrors.includes("Moure el SL") ? -(1.3 + rnd() * 0.5) : -1;
    const exit = round(price + sign * riskPerUnit * r, a.digits);
    const fees = round(qty * price * 0.0002 * 2, 4);
    const startMin = 9 * 60 + 15 + k * 170 + rnd() * 110; // 09:15–18:00 hora de Madrid
    const duration = 12 + rnd() * 70;
    const entryTs = madridAt(daysAgo, startMin, 5 + duration + (n - k) * 90);
    const exitTs = madridAt(daysAgo, startMin + duration, 5 + (n - k - 1) * 90);
    const isOpenToday = daysAgo === 0 && k === n - 1;
    const pnl = calcTradePnl({ direction, entry: price, exit, stop, quantity: qty, fees, capitalAtEntry: capital });
    const id = uuid("10000000");

    const rules = ruleIds[strategy];
    const passedCount = hasError ? Math.max(1, rules.length - 1 - Math.floor(rnd() * 3)) : rnd() < 0.8 ? rules.length : rules.length - 1;
    const order = [...rules].sort(() => rnd() - 0.5);
    const passedSet = new Set(order.slice(0, passedCount));
    rules.forEach((rid) => checkRows.push(`  ('${id}', '${rid}', ${passedSet.has(rid)})`));

    const setup = direction === "long" ? pick(["Retrocés a MA50", "Rebot en suport", "Ruptura i retest"]) : pick(["Retrocés a MA50", "Rebuig en resistència", "Ruptura i retest"]);
    const emotionB = hasError ? pick(["Ansietat", "Eufòria", "Por"]) : pick(["Calma", "Confiança"]);
    const emotionA = r > 0 ? pick(["Confiança", "Calma"]) : pick(["Frustració", "Calma", "Ansietat"]);
    for (const t of [...uniqErrors, setup, emotionB]) tradeTagRows.push(`  ('${id}', '${tagId[t]}')`);

    const analysis = analyses.find((x) => x.sym === sym && Math.abs(x.daysAgo - daysAgo) <= 1);
    const status = isOpenToday ? "open" : "closed";
    tradeRows.push(`  ('${id}', '${ACCOUNT}', '${a.id}', '${strategy}', ${analysis ? `'${analysis.id}'` : "null"}, '${direction}', '${status}',
   ${entryTs}, ${status === "closed" ? exitTs : "null"}, ${price}, ${stop}, ${tp}, ${status === "closed" ? exit : "null"},
   ${qty}, ${round(Math.max(1, Math.ceil((qty * price) / capital)), 0)}, ${status === "closed" ? fees : 0}, ${round(capital, 2)},
   '${direction === "long" ? "bullish" : "bearish"}', ${q(pick(confirmations[direction]))}, ${q(pick(triggers[direction]))}, ${q(setup)},
   ${q(emotionB)}, ${status === "closed" ? q(emotionA) : "null"},
   ${q(hasError ? `Vaig entrar amb ${uniqErrors.join(" i ").toLowerCase()}. ${r < 0 ? "El mercat no em va donar la raó." : "Va sortir bé però no per les raons correctes."}` : r > 0 ? "Setup de manual: biaix, estructura i gatell alineats." : "Bona execució; el mercat simplement no hi va arribar.")},
   ${status === "closed" ? q(pick(lessons)) : "null"}, ${entryTs})`);

    if (tradeIndex % 4 === 0 || isOpenToday) {
      const before = image(`trade_${tradeIndex}_before`, {
        symbol: sym, timeframe: "5m", startPrice: price * (1 - sign * 0.03), volatility: a.vol * 0.8, drift: sign * 0.0004,
        seed: 5000 + tradeIndex, candles: 90, marker: { index: 88, direction, stop, target: tp },
      });
      mediaRows.push(`  ('trade', '${id}', 'before', '${before.url}', '${before.thumb}', 'image/webp', 1280, 720, 'Pla a 5m', 0, ${entryTs})`);
      if (status === "closed") {
        const after = image(`trade_${tradeIndex}_after`, {
          symbol: sym, timeframe: "5m", startPrice: price * (1 - sign * 0.03), volatility: a.vol * 0.8, drift: sign * 0.0004 * (r > 0 ? 1.4 : -0.6),
          seed: 5000 + tradeIndex, candles: 120, marker: { index: 88, direction, stop, target: tp },
        });
        mediaRows.push(`  ('trade', '${id}', 'after', '${after.url}', '${after.thumb}', 'image/webp', 1280, 720, 'Resultat', 1, ${exitTs})`);
      }
    }

    if (status === "closed") capital += pnl.netPnl;
    tradesOut.push({ id, sym, netPnl: status === "closed" ? pnl.netPnl : 0, errors: uniqErrors });
  }
}

// Una planificada i una cancel·lada
{
  const a = ASSETS["ETH/USDT"];
  const entry = round(a.price * 1.045, 2), stop = round(entry * 0.995, 2), tp = round(entry + (entry - stop) * 2.5, 2);
  const qty = round((capital * 0.025) / (entry - stop), 6);
  const planned = uuid("10000000");
  tradeRows.push(`  ('${planned}', '${ACCOUNT}', '${a.id}', '${S2}', null, 'long', 'planned', null, null, ${entry}, ${stop}, ${tp}, null, ${qty}, 5, 0, ${round(capital, 2)},
   'bullish', 'Esperant retrocés a la MA50 de 5m', null, 'Retrocés a MA50', null, null, 'Pla creat des de la calculadora.', null, ${ago(45)})`);
  const cancelled = uuid("10000000");
  const sa = ASSETS["SOL/USDT"];
  const e2 = round(sa.price * 1.03, 3), s2 = round(e2 * 1.006, 3);
  tradeRows.push(`  ('${cancelled}', '${ACCOUNT}', '${sa.id}', '${S2}', null, 'short', 'cancelled', null, null, ${e2}, ${s2}, ${round(e2 - (s2 - e2) * 2, 3)}, null, ${round((capital * 0.025) / (s2 - e2), 4)}, 3, 0, ${round(capital, 2)},
   'bearish', null, null, 'Rebuig en resistència', 'Ansietat', null, 'Cancel·lada: el biaix de 1H va canviar abans d''entrar.', null, ${ago(1440 * 2 + 200)})`);
}

out(`insert into trades (id, account_id, asset_id, strategy_id, analysis_id, direction, status, entry_at, exit_at,
  entry_price, stop_loss, take_profit, exit_price, quantity, leverage, fees, capital_at_entry,
  bias_1h, confirmation_5m, trigger_1m, setup, emotion_before, emotion_after, notes, lesson, created_at) values
${tradeRows.join(",\n")};

insert into trade_rule_checks (trade_id, rule_id, passed) values
${checkRows.join(",\n")};

insert into trade_tags (trade_id, tag_id) values
${[...new Set(tradeTagRows)].join(",\n")};
`);

// ───────── Informes de mercat ─────────
const reportRows: string[] = [];
for (let d = 6; d >= 0; d--) {
  const btcBias = d % 3 === 1 ? "neutral" : d % 4 === 0 ? "bearish" : "bullish";
  const ethBias = d % 2 === 0 ? "bullish" : "neutral";
  const btc = round(ASSETS["BTC/USDT"].price * (1 + (6 - d) * 0.004), 0);
  const eth = round(ASSETS["ETH/USDT"].price * (1 + (6 - d) * 0.003), 0);
  const md = `## Resum del mercat
El mercat crypto obre ${btcBias === "bullish" ? "amb to positiu" : btcBias === "bearish" ? "amb pressió venedora" : "sense direcció clara"}. La dominància de BTC es manté estable i els altcoins segueixen el moviment de BTC sense força pròpia.

## BTC/USDT
- **Biaix 1H:** ${btcBias === "bullish" ? "🟢 alcista" : btcBias === "bearish" ? "🔴 baixista" : "⚪ neutral"}
- **Preu:** ~${btc.toLocaleString("ca-ES")} · **MA50 (1H):** ${(btc * (btcBias === "bullish" ? 0.992 : 1.006)).toLocaleString("ca-ES", { maximumFractionDigits: 0 })} (${btcBias === "bullish" ? "preu per sobre" : btcBias === "bearish" ? "preu per sota" : "preu enganxat"})
- **Suports:** ${(btc * 0.985).toLocaleString("ca-ES", { maximumFractionDigits: 0 })} · ${(btc * 0.97).toLocaleString("ca-ES", { maximumFractionDigits: 0 })}
- **Resistències:** ${(btc * 1.012).toLocaleString("ca-ES", { maximumFractionDigits: 0 })} · ${(btc * 1.025).toLocaleString("ca-ES", { maximumFractionDigits: 0 })}

## ETH/USDT
- **Biaix 1H:** ${ethBias === "bullish" ? "🟢 alcista" : "⚪ neutral"}
- **Preu:** ~${eth.toLocaleString("ca-ES")} · relació amb la MA50: ${ethBias === "bullish" ? "rebot net a la mitjana" : "creuant-la amunt i avall"}
- **Nivells:** suport ${(eth * 0.98).toLocaleString("ca-ES", { maximumFractionDigits: 0 })}, resistència ${(eth * 1.02).toLocaleString("ca-ES", { maximumFractionDigits: 0 })}

## Notícies i esdeveniments
- ${pick(["Dades d'inflació dels EUA a les 14:30 (hora de Madrid): esperar volatilitat.", "Discurs de la Fed a les 20:00.", "Venciment d'opcions de BTC divendres.", "Fluxos positius als ETF de BTC ahir."])}
- ${pick(["Cap esdeveniment macro important avui.", "Actualització de xarxa d'Ethereum programada.", "Volum baix per festiu als EUA."])}

## Pla per avui
1. Operar només ${btcBias === "neutral" ? "si BTC surt del rang amb un retest clar" : `en la direcció del biaix (${btcBias === "bullish" ? "llargs" : "curts"})`}.
2. No operar 15 minuts abans ni després de les notícies.
3. Respectar el límit: màxim 4 operacions i 9 € de pèrdua.

## Actius a vigilar
SOL/USDT (aguantant la MA50 de 1H), ETH/USDT.`;
  const date = `(now() - interval '${d} days')::date`;
  reportRows.push(`  ('daily', ${q(`Informe diari · BTC ${btcBias === "bullish" ? "alcista" : btcBias === "bearish" ? "baixista" : "neutral"}`)}, ${q(`BTC ${btcBias === "bullish" ? "per sobre" : btcBias === "bearish" ? "per sota" : "al voltant"} de la MA50 de 1H; ETH ${ethBias === "bullish" ? "acompanya" : "sense direcció"}.`)}, ${q(md)}, ${date}, '${btcBias}', '${ethBias}', ${arr(["BTC/USDT", "ETH/USDT", "SOL/USDT"])}, ${d >= 2}, 'scheduled', ${q(`seed-daily-${d}`)}, ${ago(d * 1440 + 60 * 3)})`);
}
for (const w of [1, 0]) {
  const md = `## Setmana en resum
${w === 1 ? "Setmana alcista per a BTC, que ha respectat la MA50 de 1H a tots els retrocessos." : "Setmana de consolidació: BTC ha fet un rang ample i les altcoins han perdut força relativa."}

## Nivells setmanals
| Actiu | Suport | Resistència | MA50 (1H) |
|---|---|---|---|
| BTC | ${(91800 * 0.96).toLocaleString("ca-ES", { maximumFractionDigits: 0 })} | ${(91800 * 1.04).toLocaleString("ca-ES", { maximumFractionDigits: 0 })} | per sobre |
| ETH | ${(3120 * 0.95).toLocaleString("ca-ES", { maximumFractionDigits: 0 })} | ${(3120 * 1.05).toLocaleString("ca-ES", { maximumFractionDigits: 0 })} | a prop |
| SOL | ${(142 * 0.93).toFixed(1)} | ${(142 * 1.07).toFixed(1)} | per sobre |

## Calendari de la setmana
- Dimarts: actes de la Fed
- Dijous: dades d'ocupació dels EUA
- Divendres: venciment d'opcions

## Pla per a la setmana
- Prioritat: **BTC i ETH** en la direcció del biaix de 1H.
- Revisar dissabte el diari d'operacions i actualitzar el playbook si cal.`;
  reportRows.push(`  ('weekly', ${q(w === 1 ? "Informe setmanal · tendència alcista intacta" : "Informe setmanal · consolidació")}, ${q(w === 1 ? "BTC respecta la MA50 de 1H; setmana per buscar llargs." : "Rang ample a BTC; paciència i menys operacions.")}, ${q(md)}, (date_trunc('week', now()) - interval '${w} weeks')::date, '${w === 1 ? "bullish" : "neutral"}', 'neutral', ${arr(["BTC/USDT", "ETH/USDT", "SOL/USDT"])}, ${w === 1}, 'scheduled', ${q(`seed-weekly-${w}`)}, date_trunc('week', now()) - interval '${w} weeks' + interval '8 hours')`);
}
out(`insert into market_reports (type, title, summary, content_md, report_date, btc_bias, eth_bias, watchlist, is_read, source, idempotency_key, created_at) values
${reportRows.join(",\n")};
`);

// ───────── Media ─────────
out(`insert into media (entity_type, entity_id, kind, url, thumb_url, mime_type, width, height, caption, sort_order, created_at) values
${mediaRows.join(",\n")};
`);

// ───────── Conceptes ─────────
const concepts: [string, string, string, string, string, "pending" | "learning" | "mastered"][] = [
  ["estructura-de-mercat", "Estructura de mercat", "Fonaments", "Màxims i mínims: com es defineix una tendència.",
   `Una **tendència alcista** fa màxims i mínims creixents (HH/HL). Una **baixista**, màxims i mínims decreixents (LH/LL).

- **BOS (break of structure):** el preu supera el darrer màxim (alcista) o mínim (baixista) → la tendència continua.
- **CHoCH (change of character):** primer trencament en contra → possible canvi de tendència.

**A la meva estratègia:** l'estructura es llegeix a **5m** per confirmar el biaix de 1H.`, "learning"],
  ["suports-i-resistencies", "Suports i resistències", "Fonaments", "Zones on el preu ha reaccionat abans.",
   `Un **suport** és una zona on la demanda ha frenat caigudes; una **resistència**, on l'oferta ha frenat pujades.

- Pensa en **zones**, no en línies exactes.
- Com més vegades es toca un nivell, més probable és que acabi trencant.
- Un suport trencat sovint es converteix en resistència (*flip*).`, "learning"],
  ["tendencia", "Tendència", "Fonaments", "Operar a favor del corrent principal.",
   `La tendència és la direcció dominant del preu en una temporalitat. **A favor de tendència** la probabilitat és més alta i els moviments, més llargs.

A la meva estratègia la tendència de referència és la de **1H**, definida per la posició del preu respecte a la MA50 i el pendent de la mitjana.`, "mastered"],
  ["impulsos-i-retrocessos", "Impulsos i retrocessos", "Fonaments", "El ritme del preu: moviments forts i correccions.",
   `En tendència, el preu alterna **impulsos** (espelmes grans a favor) i **retrocessos** (correccions més lentes i petites).

- Entrar **al final del retrocés** dona un SL més ajustat i un millor R:R.
- Entrar **en ple impuls** és la causa típica de *FOMO* i d'SL massa lluny.
- Retrocessos habituals: 38–62 % de l'impuls o tornada a la MA50.`, "learning"],
  ["ma50", "Mitjana mòbil de 50 (MA50)", "Indicadors", "L'únic indicador de la meva estratègia.",
   `La **MA50** és la mitjana del preu de tancament de les darreres 50 espelmes.

| Situació | Lectura |
|---|---|
| Preu per sobre i MA amb pendent amunt | Biaix alcista → només llargs |
| Preu per sota i MA amb pendent avall | Biaix baixista → només curts |
| Preu creuant-la i MA plana | Sense biaix → no operar |

Als retrocessos, la MA50 sovint actua com a **suport/resistència dinàmica**.`, "learning"],
  ["temporalitats-multiples", "Anàlisi multitemporal", "Estratègia", "1H biaix → 5m estructura → 1m execució.",
   `Cada temporalitat té una funció:
1. **1H — biaix:** cap a on és més probable que vagi el preu.
2. **5m — confirmació:** l'estructura s'alinea amb el biaix.
3. **1m — execució:** gatell precís i SL ajustat.

Regla d'or: **la temporalitat menor mai contradiu la major**.`, "learning"],
  ["gestio-del-risc", "Gestió del risc", "Risc", "Mida de posició, R i límits.",
   `- **1R** = el que perds si toca l'SL.
- **Mida de posició** = (capital × risc %) / distància a l'SL.
- Amb un **R:R 1:2** i un win rate del 40 % ja ets rendible: 0,4 × 2 − 0,6 × 1 = **+0,2R** per operació.
- El palanquejament **no canvia el risc** si la mida es calcula amb l'SL; només canvia el marge.`, "mastered"],
  ["psicologia", "Psicologia del trading", "Psicologia", "FOMO, revenja i disciplina.",
   `Els errors més cars no són tècnics:
- **FOMO:** entrar tard perquè “se n'anirà sense mi”.
- **Revenja:** obrir una operació per recuperar una pèrdua.
- **Moure l'SL:** convertir -1R en -2R.

Eina: la **checklist** abans de cada entrada i el **límit diari**.`, "pending"],
  ["rr-i-esperanca", "R:R i esperança matemàtica", "Risc", "Per què el win rate sol no diu res.",
   `**Esperança** = (win rate × guany mitjà) − (loss rate × pèrdua mitjana).

Exemple: 45 % d'encerts a 2R → 0,45 × 2 − 0,55 × 1 = **+0,35R** per operació.`, "pending"],
];
const conceptIds: Record<string, string> = {};
out(`insert into concepts (id, slug, title, category, summary, content_md, status, sort_order) values
${concepts.map(([slug, title, cat, summary, md, status], i) => {
  const id = uuid("20000000");
  conceptIds[slug] = id;
  return `  ('${id}', '${slug}', ${q(title)}, ${q(cat)}, ${q(summary)}, ${q(md)}, '${status}', ${i + 1})`;
}).join(",\n")};

insert into concept_examples (concept_id, analysis_id, note) values
  ('${conceptIds["ma50"]}', '${analyses[0].id}', 'Preu per sobre de la MA50 de 1H amb pendent positiu.'),
  ('${conceptIds["ma50"]}', '${analyses[3].id}', 'MA50 plana: sense biaix, no operar.'),
  ('${conceptIds["estructura-de-mercat"]}', '${analyses[4].id}', 'Mínims creixents a 5m.'),
  ('${conceptIds["tendencia"]}', '${analyses[5].id}', 'Tendència baixista: màxims decreixents.'),
  ('${conceptIds["suports-i-resistencies"]}', '${analyses[2].id}', 'Suport respectat dues vegades.'),
  ('${conceptIds["impulsos-i-retrocessos"]}', '${analyses[7].id}', 'Impuls + retrocés a la MA50.');
`);

// ───────── Objectius ─────────
out(`insert into goals (title, kind, target, manual_progress, starts_on, deadline) values
  ('Tancar el mes amb una operació guanyadora', 'winning_trades', 1, 0, date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month - 1 day')::date),
  ('30 dies registrant sense fallar', 'journal_streak', 30, 0, (now() - interval '10 days')::date, (now() + interval '20 days')::date),
  ('Win rate ≥ 50 % aquest mes', 'win_rate', 50, 0, date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month - 1 day')::date),
  ('Llegir 5 conceptes del playbook', 'custom', 5, 2, (now() - interval '15 days')::date, (now() + interval '15 days')::date);

commit;
`);

void Promise.all(images).then(() => {
  writeFileSync(path.join(ROOT, "supabase", "seed.sql"), sql.join("\n"));
  const closed = tradesOut.filter((t) => t.netPnl !== 0);
  console.log(`seed.sql: ${tradesOut.length} operacions, capital final ${round(capital, 2)} €, ${closed.filter((t) => t.netPnl > 0).length}/${closed.length} guanyadores`);
});
