/**
 * Font única de la documentació de l'API.
 * - La pàgina /docs/api la mostra amb la URL real del desplegament.
 * - `npm run docs:generate` escriu API.md i CLAUDE_INSTRUCTIONS.md.
 */

const ANALYSIS_EXAMPLE = {
  asset: "BTC/USDT",
  timeframes: ["1H", "5m"],
  bias: "bullish",
  levels: { supports: [91200, 90500], resistances: [93400], ma50: 91850 },
  scenario: "Continuació alcista cap a 93.400 mentre aguanti 91.200",
  content_md: "### Què veig\n- **1H:** preu per sobre de la MA50, pendent positiu.\n- **5m:** màxims i mínims creixents, retrocés ordenat a la MA50.\n\n### Escenari\nBusco llargs en el retrocés a 91.200–91.400 amb gatell a 1m.\n\n### Invalidació\nTancament de 1H per sota de la MA50.",
  review_in_days: 3,
  images: [{ base64: "<CAPTURA_EN_BASE64>", caption: "BTCUSDT 1H" }],
};

const REPORT_EXAMPLE = {
  type: "daily",
  title: "Informe diari · BTC alcista sobre la MA50",
  summary: "BTC aguanta la MA50 de 1H; ETH sense direcció. Dades d'inflació a les 14:30.",
  report_date: "2026-11-21",
  btc_bias: "bullish",
  eth_bias: "neutral",
  watchlist: ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
  content_md: "## Resum del mercat\n...\n\n## BTC/USDT\n- **Biaix 1H:** alcista\n- **MA50 (1H):** 91.850 (preu per sobre)\n- **Suports:** 91.200 · 90.500\n- **Resistències:** 93.400\n\n## ETH/USDT\n...\n\n## Notícies i esdeveniments\n- ...\n\n## Pla per avui\n1. ...\n\n## Actius a vigilar\n- SOL/USDT",
};

const TRADE_EXAMPLE = {
  asset: "ETH/USDT",
  entry_price: 3150,
  stop_loss: 3135,
  take_profit: 3190,
  risk_pct: 2,
  status: "open",
  bias_1h: "bullish",
  confirmation_5m: "Màxims i mínims creixents a 5m",
  trigger_1m: "Trencament del mínim del retrocés",
  setup: "Retrocés a MA50",
  emotion_before: "Calma",
  tags: [{ kind: "error", name: "Entrada precipitada" }],
  notes: "Entrada a la MA50 de 5m",
};

const j = (v: unknown) => JSON.stringify(v, null, 2);

export function apiReference(base: string): string {
  return `# TradeLab · API v1

Base URL: \`${base}/api/v1\`

## Autenticació
Totes les rutes necessiten la capçalera:

\`\`\`
Authorization: Bearer <API_KEY>
\`\`\`

Les claus es creen a **Configuració → Claus d'API** (o amb \`npm run apikey:create -- "nom"\`). Comencen per \`tl_\`, només es mostren una vegada i es poden revocar. Prova-la:

\`\`\`bash
curl -s ${base}/api/v1/ping -H "Authorization: Bearer $TRADELAB_KEY"
\`\`\`

## Format de les respostes
- Èxit: \`{ "data": ... }\` amb codi 200 o 201.
- Error: \`{ "error": { "code": "validation_error", "message": "...", "details": [ { "path": "bias", "message": "..." } ] } }\`

| Codi | Quan |
|---|---|
| 400 \`validation_error\` / \`invalid_json\` | Cos o paràmetres invàlids (\`details\` diu quin camp) |
| 401 \`unauthorized\` / \`key_revoked\` | Falta la clau, és incorrecta o està revocada |
| 404 \`not_found\` | L'id no existeix |
| 409 \`idempotency_conflict\` | Mateixa \`Idempotency-Key\` amb un cos diferent |
| 413 / 415 \`invalid_image\` | Imatge massa gran (> 10 MB) o format no suportat |
| 500 \`internal_error\` | Error del servidor |

## Idempotència
Les rutes POST accepten la capçalera opcional \`Idempotency-Key\` (1–200 caràcters \`[A-Za-z0-9_-:.]\`). Si repeteixes la petició amb la mateixa clau, reps la resposta original (capçalera \`Idempotent-Replayed: true\`) i **no es crea cap duplicat**. Recomanat per a la tasca programada: \`Idempotency-Key: daily-2026-11-21\`.

## Imatges
PNG, JPG o WebP fins a 10 MB. Es converteixen a WebP i es genera una miniatura de 480 px. Una imatge es pot enviar de tres maneres:
- \`{ "base64": "iVBORw0..." }\` (també s'accepta \`data:image/png;base64,...\`)
- \`{ "url": "https://..." }\` (URL pública)
- \`{ "media_id": "uuid" }\` (d'una pujada prèvia a \`/uploads\`)

> Al pla gratuït de Vercel el cos d'una petició té un límit de **4,5 MB**. Per a captures molt grans, puja-les primer amb \`/uploads\` en multipart, o envia una \`url\`.

## Endpoints

| Mètode | Ruta | Ús |
|---|---|---|
| GET | \`/ping\` | Comprovar la clau |
| POST | \`/analyses\` | Crear anàlisi (Markdown + metadades + imatges) |
| GET | \`/analyses?asset=&timeframe=&bias=&outcome=&from=&to=&limit=\` | Llistar anàlisis |
| GET | \`/analyses/:id\` | Una anàlisi |
| PATCH | \`/analyses/:id\` | Actualitzar seguiment / resultat |
| POST | \`/uploads\` | Pujar una captura → \`media_id\` + URL |
| POST | \`/trades\` | Crear operació |
| GET | \`/trades?status=&asset=&direction=&result=&from=&to=&limit=\` | Llistar operacions |
| GET | \`/trades/:id\` | Una operació (amb checklist i captures) |
| PATCH | \`/trades/:id\` | Actualitzar / tancar operació |
| POST | \`/reports/market\` | Publicar informe de mercat |
| GET | \`/reports/market?type=&unread=&limit=\` | Llistar informes |
| GET | \`/reports/market/:id\` | Un informe |
| GET | \`/stats?period=day\\|week\\|month\\|all&date=&format=json\\|md\` | Estadístiques de rendiment |
| GET | \`/strategy\` | Estratègia activa, checklist i paràmetres de risc |

Totes les dates són ISO 8601. Els dies (\`from\`, \`to\`, \`date\`) són \`YYYY-MM-DD\` en hora d'**Europe/Madrid**.

---

### POST /analyses
Camps:
- \`asset\` (obligatori): \`BTC/USDT\`, també accepta \`BTCUSDT\`
- \`timeframes\` (obligatori): array amb valors de \`1m 3m 5m 15m 30m 1H 2H 4H 1D 1W\`
- \`bias\` (obligatori): \`bullish | bearish | neutral\`
- \`content_md\` (obligatori): l'explicació en Markdown
- \`levels\`: \`{ supports: number[], resistances: number[], ma50: number }\`
- \`scenario\`: una frase amb l'escenari plantejat
- \`review_in_days\`: quan s'ha de revisar si s'ha complert (per defecte 3)
- \`title\`: si no s'envia, es genera
- \`analyzed_at\`: ISO, per defecte ara
- \`trade_id\`: vincula l'anàlisi a una operació
- \`images\`: fins a 6, vegeu *Imatges*
- \`source\`: \`claude\` (per defecte) o \`manual\`

\`\`\`json
${j(ANALYSIS_EXAMPLE)}
\`\`\`

\`\`\`bash
curl -s -X POST ${base}/api/v1/analyses \\
  -H "Authorization: Bearer $TRADELAB_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: analysis-btc-2026-11-21T10:30" \\
  -d @analisi.json
\`\`\`

Resposta \`201\`: l'anàlisi completa amb \`id\`, \`images[].url\` i \`images[].thumb_url\`.

### PATCH /analyses/:id
Seguiment: \`outcome\` (\`pending | fulfilled | partial | failed\`), \`my_notes\`, \`questions\`, \`review_at\` (\`YYYY-MM-DD\`), \`scenario\`, \`bias\`, \`levels\`, \`content_md\`, \`trade_id\` (o \`null\`), \`images\` (s'afegeixen).

\`\`\`bash
curl -s -X PATCH ${base}/api/v1/analyses/<ID> \\
  -H "Authorization: Bearer $TRADELAB_KEY" -H "Content-Type: application/json" \\
  -d '{"outcome":"fulfilled","my_notes":"El retrocés va respectar la MA50"}'
\`\`\`

### POST /uploads
\`\`\`bash
# multipart
curl -s -X POST ${base}/api/v1/uploads -H "Authorization: Bearer $TRADELAB_KEY" \\
  -F "file=@captura.png" -F "caption=BTC 1H"

# JSON
curl -s -X POST ${base}/api/v1/uploads -H "Authorization: Bearer $TRADELAB_KEY" \\
  -H "Content-Type: application/json" -d '{"url":"https://exemple.com/captura.png"}'
\`\`\`
Resposta \`201\`: \`{ "data": { "media_id": "...", "url": "...", "thumb_url": "...", "width": 1280, "height": 720 } }\`

### POST /trades
Obligatoris: \`asset\`, \`entry_price\`, \`stop_loss\`. La direcció es dedueix de l'SL (per sota = long). Si no envies \`quantity\`, es calcula amb \`risk_pct\` (o el risc per defecte) sobre el capital actual.

Opcionals: \`status\` (\`planned | open | closed | cancelled\`, per defecte \`open\`), \`take_profit\`, \`exit_price\`, \`entry_at\`, \`exit_at\`, \`leverage\`, \`fees\`, \`bias_1h\`, \`confirmation_5m\`, \`trigger_1m\`, \`setup\`, \`emotion_before\`, \`emotion_after\`, \`notes\`, \`lesson\`, \`analysis_id\`, \`rule_checks\` (\`[{ rule_id, passed }]\`, ids de \`GET /strategy\`), \`tags\` (\`[{ kind: "error"|"emotion"|"setup", name }]\`).

\`\`\`json
${j(TRADE_EXAMPLE)}
\`\`\`

\`\`\`bash
curl -s -X POST ${base}/api/v1/trades \\
  -H "Authorization: Bearer $TRADELAB_KEY" -H "Content-Type: application/json" -d @operacio.json
\`\`\`

### PATCH /trades/:id (tancar)
Si envies \`exit_price\` sense \`status\`, l'operació es tanca. El P&L, l'R i el % es calculen sols.
\`\`\`bash
curl -s -X PATCH ${base}/api/v1/trades/<ID> \\
  -H "Authorization: Bearer $TRADELAB_KEY" -H "Content-Type: application/json" \\
  -d '{"exit_price":3180,"fees":0.4,"emotion_after":"Calma","lesson":"Vaig deixar córrer fins al TP"}'
\`\`\`

### POST /reports/market
Obligatoris: \`type\` (\`daily | weekly | adhoc\`), \`title\`, \`content_md\`. Opcionals: \`summary\`, \`report_date\` (per defecte avui), \`btc_bias\`, \`eth_bias\`, \`watchlist\`, \`images\`.
Amb \`Idempotency-Key\`, una repetició retorna l'informe existent amb codi \`200\` (en lloc de \`201\`).

\`\`\`json
${j(REPORT_EXAMPLE)}
\`\`\`

\`\`\`bash
curl -s -X POST ${base}/api/v1/reports/market \\
  -H "Authorization: Bearer $TRADELAB_KEY" -H "Content-Type: application/json" \\
  -H "Idempotency-Key: daily-2026-11-21" -d @informe.json
\`\`\`

### GET /stats
- \`period=day|week|month\`: informe complet del període que conté \`date\` (per defecte avui): resum, comparació amb el període anterior, millor/pitjor operació, errors principals (amb el cost), rendiment per actiu, lliçons i llista d'operacions. També retorna \`totals\` (P&L total, avui, setmana, mes, capital actual, ratxa, drawdown).
- \`period=all\`: estadístiques des de l'inici.
- \`format=md\`: el mateix informe en Markdown (ideal per a una revisió setmanal amb Claude).

\`\`\`bash
curl -s "${base}/api/v1/stats?period=week&format=md" -H "Authorization: Bearer $TRADELAB_KEY"
\`\`\`

### GET /strategy
Retorna l'estratègia activa (descripció en Markdown, temporalitats, indicadors), la checklist (\`rules[]\` amb \`id\`, \`text\`, \`is_required\`), els paràmetres de risc i el capital actual.
`;
}

export function claudeInstructions(base: string): string {
  return `# Connector de Claude (la manera més fàcil)

1. A TradeLab, **Configuració → Claus d'API → Crear** (nom: «Connector Claude») i copia l'**adreça del connector** (\`${base}/api/mcp/tl_...\`).
2. A Claude (web o app d'escriptori): **Configuració → Connectors → Afegeix un connector personalitzat**. Nom: **TradeLab**. URL: l'adreça del connector. Desa.
3. En un xat, activa el connector **TradeLab** (icona d'eines) i ja el pots fer servir també des del mòbil.

**Eines que tindrà Claude:** \`get_account\`, \`open_trade\`, \`close_trade\`, \`list_open_trades\`, \`save_analysis\`, \`update_analysis\`, \`publish_market_report\`, \`get_stats\`.

**Rutina en un xat amb TradingView:**
- «Entro long a BTC a 92.000 amb SL a 91.600 i TP a 92.800. Fes una captura del gràfic i registra l'operació a TradeLab.» → Claude fa la captura (enllaç de TradingView) i crida \`open_trade\` amb la captura d'abans.
- «He tancat a 92.800. Fes la captura i tanca-la a TradeLab.» → Claude crida \`close_trade\` amb la captura de després: el P&L se suma al capital i queda al Diari.

> Les captures s'envien millor com a **enllaç de TradingView** (*Captura → Copia l'enllaç*, \`https://www.tradingview.com/x/...\`): TradeLab en descarrega la imatge.

---

# Instruccions per a Claude · TradeLab

Enganxa aquest text a Claude (xat o tasca programada). Substitueix \`<API_KEY>\` per una clau creada a **TradeLab → Configuració → Claus d'API** (fes servir una clau per al xat i una altra per a la tasca programada).

---

Tens accés a la meva plataforma de trading **TradeLab** per API.

- **Base URL:** \`${base}/api/v1\`
- **Capçaleres a totes les crides:** \`Authorization: Bearer <API_KEY>\` i \`Content-Type: application/json\`
- **Zona horària:** Europe/Madrid. Escriu sempre en **català**.
- Si una crida falla, la resposta \`{"error":{"code","message","details"}}\` diu exactament quin camp corregir; corregeix-lo i torna-ho a provar **una** vegada.

## La meva estratègia (tingues-la en compte sempre)
- **1H → biaix** (on aniran les properes espelmes), **5m → confirmació** amb l'estructura (tendència, impulsos, retrocessos), **1m → execució**.
- Únic indicador: **MA50**. Per sobre → només llargs; per sota → només curts; preu enganxat i MA plana → no operar.
- Pots llegir la versió actual i la checklist amb \`GET ${base}/api/v1/strategy\`.

## A) Quan et demani que analitzis un gràfic de TradingView
1. Analitza el gràfic seguint la meva estratègia i fes-ne una **captura**.
2. Explica'm què veus en Markdown amb aquestes seccions: **Què veig** (1H i 5m), **Nivells clau**, **Escenari**, **Què invalidaria l'anàlisi**.
3. **Desa-la a TradeLab** amb \`POST ${base}/api/v1/analyses\` i aquest JSON exacte:

\`\`\`json
{
  "asset": "BTC/USDT",
  "timeframes": ["1H", "5m"],
  "bias": "bullish | bearish | neutral",
  "levels": { "supports": [91200], "resistances": [93400], "ma50": 91850 },
  "scenario": "Una frase amb l'escenari i el nivell que l'invalida",
  "content_md": "### Què veig\\n- **1H:** ...\\n- **5m:** ...\\n\\n### Nivells clau\\n- ...\\n\\n### Escenari\\n...\\n\\n### Què invalidaria l'anàlisi\\n...",
  "review_in_days": 3,
  "images": [{ "base64": "<CAPTURA_PNG_EN_BASE64>", "caption": "BTCUSDT 1H" }]
}
\`\`\`

Regles:
- \`timeframes\` només pot contenir: \`1m 3m 5m 15m 30m 1H 2H 4H 1D 1W\`.
- Els preus van com a números (sense separador de milers): \`91850\`, no \`"91.850"\`.
- La captura va en base64 (sense salts de línia). Si és més gran de 4 MB, primer puja-la amb \`POST ${base}/api/v1/uploads\` (multipart, camp \`file\`) i després envia \`"images": [{ "media_id": "<id retornat>" }]\`.
- Afegeix la capçalera \`Idempotency-Key: analysis-<ACTIU>-<data i hora ISO>\` perquè un reintent no dupliqui l'anàlisi.
- Quan acabi, digues-me l'\`id\` i l'enllaç: \`${base}/analisis/<id>\`.

## B) Tasca programada: informe de mercat
Cada dia (i el dilluns, un de setmanal) publica l'informe amb \`POST ${base}/api/v1/reports/market\`.

**Capçalera obligatòria:** \`Idempotency-Key: daily-YYYY-MM-DD\` (o \`weekly-YYYY-MM-DD\` amb la data del dilluns). Així, si la tasca s'executa dues vegades, no es duplica.

\`\`\`json
{
  "type": "daily",
  "title": "Informe diari · <idea principal en poques paraules>",
  "summary": "Dues frases amb el més important del dia.",
  "report_date": "YYYY-MM-DD",
  "btc_bias": "bullish | bearish | neutral",
  "eth_bias": "bullish | bearish | neutral",
  "watchlist": ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
  "content_md": "## Resum del mercat\\n...\\n\\n## BTC/USDT\\n- **Biaix 1H:** ...\\n- **Preu i MA50 (1H):** ...\\n- **Suports:** ...\\n- **Resistències:** ...\\n\\n## ETH/USDT\\n...\\n\\n## Notícies i esdeveniments\\n- ...\\n\\n## Pla per avui\\n1. ...\\n\\n## Actius a vigilar\\n- ..."
}
\`\`\`

- Per a l'informe setmanal: \`"type": "weekly"\`, \`report_date\` = dilluns de la setmana, i afegeix \`## Setmana en resum\`, \`## Nivells setmanals\` (taula) i \`## Calendari de la setmana\`.
- Pots afegir captures amb \`"images": [{ "base64": "..." }]\` (màxim 6).
- Una resposta \`201\` vol dir creat; \`200\` amb \`Idempotent-Replayed: true\` vol dir que ja existia (correcte, no ho repeteixis).

## C) Altres coses que em pots fer
- **Registrar una operació:** \`POST ${base}/api/v1/trades\` amb \`asset\`, \`entry_price\`, \`stop_loss\` (i opcionalment \`take_profit\`, \`risk_pct\`, \`bias_1h\`, \`confirmation_5m\`, \`trigger_1m\`, \`setup\`, \`notes\`). La mida es calcula sola amb el meu risc per defecte.
- **Tancar-la:** \`PATCH ${base}/api/v1/trades/<id>\` amb \`{"exit_price": 93100}\`.
- **Marcar si una anàlisi s'ha complert:** \`PATCH ${base}/api/v1/analyses/<id>\` amb \`{"outcome": "fulfilled | partial | failed"}\`.
- **Revisió setmanal:** llegeix \`GET ${base}/api/v1/stats?period=week&format=md\` i fes-me una revisió: què he fet bé, els errors que més m'han costat, si he complert la checklist i **una sola cosa concreta** a millorar la setmana vinent.
`;
}
