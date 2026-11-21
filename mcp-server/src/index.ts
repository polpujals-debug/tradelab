#!/usr/bin/env node
/**
 * Servidor MCP de TradeLab (stdio).
 * Variables d'entorn: TRADELAB_URL (ex.: https://el-teu-tradelab.vercel.app) i TRADELAB_API_KEY (tl_...).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TradeLabClient } from "./client.js";

const url = process.env.TRADELAB_URL;
const key = process.env.TRADELAB_API_KEY;
if (!url || !key) {
  console.error("Falten TRADELAB_URL i/o TRADELAB_API_KEY a l'entorn del servidor MCP.");
  process.exit(1);
}
const api = new TradeLabClient(url, key);
const server = new McpServer({ name: "tradelab", version: "1.0.0" });

const bias = z.enum(["bullish", "bearish", "neutral"]);
const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const json = (label: string, v: unknown) => text(`${label}\n\n${JSON.stringify(v, null, 2)}`);
const fail = (e: unknown) => ({ content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }], isError: true });

/** Converteix camins locals / base64 / URL en la llista d'imatges que accepta l'API. */
async function images(opts: { image_paths?: string[]; image_base64?: string; image_url?: string; caption?: string }) {
  const out: { media_id?: string; base64?: string; url?: string; caption?: string }[] = [];
  for (const p of opts.image_paths ?? []) out.push({ media_id: await api.uploadFile(p, opts.caption), caption: opts.caption });
  if (opts.image_base64) out.push({ base64: opts.image_base64, caption: opts.caption });
  if (opts.image_url) out.push({ url: opts.image_url, caption: opts.caption });
  return out;
}

server.registerTool(
  "save_analysis",
  {
    title: "Desar anàlisi de gràfic",
    description:
      "Desa a TradeLab una anàlisi tècnica d'un gràfic (normalment de TradingView) amb la captura. Estratègia de l'usuari: 1H biaix, 5m estructura, 1m execució, només MA50. Escriu content_md en català amb les seccions: Què veig, Nivells clau, Escenari, Què invalidaria l'anàlisi.",
    inputSchema: {
      asset: z.string().describe("Parell, ex.: BTC/USDT"),
      timeframes: z.array(z.enum(["1m", "3m", "5m", "15m", "30m", "1H", "2H", "4H", "1D", "1W"])).min(1),
      bias,
      content_md: z.string().min(10).describe("Explicació en Markdown (català)"),
      scenario: z.string().optional().describe("Una frase amb l'escenari i la invalidació"),
      supports: z.array(z.number()).optional(),
      resistances: z.array(z.number()).optional(),
      ma50: z.number().optional(),
      review_in_days: z.number().int().min(1).max(60).optional(),
      title: z.string().optional(),
      trade_id: z.string().uuid().optional(),
      image_paths: z.array(z.string()).optional().describe("Camins locals de les captures (PNG/JPG/WebP)"),
      image_base64: z.string().optional().describe("Captura en base64 si no hi ha fitxer"),
      image_url: z.string().url().optional(),
    },
  },
  async (a) => {
    try {
      const body = {
        asset: a.asset, timeframes: a.timeframes, bias: a.bias, content_md: a.content_md, scenario: a.scenario,
        levels: { supports: a.supports ?? [], resistances: a.resistances ?? [], ma50: a.ma50 ?? null },
        review_in_days: a.review_in_days, title: a.title, trade_id: a.trade_id, source: "claude",
        images: await images({ image_paths: a.image_paths, image_base64: a.image_base64, image_url: a.image_url, caption: `${a.asset} ${a.timeframes[0]}` }),
      };
      const { data } = await api.request<{ id: string; title: string }>("POST", "/analyses", body, { "Idempotency-Key": `mcp-analysis-${a.asset.replace("/", "")}-${new Date().toISOString().slice(0, 16)}` });
      return text(`Anàlisi desada: "${data.title}"\nid: ${data.id}\n${url}/analisis/${data.id}`);
    } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "update_analysis",
  {
    title: "Actualitzar el seguiment d'una anàlisi",
    description: "Marca si l'escenari d'una anàlisi s'ha complert (outcome) o hi afegeix notes.",
    inputSchema: {
      id: z.string().uuid(),
      outcome: z.enum(["pending", "fulfilled", "partial", "failed"]).optional(),
      my_notes: z.string().optional(),
      questions: z.string().optional(),
    },
  },
  async ({ id, ...patch }) => {
    try {
      const { data } = await api.request("PATCH", `/analyses/${id}`, patch);
      return json("Anàlisi actualitzada", data);
    } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "log_trade",
  {
    title: "Registrar operació",
    description: "Registra una operació al diari. La direcció es dedueix de l'stop loss. Si no indiques quantity, es calcula amb risk_pct (o el risc per defecte) sobre el capital actual.",
    inputSchema: {
      asset: z.string(),
      entry_price: z.number().positive(),
      stop_loss: z.number().positive(),
      take_profit: z.number().positive().optional(),
      quantity: z.number().positive().optional(),
      risk_pct: z.number().positive().max(100).optional(),
      status: z.enum(["planned", "open", "closed", "cancelled"]).optional(),
      exit_price: z.number().positive().optional(),
      bias_1h: bias.optional(),
      confirmation_5m: z.string().optional(),
      trigger_1m: z.string().optional(),
      setup: z.string().optional(),
      emotion_before: z.string().optional(),
      errors: z.array(z.string()).optional().describe("Etiquetes d'error, ex.: FOMO, Moure el SL"),
      notes: z.string().optional(),
      analysis_id: z.string().uuid().optional(),
    },
  },
  async ({ errors, ...a }) => {
    try {
      const { data } = await api.request<{ id: string; direction: string; quantity: number; risk_amount: number; risk_pct: number }>("POST", "/trades", {
        ...a, source: "claude", tags: (errors ?? []).map((name) => ({ kind: "error", name })),
      });
      return text(`Operació registrada (${data.direction}).\nid: ${data.id}\nUnitats: ${data.quantity} · Risc: ${data.risk_amount} (${data.risk_pct} %)\n${url}/diari/${data.id}`);
    } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "close_trade",
  {
    title: "Tancar operació",
    description: "Tanca una operació oberta o planificada amb el preu de sortida. El P&L i l'R es calculen automàticament.",
    inputSchema: {
      id: z.string().uuid(),
      exit_price: z.number().positive(),
      exit_at: z.string().optional().describe("ISO 8601; per defecte ara"),
      fees: z.number().min(0).optional(),
      emotion_after: z.string().optional(),
      lesson: z.string().optional(),
    },
  },
  async ({ id, ...a }) => {
    try {
      const { data } = await api.request<{ net_pnl: number; r_multiple: number; pnl_pct: number }>("PATCH", `/trades/${id}`, { ...a, status: "closed" });
      return text(`Operació tancada: P&L ${data.net_pnl} (${data.pnl_pct} % del compte), ${data.r_multiple}R\n${url}/diari/${id}`);
    } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "list_trades",
  {
    title: "Llistar operacions",
    description: "Llista operacions (per trobar l'id d'una operació oberta, revisar resultats, etc.).",
    inputSchema: {
      status: z.enum(["planned", "open", "closed", "cancelled"]).optional(),
      asset: z.string().optional(),
      from: z.string().optional().describe("YYYY-MM-DD"),
      to: z.string().optional().describe("YYYY-MM-DD"),
      limit: z.number().int().min(1).max(100).optional(),
    },
  },
  async (q) => {
    try {
      const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
      const { data } = await api.request<unknown[]>("GET", `/trades?${qs}`);
      return json(`${data.length} operacions`, data);
    } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "publish_market_report",
  {
    title: "Publicar informe de mercat",
    description: "Publica l'informe de mercat diari, setmanal o ad hoc. És idempotent per tipus i data: si ja existeix, no es duplica.",
    inputSchema: {
      type: z.enum(["daily", "weekly", "adhoc"]),
      title: z.string().min(3),
      content_md: z.string().min(20).describe("Markdown en català: Resum, BTC, ETH, Notícies, Pla, Actius a vigilar"),
      summary: z.string().optional(),
      report_date: z.string().optional().describe("YYYY-MM-DD (per defecte avui; setmanal = dilluns)"),
      btc_bias: bias.optional(),
      eth_bias: bias.optional(),
      watchlist: z.array(z.string()).optional(),
      image_paths: z.array(z.string()).optional(),
    },
  },
  async ({ image_paths, ...a }) => {
    try {
      const date = a.report_date ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
      const key = a.type === "adhoc" ? `adhoc-${date}-${a.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}` : `${a.type}-${date}`;
      const { status, data } = await api.request<{ id: string }>("POST", "/reports/market", { ...a, report_date: date, images: await images({ image_paths }) }, { "Idempotency-Key": key });
      return text(`${status === 201 ? "Informe publicat" : "L'informe ja existia (no s'ha duplicat)"}.\nid: ${data.id}\n${url}/informes/${data.id}`);
    } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "get_stats",
  {
    title: "Estadístiques de rendiment",
    description: "Informe de rendiment (P&L, win rate, R, errors principals, lliçons, comparació amb el període anterior). Ideal per fer una revisió setmanal.",
    inputSchema: {
      period: z.enum(["day", "week", "month", "all"]).default("week"),
      date: z.string().optional().describe("YYYY-MM-DD dins del període; per defecte avui"),
      format: z.enum(["md", "json"]).default("md"),
    },
  },
  async ({ period, date, format }) => {
    try {
      const qs = new URLSearchParams({ period, format: period === "all" ? "json" : format, ...(date ? { date } : {}) });
      const { data } = await api.request<unknown>("GET", `/stats?${qs}`);
      return typeof data === "string" ? text(data) : json("Estadístiques", data);
    } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "get_strategy",
  {
    title: "Estratègia i checklist",
    description: "Retorna l'estratègia activa de l'usuari (Markdown), la checklist d'entrada amb els ids de les regles, els paràmetres de risc i el capital actual.",
    inputSchema: {},
  },
  async () => {
    try {
      const { data } = await api.request("GET", "/strategy");
      return json("Estratègia activa", data);
    } catch (e) { return fail(e); }
  },
);

await server.connect(new StdioServerTransport());
console.error(`TradeLab MCP connectat a ${url}`);
