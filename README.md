# TradeLab

Plataforma personal per aprendre trading de criptomonedes de manera disciplinada: diari d'operacions, calculadora de risc, estratègia amb checklist, anàlisis de gràfics que envia Claude des de TradingView, informes de mercat automàtics, estadístiques i aprenentatge.

**Estratègia de base:** 1H per al biaix → 5m per confirmar amb l'estructura → 1m per executar, amb la MA50 com a únic indicador.

## Què hi ha

| Secció | Què fa |
|---|---|
| **Dashboard** | KPIs (P&L total/avui/setmana/mes, win rate, R mitjà, profit factor, drawdown, capital, ratxa), corba de capital, P&L per dia, calendari mensual i el darrer contingut |
| **Diari** | Operacions amb checklist, captures (abans/durant/després), emocions, errors i lliçons. Vista en taula o targetes, amb filtres |
| **Calculadora** | Mida de posició, TP a 1R/2R/3R, avís per sobre del 2 %, risc de ruïna (Monte Carlo) i límits de disciplina |
| **Estratègia** | Playbook en Markdown, checklist editable, versions (v1, v2…) i quines regles et funcionen |
| **Anàlisis** | Galeria de les anàlisis de Claude amb zoom, nivells clau i seguiment de l'escenari |
| **Aprenentatge** | Conceptes amb exemples reals, mode pràctica, revisió d'errors i objectius |
| **Informes de mercat** | Informes diaris i setmanals de la tasca programada, amb llegit/no llegit |
| **Rendiment** | Informes diari/setmanal/mensual comparats amb el període anterior, exportables a Markdown i PDF |
| **API v1 + MCP** | Perquè Claude desi anàlisis, operacions i informes automàticament |

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript estricte · Tailwind CSS 4 · components propis estil shadcn/ui (Radix) · Recharts · Framer Motion · Supabase (PostgreSQL + Storage) · Zod · Vitest · servidor MCP amb `@modelcontextprotocol/sdk`.

## Estructura

```
app/
  (app)/            pàgines (dashboard, diari, calculadora, estrategia, analisis,
                    aprenentatge, informes, rendiment, configuracio, docs/api)
  api/v1/           API per a Claude (analyses, uploads, trades, reports/market, stats, strategy, ping)
features/           lògica per funcionalitat (trades, analyses, market-reports, performance,
                    strategy, learning, settings, calculator, dashboard, api-docs, media)
lib/
  finance/          càlculs financers purs + tests (mida de posició, P&L, R, stats, risc de ruïna)
  api/              autenticació per clau, idempotència, respostes d'error
  media/            validació i processament d'imatges (WebP + miniatura)
  supabase/         client de servidor i tipus generats
supabase/
  migrations/       esquema, vistes de càlcul (v_trade_metrics, v_daily_pnl…) i bucket
  seed.sql          dades d'exemple (generat per scripts/generate-seed.ts)
  clean-demo-data.sql   esborra les dades d'exemple
mcp-server/         servidor MCP (vegeu mcp-server/README.md)
API.md              referència de l'API
CLAUDE_INSTRUCTIONS.md  text per enganxar a Claude
```

**Coherència dels números:** les mètriques de cada operació (P&L, R, risc %, compliment) es calculen en una vista SQL (`v_trade_metrics`) i els agregats (win rate, profit factor, drawdown, ratxa) en `lib/finance`, amb tests. Dashboard, rendiment, API i MCP fan servir el mateix servei (`features/performance/service.ts`). Els dies es tallen a mitjanit d'**Europe/Madrid**.

> Convenció: els preus van en USDT i el P&L es mostra en la moneda del compte (EUR per defecte), considerant 1 USDT ≈ 1 € (paper trading).

## Seguretat (sense login)

- La base de dades només és accessible des del servidor amb la *service role key*. RLS està activat a totes les taules sense cap política pública, de manera que la clau pública de Supabase no pot llegir res.
- L'**API** (`/api/v1`) demana sempre `Authorization: Bearer <clau>`. Les claus es guarden com a hash SHA-256 i es poden revocar.
- La **web** no té contrasenya. Si està publicada, defineix **`APP_ACCESS_TOKEN`**: obre una sola vegada a cada dispositiu `https://LA-TEVA-URL/?acces=<APP_ACCESS_TOKEN>` (desa-ho com a preferit) i quedarà una cookie per a un any. Sense aquest enllaç, la web respon «Accés restringit». Sense `APP_ACCESS_TOKEN`, la web és oberta a qualsevol que en conegui l'adreça.

## Posar-ho en marxa en local

Requisits: Node 20+, Docker (per a Supabase local).

```bash
npm install
```

```bash
npm run db:start
```

`db:start` aixeca Supabase en local i aplica les migracions i el seed. Copia l'URL i la `service_role key` que mostra (o executa `npx supabase status`) a `.env.local`:

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Obre http://localhost:3000. Per crear una clau d'API: **Configuració → Claus d'API**, o `npm run apikey:create -- "Claude xat"`.

## Desplegament (Supabase + Vercel)

### 1. Supabase

1. Crea un projecte a https://supabase.com (regió Europa, per exemple `eu-central-1`).
2. **Opció fàcil (sense instal·lar res):** *SQL Editor → New query*, enganxa `supabase/1-estructura.sql` i prem **Run**. Després, si vols dades d'exemple, fes el mateix amb `supabase/2-dades-exemple.sql`.

   **Opció amb terminal:** aplica les migracions des del teu ordinador:

   ```bash
   npx supabase login
   ```

   ```bash
   npx supabase link --project-ref <ID_DEL_PROJECTE>
   ```

   ```bash
   npx supabase db push
   ```

   Això crea totes les taules, les vistes, l'RLS i el bucket `media` per a les captures.
3. **Dades d'exemple (opcional):** obre *SQL Editor*, enganxa `supabase/seed.sql` i executa'l. Quan vulguis començar de debò, executa `supabase/clean-demo-data.sql`.
4. A *Project Settings → API*, copia la **Project URL** i la **service_role key**.

### 2. Vercel

1. Importa el repositori de GitHub a https://vercel.com/new.
2. A *Environment Variables*, afegeix:

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | la Project URL de Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | la service_role key (**secreta**) |
   | `SUPABASE_STORAGE_BUCKET` | `media` |
   | `APP_ACCESS_TOKEN` | una cadena llarga aleatòria (`openssl rand -hex 24`) |
   | `NEXT_PUBLIC_APP_URL` | opcional, la URL final (`https://…vercel.app`) |

3. Fes *Deploy*. Després obre `https://LA-TEVA-URL/?acces=<APP_ACCESS_TOKEN>` des de l'ordinador i des del mòbil.

### 3. Connectar Claude

1. A TradeLab, **Configuració → Claus d'API**: crea una clau per al xat i una altra per a la tasca programada.
2. Obre **API** al menú (`/docs/api`) → *Instruccions per a Claude* → **Copiar instruccions**. El text ja porta la teva URL; només hi has de posar la clau.
3. Enganxa'l a Claude (al projecte o a les instruccions de la tasca programada).
   - **Anàlisi d'un gràfic:** «Analitza el BTC a 1H i 5m, fes una captura i desa-la a TradeLab.»
   - **Tasca programada:** cada matí, «Genera l'informe diari de mercat i publica'l a TradeLab» (fa servir `Idempotency-Key: daily-AAAA-MM-DD`, de manera que mai es duplica).
   - **Revisió setmanal:** «Llegeix les meves estadístiques de la setmana a TradeLab i fes-me una revisió.»
4. **Alternativa amb eines (MCP):** a Claude Desktop o Claude Code, configura `mcp-server/` (vegeu el seu README). Claude tindrà eines com `save_analysis` o `publish_market_report`, i podrà pujar captures directament des d'un fitxer.

> Al pla gratuït de Vercel, el cos d'una petició no pot superar els **4,5 MB**. Les captures del formulari web es comprimeixen al navegador. Per API, les captures molt grans s'han d'enviar per `url` o pujar abans a `/uploads` (el servidor MCP ja ho fa sol).

## Scripts

| Script | Què fa |
|---|---|
| `npm run dev` / `build` / `start` | Desenvolupament, build i producció |
| `npm test` | Tests de Vitest (càlculs financers, dates, objectius, validació) |
| `npm run typecheck` / `lint` | TypeScript i ESLint |
| `npm run db:start` / `db:reset` | Supabase local; `db:reset` torna a aplicar migracions i seed |
| `npm run db:types` | Regenera `lib/supabase/database.types.ts` |
| `npm run seed:generate` | Regenera `supabase/seed.sql` i les captures de `public/seed/` |
| `npm run docs:generate` | Regenera `API.md` i `CLAUDE_INSTRUCTIONS.md` |
| `npm run apikey:create -- "nom"` | Crea una clau d'API des de la terminal |

## Llicència

Ús personal.
