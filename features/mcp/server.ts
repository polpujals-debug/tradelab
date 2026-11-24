import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { checkDiscipline } from "@/lib/finance";
import { db, must } from "@/lib/supabase/server";
import { analysisCreateSchema, analysisUpdateSchema } from "@/features/analyses/schemas";
import { createAnalysis, updateAnalysis } from "@/features/analyses/service";
import { attachImages } from "@/features/media/images";
import { marketReportCreateSchema } from "@/features/market-reports/schemas";
import { publishMarketReport } from "@/features/market-reports/service";
import { reportToMarkdown } from "@/features/performance/markdown";
import { getDashboard, getPerformanceReport } from "@/features/performance/service";
import { getDefaultAccount, getSettings } from "@/features/settings/queries";
import { getTradeDTO } from "@/features/trades/dto";
import { tradeCreateSchema } from "@/features/trades/schemas";
import { closeTrade, createTrade, disciplineState } from "@/features/trades/service";
import type { ImageInput } from "@/features/media/images-schema";

const bias = z.enum(["bullish", "bearish", "neutral"]);
const imageUrl = z.string().url().optional().describe("Enllaç de la captura: enllaç de TradingView (Captura → Copia l'enllaç, https://www.tradingview.com/x/...) o URL d'una imatge PNG/JPG/WebP");
const imageB64 = z.string().optional().describe("Captura en base64 (PNG/JPG/WebP), només si no tens un enllaç");

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const fail = (e: unknown) => {
  const msg = e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : e instanceof Error ? e.message : String(e);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
};
const fmt = (v: number | null | undefined, d = 2) => (v == null ? "—" : Number(v).toLocaleString("ca-ES", { minimumFractionDigits: d, maximumFractionDigits: d }));
const images = (url?: string, b64?: string, caption?: string): ImageInput[] => [
  ...(url ? [{ url, caption }] : []),
  ...(b64 ? [{ base64: b64, caption }] : []),
];
const refresh = () => revalidatePath("/", "layout");

async function activeRules() {
  const s = await db().from("strategies").select("id").eq("is_active", true).maybeSingle();
  if (!s.data) return [];
  return must(await db().from("strategy_rules").select("id, text, is_required").eq("strategy_id", s.data.id).order("sort_order"), "Regles");
}

/** Crea el servidor MCP de TradeLab (un per petició: Vercel és sense estat). */
export function buildMcpServer(baseUrl: string) {
  const server = new McpServer(
    { name: "tradelab", version: "1.0.0" },
    {
      instructions:
        "TradeLab és el diari de trading de l'usuari (català, zona Europe/Madrid). Estratègia: 1H biaix, 5m estructura, 1m execució, MA50 com a únic indicador. " +
        "Flux habitual: abans d'entrar, fes una captura de TradingView i crida open_trade amb before_image_url; quan l'usuari digui que ha tancat, fes una altra captura i crida close_trade amb after_image_url i el preu de sortida. " +
        "Consulta get_account abans d'obrir per conèixer el capital, el risc per defecte i la checklist. Respon sempre en català.",
    },
  );

  server.registerTool(
    "get_account",
    {
      title: "Estat del compte i estratègia",
      description: "Capital actual, P&L d'avui i de la setmana, límits de disciplina, risc per defecte i la checklist d'entrada de l'estratègia activa (amb els ids de les regles).",
      inputSchema: {},
    },
    async () => {
      try {
        const [account, settings, rules] = await Promise.all([getDefaultAccount(), getSettings(), activeRules()]);
        const state = await disciplineState(account.id);
        const alerts = checkDiscipline({ maxDailyLoss: settings.max_daily_loss == null ? null : Number(settings.max_daily_loss), maxWeeklyLoss: settings.max_weekly_loss == null ? null : Number(settings.max_weekly_loss), maxTradesPerDay: settings.max_trades_per_day }, state);
        return text([
          `Compte: ${account.name} (${account.type})`,
          `Capital actual: ${fmt(account.currentCapital)} ${account.currency} (inicial ${fmt(account.initialCapital)})`,
          `P&L avui: ${fmt(state.todayPnl)} · setmana: ${fmt(state.weekPnl)} · operacions avui: ${state.tradesToday}`,
          `Risc per defecte: ${fmt(Number(settings.default_risk_pct))} % (${fmt((account.currentCapital * Number(settings.default_risk_pct)) / 100)} ${account.currency} per operació)`,
          alerts.length ? `⚠️ Disciplina: ${alerts.map((a) => `${a.code} ${a.level} (${a.current}/${a.limit})`).join(", ")}` : "Disciplina: tot dins dels límits.",
          "",
          "Checklist d'entrada (id · regla):",
          ...rules.map((r) => `- ${r.id} · ${r.text}${r.is_required ? " (obligatòria)" : ""}`),
        ].join("\n"));
      } catch (e) { return fail(e); }
    },
  );

  server.registerTool(
    "open_trade",
    {
      title: "Obrir (o planificar) una operació",
      description: "Registra una operació al Diari amb la captura d'ABANS d'entrar. La direcció es dedueix de l'stop loss. Si no indiques quantity, es calcula amb el risc per defecte sobre el capital actual.",
      inputSchema: {
        asset: z.string().describe("Parell, ex.: BTC/USDT"),
        entry_price: z.number().positive(),
        stop_loss: z.number().positive(),
        take_profit: z.number().positive().optional(),
        quantity: z.number().positive().optional().describe("Unitats exactes posades a TradingView"),
        risk_pct: z.number().positive().max(100).optional(),
        status: z.enum(["open", "planned"]).default("open"),
        bias_1h: bias.optional(),
        confirmation_5m: z.string().optional(),
        trigger_1m: z.string().optional(),
        setup: z.string().optional(),
        emotion_before: z.string().optional(),
        checklist_passed: z.array(z.string()).optional().describe("Regles de la checklist complertes: ids o text de les regles (vegeu get_account)"),
        errors: z.array(z.string()).optional().describe("Errors, ex.: FOMO, Entrada precipitada"),
        notes: z.string().optional(),
        analysis_id: z.string().uuid().optional(),
        before_image_url: imageUrl,
        before_image_base64: imageB64,
      },
    },
    async (a) => {
      try {
        const rules = await activeRules();
        const passed = new Set(
          (a.checklist_passed ?? []).flatMap((p) => {
            const q = p.trim().toLowerCase();
            return rules.filter((r) => r.id === p || r.text.toLowerCase().includes(q) || q.includes(r.text.toLowerCase())).map((r) => r.id);
          }),
        );
        const input = tradeCreateSchema.parse({
          asset: a.asset, entry_price: a.entry_price, stop_loss: a.stop_loss, take_profit: a.take_profit ?? null, quantity: a.quantity,
          risk_pct: a.risk_pct, status: a.status, bias_1h: a.bias_1h ?? null, confirmation_5m: a.confirmation_5m ?? null,
          trigger_1m: a.trigger_1m ?? null, setup: a.setup ?? null, emotion_before: a.emotion_before ?? null, notes: a.notes ?? null,
          analysis_id: a.analysis_id ?? null, source: "claude",
          rule_checks: a.checklist_passed ? rules.map((r) => ({ rule_id: r.id, passed: passed.has(r.id) })) : undefined,
          tags: (a.errors ?? []).map((name) => ({ kind: "error" as const, name })),
        });
        const { id } = await createTrade(input);
        const imgs = images(a.before_image_url, a.before_image_base64, "Abans d'entrar");
        let imgNote = "";
        if (imgs.length) {
          try { await attachImages("trade", id, "before", imgs, "trades"); imgNote = "Captura d'abans desada."; }
          catch (e) { imgNote = `⚠️ No s'ha pogut desar la captura: ${e instanceof Error ? e.message : e}`; }
        }
        refresh();
        const t = await getTradeDTO(id);
        return text([
          `Operació ${t?.status === "planned" ? "planificada" : "oberta"}: ${t?.asset} ${t?.direction}`,
          `id: ${id}`,
          `Entrada ${t?.entry_price} · SL ${t?.stop_loss}${t?.take_profit ? ` · TP ${t.take_profit}` : ""}`,
          `Unitats: ${t?.quantity} · Risc: ${fmt(t?.risk_amount)} (${fmt(t?.risk_pct)} % del compte)${t?.planned_rr ? ` · R:R 1:${fmt(t.planned_rr)}` : ""}`,
          t?.compliance_pct != null ? `Checklist: ${fmt(t.compliance_pct, 0)} %` : "",
          imgNote,
          `${baseUrl}/diari/${id}`,
        ].filter(Boolean).join("\n"));
      } catch (e) { return fail(e); }
    },
  );

  server.registerTool(
    "list_open_trades",
    {
      title: "Operacions obertes i planificades",
      description: "Llista les operacions obertes o planificades (per saber quina tancar).",
      inputSchema: {},
    },
    async () => {
      try {
        const rows = must(await db().from("v_trade_metrics").select("id, symbol, direction, status, entry_price, stop_loss, take_profit, quantity, entry_at, created_at").in("status", ["open", "planned"]).order("created_at", { ascending: false }), "Operacions");
        if (!rows.length) return text("No hi ha cap operació oberta ni planificada.");
        return text(rows.map((r) => `- ${r.id} · ${r.symbol} ${r.direction} (${r.status}) · entrada ${r.entry_price} · SL ${r.stop_loss}${r.take_profit ? ` · TP ${r.take_profit}` : ""} · ${r.quantity} u.`).join("\n"));
      } catch (e) { return fail(e); }
    },
  );

  server.registerTool(
    "close_trade",
    {
      title: "Tancar una operació",
      description: "Tanca una operació amb el preu de sortida i la captura de DESPRÉS. Calcula el P&L i l'R i actualitza el capital. Si no indiques id, tanca l'operació oberta més recent de l'actiu indicat.",
      inputSchema: {
        id: z.string().uuid().optional(),
        asset: z.string().optional().describe("Si no saps l'id: l'actiu de l'operació oberta, ex.: BTC/USDT"),
        exit_price: z.number().positive(),
        fees: z.number().min(0).optional(),
        emotion_after: z.string().optional(),
        lesson: z.string().optional(),
        after_image_url: imageUrl,
        after_image_base64: imageB64,
      },
    },
    async (a) => {
      try {
        let id = a.id;
        if (!id) {
          let q = db().from("v_trade_metrics").select("id, symbol").in("status", ["open", "planned"]).order("created_at", { ascending: false });
          if (a.asset) q = q.eq("symbol", a.asset.toUpperCase().includes("/") ? a.asset.toUpperCase() : a.asset.toUpperCase().replace(/(USDT|USDC|USD|EUR)$/, "/$1"));
          const open = must(await q, "Operacions obertes");
          if (open.length === 0) return fail(new Error("No he trobat cap operació oberta" + (a.asset ? ` de ${a.asset}` : "") + ". Fes servir list_open_trades."));
          if (open.length > 1 && !a.asset) return fail(new Error(`Hi ha ${open.length} operacions obertes: indica l'id o l'actiu (${open.map((o) => o.symbol).join(", ")}).`));
          id = open[0].id!;
        }
        await closeTrade(id, { exit_price: a.exit_price, fees: a.fees, emotion_after: a.emotion_after, lesson: a.lesson, exit_at: new Date().toISOString() });
        const imgs = images(a.after_image_url, a.after_image_base64, "Resultat");
        let imgNote = "";
        if (imgs.length) {
          try { await attachImages("trade", id, "after", imgs, "trades"); imgNote = "Captura de després desada."; }
          catch (e) { imgNote = `⚠️ No s'ha pogut desar la captura: ${e instanceof Error ? e.message : e}`; }
        }
        refresh();
        const [t, account] = await Promise.all([getTradeDTO(id), getDefaultAccount()]);
        const pnl = Number(t?.net_pnl ?? 0);
        return text([
          `Operació tancada: ${t?.asset} ${t?.direction} · sortida ${a.exit_price}`,
          `Resultat: ${pnl >= 0 ? "+" : ""}${fmt(pnl)} ${account.currency} (${pnl >= 0 ? "+" : ""}${fmt(t?.pnl_pct)} % · ${fmt(t?.r_multiple)}R)`,
          `Capital actual: ${fmt(account.currentCapital)} ${account.currency}`,
          imgNote,
          `${baseUrl}/diari/${id}`,
        ].filter(Boolean).join("\n"));
      } catch (e) { return fail(e); }
    },
  );

  server.registerTool(
    "save_analysis",
    {
      title: "Desar una anàlisi de gràfic",
      description: "Desa una anàlisi tècnica amb la captura. content_md en català: Què veig (1H i 5m), Nivells clau, Escenari, Què invalidaria l'anàlisi.",
      inputSchema: {
        asset: z.string(),
        timeframes: z.array(z.enum(["1m", "3m", "5m", "15m", "30m", "1H", "2H", "4H", "1D", "1W"])).min(1),
        bias,
        content_md: z.string().min(10),
        scenario: z.string().optional(),
        supports: z.array(z.number()).optional(),
        resistances: z.array(z.number()).optional(),
        ma50: z.number().optional(),
        review_in_days: z.number().int().min(1).max(60).optional(),
        image_url: imageUrl,
        image_base64: imageB64,
      },
    },
    async (a) => {
      try {
        const input = analysisCreateSchema.parse({
          asset: a.asset, timeframes: a.timeframes, bias: a.bias, content_md: a.content_md, scenario: a.scenario,
          levels: { supports: a.supports ?? [], resistances: a.resistances ?? [], ma50: a.ma50 ?? null },
          review_in_days: a.review_in_days, images: images(a.image_url, a.image_base64, `${a.asset} ${a.timeframes[0]}`), source: "claude",
        });
        const r = await createAnalysis(input);
        refresh();
        return text(`Anàlisi desada: ${r?.title}\nid: ${r?.id}\n${baseUrl}/analisis/${r?.id}`);
      } catch (e) { return fail(e); }
    },
  );

  server.registerTool(
    "update_analysis",
    {
      title: "Seguiment d'una anàlisi",
      description: "Marca si l'escenari s'ha complert o hi afegeix notes.",
      inputSchema: { id: z.string().uuid(), outcome: z.enum(["pending", "fulfilled", "partial", "failed"]).optional(), my_notes: z.string().optional() },
    },
    async ({ id, ...patch }) => {
      try {
        await updateAnalysis(id, analysisUpdateSchema.parse(patch));
        refresh();
        return text(`Anàlisi actualitzada.\n${baseUrl}/analisis/${id}`);
      } catch (e) { return fail(e); }
    },
  );

  server.registerTool(
    "publish_market_report",
    {
      title: "Publicar informe de mercat",
      description: "Publica l'informe de mercat diari, setmanal o ad hoc (no es duplica si ja existeix el mateix tipus i data).",
      inputSchema: {
        type: z.enum(["daily", "weekly", "adhoc"]),
        title: z.string().min(3),
        content_md: z.string().min(20),
        summary: z.string().optional(),
        report_date: z.string().optional().describe("YYYY-MM-DD; per defecte avui"),
        btc_bias: bias.optional(),
        eth_bias: bias.optional(),
        watchlist: z.array(z.string()).optional(),
        image_url: imageUrl,
      },
    },
    async ({ image_url, ...a }) => {
      try {
        const date = a.report_date ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
        const key = a.type === "adhoc" ? null : `${a.type}-${date}`;
        const input = marketReportCreateSchema.parse({ ...a, report_date: date, images: images(image_url) });
        const { report, created } = await publishMarketReport(input, key);
        refresh();
        return text(`${created ? "Informe publicat" : "L'informe ja existia (no s'ha duplicat)"}.\n${baseUrl}/informes/${report?.id}`);
      } catch (e) { return fail(e); }
    },
  );

  server.registerTool(
    "get_stats",
    {
      title: "Estadístiques de rendiment",
      description: "Informe de rendiment en Markdown (P&L, win rate, R, errors, lliçons, comparació amb el període anterior). Per a una revisió.",
      inputSchema: { period: z.enum(["day", "week", "month"]).default("week") },
    },
    async ({ period }) => {
      try {
        const report = await getPerformanceReport(period === "day" ? "daily" : period === "week" ? "weekly" : "monthly");
        const d = await getDashboard("all");
        return text(`${reportToMarkdown(report)}\n\nCapital actual: ${fmt(d.totals.currentCapital)} · P&L total: ${fmt(d.totals.netPnl)} · ratxa: ${d.totals.streak} dies`);
      } catch (e) { return fail(e); }
    },
  );

  return server;
}
