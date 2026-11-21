<!-- Generat amb `npm run docs:generate` a partir de features/api-docs/content.ts. Substitueix https://EL-TEU-TRADELAB.vercel.app per la URL real (o mira /docs/api a l'app, que ja la porta posada). -->

# TradeLab · API v1

Base URL: `https://EL-TEU-TRADELAB.vercel.app/api/v1`

## Autenticació
Totes les rutes necessiten la capçalera:

```
Authorization: Bearer <API_KEY>
```

Les claus es creen a **Configuració → Claus d'API** (o amb `npm run apikey:create -- "nom"`). Comencen per `tl_`, només es mostren una vegada i es poden revocar. Prova-la:

```bash
curl -s https://EL-TEU-TRADELAB.vercel.app/api/v1/ping -H "Authorization: Bearer $TRADELAB_KEY"
```

## Format de les respostes
- Èxit: `{ "data": ... }` amb codi 200 o 201.
- Error: `{ "error": { "code": "validation_error", "message": "...", "details": [ { "path": "bias", "message": "..." } ] } }`

| Codi | Quan |
|---|---|
| 400 `validation_error` / `invalid_json` | Cos o paràmetres invàlids (`details` diu quin camp) |
| 401 `unauthorized` / `key_revoked` | Falta la clau, és incorrecta o està revocada |
| 404 `not_found` | L'id no existeix |
| 409 `idempotency_conflict` | Mateixa `Idempotency-Key` amb un cos diferent |
| 413 / 415 `invalid_image` | Imatge massa gran (> 10 MB) o format no suportat |
| 500 `internal_error` | Error del servidor |

## Idempotència
Les rutes POST accepten la capçalera opcional `Idempotency-Key` (1–200 caràcters `[A-Za-z0-9_-:.]`). Si repeteixes la petició amb la mateixa clau, reps la resposta original (capçalera `Idempotent-Replayed: true`) i **no es crea cap duplicat**. Recomanat per a la tasca programada: `Idempotency-Key: daily-2026-11-21`.

## Imatges
PNG, JPG o WebP fins a 10 MB. Es converteixen a WebP i es genera una miniatura de 480 px. Una imatge es pot enviar de tres maneres:
- `{ "base64": "iVBORw0..." }` (també s'accepta `data:image/png;base64,...`)
- `{ "url": "https://..." }` (URL pública)
- `{ "media_id": "uuid" }` (d'una pujada prèvia a `/uploads`)

> Al pla gratuït de Vercel el cos d'una petició té un límit de **4,5 MB**. Per a captures molt grans, puja-les primer amb `/uploads` en multipart, o envia una `url`.

## Endpoints

| Mètode | Ruta | Ús |
|---|---|---|
| GET | `/ping` | Comprovar la clau |
| POST | `/analyses` | Crear anàlisi (Markdown + metadades + imatges) |
| GET | `/analyses?asset=&timeframe=&bias=&outcome=&from=&to=&limit=` | Llistar anàlisis |
| GET | `/analyses/:id` | Una anàlisi |
| PATCH | `/analyses/:id` | Actualitzar seguiment / resultat |
| POST | `/uploads` | Pujar una captura → `media_id` + URL |
| POST | `/trades` | Crear operació |
| GET | `/trades?status=&asset=&direction=&result=&from=&to=&limit=` | Llistar operacions |
| GET | `/trades/:id` | Una operació (amb checklist i captures) |
| PATCH | `/trades/:id` | Actualitzar / tancar operació |
| POST | `/reports/market` | Publicar informe de mercat |
| GET | `/reports/market?type=&unread=&limit=` | Llistar informes |
| GET | `/reports/market/:id` | Un informe |
| GET | `/stats?period=day\|week\|month\|all&date=&format=json\|md` | Estadístiques de rendiment |
| GET | `/strategy` | Estratègia activa, checklist i paràmetres de risc |

Totes les dates són ISO 8601. Els dies (`from`, `to`, `date`) són `YYYY-MM-DD` en hora d'**Europe/Madrid**.

---

### POST /analyses
Camps:
- `asset` (obligatori): `BTC/USDT`, també accepta `BTCUSDT`
- `timeframes` (obligatori): array amb valors de `1m 3m 5m 15m 30m 1H 2H 4H 1D 1W`
- `bias` (obligatori): `bullish | bearish | neutral`
- `content_md` (obligatori): l'explicació en Markdown
- `levels`: `{ supports: number[], resistances: number[], ma50: number }`
- `scenario`: una frase amb l'escenari plantejat
- `review_in_days`: quan s'ha de revisar si s'ha complert (per defecte 3)
- `title`: si no s'envia, es genera
- `analyzed_at`: ISO, per defecte ara
- `trade_id`: vincula l'anàlisi a una operació
- `images`: fins a 6, vegeu *Imatges*
- `source`: `claude` (per defecte) o `manual`

```json
{
  "asset": "BTC/USDT",
  "timeframes": [
    "1H",
    "5m"
  ],
  "bias": "bullish",
  "levels": {
    "supports": [
      91200,
      90500
    ],
    "resistances": [
      93400
    ],
    "ma50": 91850
  },
  "scenario": "Continuació alcista cap a 93.400 mentre aguanti 91.200",
  "content_md": "### Què veig\n- **1H:** preu per sobre de la MA50, pendent positiu.\n- **5m:** màxims i mínims creixents, retrocés ordenat a la MA50.\n\n### Escenari\nBusco llargs en el retrocés a 91.200–91.400 amb gatell a 1m.\n\n### Invalidació\nTancament de 1H per sota de la MA50.",
  "review_in_days": 3,
  "images": [
    {
      "base64": "<CAPTURA_EN_BASE64>",
      "caption": "BTCUSDT 1H"
    }
  ]
}
```

```bash
curl -s -X POST https://EL-TEU-TRADELAB.vercel.app/api/v1/analyses \
  -H "Authorization: Bearer $TRADELAB_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: analysis-btc-2026-11-21T10:30" \
  -d @analisi.json
```

Resposta `201`: l'anàlisi completa amb `id`, `images[].url` i `images[].thumb_url`.

### PATCH /analyses/:id
Seguiment: `outcome` (`pending | fulfilled | partial | failed`), `my_notes`, `questions`, `review_at` (`YYYY-MM-DD`), `scenario`, `bias`, `levels`, `content_md`, `trade_id` (o `null`), `images` (s'afegeixen).

```bash
curl -s -X PATCH https://EL-TEU-TRADELAB.vercel.app/api/v1/analyses/<ID> \
  -H "Authorization: Bearer $TRADELAB_KEY" -H "Content-Type: application/json" \
  -d '{"outcome":"fulfilled","my_notes":"El retrocés va respectar la MA50"}'
```

### POST /uploads
```bash
# multipart
curl -s -X POST https://EL-TEU-TRADELAB.vercel.app/api/v1/uploads -H "Authorization: Bearer $TRADELAB_KEY" \
  -F "file=@captura.png" -F "caption=BTC 1H"

# JSON
curl -s -X POST https://EL-TEU-TRADELAB.vercel.app/api/v1/uploads -H "Authorization: Bearer $TRADELAB_KEY" \
  -H "Content-Type: application/json" -d '{"url":"https://exemple.com/captura.png"}'
```
Resposta `201`: `{ "data": { "media_id": "...", "url": "...", "thumb_url": "...", "width": 1280, "height": 720 } }`

### POST /trades
Obligatoris: `asset`, `entry_price`, `stop_loss`. La direcció es dedueix de l'SL (per sota = long). Si no envies `quantity`, es calcula amb `risk_pct` (o el risc per defecte) sobre el capital actual.

Opcionals: `status` (`planned | open | closed | cancelled`, per defecte `open`), `take_profit`, `exit_price`, `entry_at`, `exit_at`, `leverage`, `fees`, `bias_1h`, `confirmation_5m`, `trigger_1m`, `setup`, `emotion_before`, `emotion_after`, `notes`, `lesson`, `analysis_id`, `rule_checks` (`[{ rule_id, passed }]`, ids de `GET /strategy`), `tags` (`[{ kind: "error"|"emotion"|"setup", name }]`).

```json
{
  "asset": "ETH/USDT",
  "entry_price": 3150,
  "stop_loss": 3135,
  "take_profit": 3190,
  "risk_pct": 2,
  "status": "open",
  "bias_1h": "bullish",
  "confirmation_5m": "Màxims i mínims creixents a 5m",
  "trigger_1m": "Trencament del mínim del retrocés",
  "setup": "Retrocés a MA50",
  "emotion_before": "Calma",
  "tags": [
    {
      "kind": "error",
      "name": "Entrada precipitada"
    }
  ],
  "notes": "Entrada a la MA50 de 5m"
}
```

```bash
curl -s -X POST https://EL-TEU-TRADELAB.vercel.app/api/v1/trades \
  -H "Authorization: Bearer $TRADELAB_KEY" -H "Content-Type: application/json" -d @operacio.json
```

### PATCH /trades/:id (tancar)
Si envies `exit_price` sense `status`, l'operació es tanca. El P&L, l'R i el % es calculen sols.
```bash
curl -s -X PATCH https://EL-TEU-TRADELAB.vercel.app/api/v1/trades/<ID> \
  -H "Authorization: Bearer $TRADELAB_KEY" -H "Content-Type: application/json" \
  -d '{"exit_price":3180,"fees":0.4,"emotion_after":"Calma","lesson":"Vaig deixar córrer fins al TP"}'
```

### POST /reports/market
Obligatoris: `type` (`daily | weekly | adhoc`), `title`, `content_md`. Opcionals: `summary`, `report_date` (per defecte avui), `btc_bias`, `eth_bias`, `watchlist`, `images`.
Amb `Idempotency-Key`, una repetició retorna l'informe existent amb codi `200` (en lloc de `201`).

```json
{
  "type": "daily",
  "title": "Informe diari · BTC alcista sobre la MA50",
  "summary": "BTC aguanta la MA50 de 1H; ETH sense direcció. Dades d'inflació a les 14:30.",
  "report_date": "2026-11-21",
  "btc_bias": "bullish",
  "eth_bias": "neutral",
  "watchlist": [
    "BTC/USDT",
    "ETH/USDT",
    "SOL/USDT"
  ],
  "content_md": "## Resum del mercat\n...\n\n## BTC/USDT\n- **Biaix 1H:** alcista\n- **MA50 (1H):** 91.850 (preu per sobre)\n- **Suports:** 91.200 · 90.500\n- **Resistències:** 93.400\n\n## ETH/USDT\n...\n\n## Notícies i esdeveniments\n- ...\n\n## Pla per avui\n1. ...\n\n## Actius a vigilar\n- SOL/USDT"
}
```

```bash
curl -s -X POST https://EL-TEU-TRADELAB.vercel.app/api/v1/reports/market \
  -H "Authorization: Bearer $TRADELAB_KEY" -H "Content-Type: application/json" \
  -H "Idempotency-Key: daily-2026-11-21" -d @informe.json
```

### GET /stats
- `period=day|week|month`: informe complet del període que conté `date` (per defecte avui): resum, comparació amb el període anterior, millor/pitjor operació, errors principals (amb el cost), rendiment per actiu, lliçons i llista d'operacions. També retorna `totals` (P&L total, avui, setmana, mes, capital actual, ratxa, drawdown).
- `period=all`: estadístiques des de l'inici.
- `format=md`: el mateix informe en Markdown (ideal per a una revisió setmanal amb Claude).

```bash
curl -s "https://EL-TEU-TRADELAB.vercel.app/api/v1/stats?period=week&format=md" -H "Authorization: Bearer $TRADELAB_KEY"
```

### GET /strategy
Retorna l'estratègia activa (descripció en Markdown, temporalitats, indicadors), la checklist (`rules[]` amb `id`, `text`, `is_required`), els paràmetres de risc i el capital actual.
