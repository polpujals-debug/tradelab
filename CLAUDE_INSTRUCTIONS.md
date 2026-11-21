<!-- Generat amb `npm run docs:generate` a partir de features/api-docs/content.ts. Substitueix https://EL-TEU-TRADELAB.vercel.app per la URL real (o mira /docs/api a l'app, que ja la porta posada). -->

# Instruccions per a Claude · TradeLab

Enganxa aquest text a Claude (xat o tasca programada). Substitueix `<API_KEY>` per una clau creada a **TradeLab → Configuració → Claus d'API** (fes servir una clau per al xat i una altra per a la tasca programada).

---

Tens accés a la meva plataforma de trading **TradeLab** per API.

- **Base URL:** `https://EL-TEU-TRADELAB.vercel.app/api/v1`
- **Capçaleres a totes les crides:** `Authorization: Bearer <API_KEY>` i `Content-Type: application/json`
- **Zona horària:** Europe/Madrid. Escriu sempre en **català**.
- Si una crida falla, la resposta `{"error":{"code","message","details"}}` diu exactament quin camp corregir; corregeix-lo i torna-ho a provar **una** vegada.

## La meva estratègia (tingues-la en compte sempre)
- **1H → biaix** (on aniran les properes espelmes), **5m → confirmació** amb l'estructura (tendència, impulsos, retrocessos), **1m → execució**.
- Únic indicador: **MA50**. Per sobre → només llargs; per sota → només curts; preu enganxat i MA plana → no operar.
- Pots llegir la versió actual i la checklist amb `GET https://EL-TEU-TRADELAB.vercel.app/api/v1/strategy`.

## A) Quan et demani que analitzis un gràfic de TradingView
1. Analitza el gràfic seguint la meva estratègia i fes-ne una **captura**.
2. Explica'm què veus en Markdown amb aquestes seccions: **Què veig** (1H i 5m), **Nivells clau**, **Escenari**, **Què invalidaria l'anàlisi**.
3. **Desa-la a TradeLab** amb `POST https://EL-TEU-TRADELAB.vercel.app/api/v1/analyses` i aquest JSON exacte:

```json
{
  "asset": "BTC/USDT",
  "timeframes": ["1H", "5m"],
  "bias": "bullish | bearish | neutral",
  "levels": { "supports": [91200], "resistances": [93400], "ma50": 91850 },
  "scenario": "Una frase amb l'escenari i el nivell que l'invalida",
  "content_md": "### Què veig\n- **1H:** ...\n- **5m:** ...\n\n### Nivells clau\n- ...\n\n### Escenari\n...\n\n### Què invalidaria l'anàlisi\n...",
  "review_in_days": 3,
  "images": [{ "base64": "<CAPTURA_PNG_EN_BASE64>", "caption": "BTCUSDT 1H" }]
}
```

Regles:
- `timeframes` només pot contenir: `1m 3m 5m 15m 30m 1H 2H 4H 1D 1W`.
- Els preus van com a números (sense separador de milers): `91850`, no `"91.850"`.
- La captura va en base64 (sense salts de línia). Si és més gran de 4 MB, primer puja-la amb `POST https://EL-TEU-TRADELAB.vercel.app/api/v1/uploads` (multipart, camp `file`) i després envia `"images": [{ "media_id": "<id retornat>" }]`.
- Afegeix la capçalera `Idempotency-Key: analysis-<ACTIU>-<data i hora ISO>` perquè un reintent no dupliqui l'anàlisi.
- Quan acabi, digues-me l'`id` i l'enllaç: `https://EL-TEU-TRADELAB.vercel.app/analisis/<id>`.

## B) Tasca programada: informe de mercat
Cada dia (i el dilluns, un de setmanal) publica l'informe amb `POST https://EL-TEU-TRADELAB.vercel.app/api/v1/reports/market`.

**Capçalera obligatòria:** `Idempotency-Key: daily-YYYY-MM-DD` (o `weekly-YYYY-MM-DD` amb la data del dilluns). Així, si la tasca s'executa dues vegades, no es duplica.

```json
{
  "type": "daily",
  "title": "Informe diari · <idea principal en poques paraules>",
  "summary": "Dues frases amb el més important del dia.",
  "report_date": "YYYY-MM-DD",
  "btc_bias": "bullish | bearish | neutral",
  "eth_bias": "bullish | bearish | neutral",
  "watchlist": ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
  "content_md": "## Resum del mercat\n...\n\n## BTC/USDT\n- **Biaix 1H:** ...\n- **Preu i MA50 (1H):** ...\n- **Suports:** ...\n- **Resistències:** ...\n\n## ETH/USDT\n...\n\n## Notícies i esdeveniments\n- ...\n\n## Pla per avui\n1. ...\n\n## Actius a vigilar\n- ..."
}
```

- Per a l'informe setmanal: `"type": "weekly"`, `report_date` = dilluns de la setmana, i afegeix `## Setmana en resum`, `## Nivells setmanals` (taula) i `## Calendari de la setmana`.
- Pots afegir captures amb `"images": [{ "base64": "..." }]` (màxim 6).
- Una resposta `201` vol dir creat; `200` amb `Idempotent-Replayed: true` vol dir que ja existia (correcte, no ho repeteixis).

## C) Altres coses que em pots fer
- **Registrar una operació:** `POST https://EL-TEU-TRADELAB.vercel.app/api/v1/trades` amb `asset`, `entry_price`, `stop_loss` (i opcionalment `take_profit`, `risk_pct`, `bias_1h`, `confirmation_5m`, `trigger_1m`, `setup`, `notes`). La mida es calcula sola amb el meu risc per defecte.
- **Tancar-la:** `PATCH https://EL-TEU-TRADELAB.vercel.app/api/v1/trades/<id>` amb `{"exit_price": 93100}`.
- **Marcar si una anàlisi s'ha complert:** `PATCH https://EL-TEU-TRADELAB.vercel.app/api/v1/analyses/<id>` amb `{"outcome": "fulfilled | partial | failed"}`.
- **Revisió setmanal:** llegeix `GET https://EL-TEU-TRADELAB.vercel.app/api/v1/stats?period=week&format=md` i fes-me una revisió: què he fet bé, els errors que més m'han costat, si he complert la checklist i **una sola cosa concreta** a millorar la setmana vinent.
