# TradeLab · servidor MCP

Permet que Claude (Claude Desktop, Claude Code o qualsevol client MCP) faci servir TradeLab com a **eines**, sense haver d'escriure crides HTTP.

| Eina | Què fa |
|---|---|
| `save_analysis` | Desa una anàlisi de gràfic amb captura (fitxer local, base64 o URL) |
| `update_analysis` | Marca si l'escenari s'ha complert, afegeix notes |
| `log_trade` | Registra una operació (la mida es calcula amb el teu risc) |
| `close_trade` | Tanca una operació amb el preu de sortida |
| `list_trades` | Llista operacions (per trobar ids) |
| `publish_market_report` | Publica l'informe de mercat (idempotent per tipus i data) |
| `get_stats` | Informe de rendiment (Markdown) per fer revisions |
| `get_strategy` | Estratègia activa, checklist i risc |

## Instal·lació

```bash
cd mcp-server
npm install
npm run build
```

Necessites una clau d'API: **TradeLab → Configuració → Claus d'API** (crea'n una anomenada, per exemple, "MCP").

## Claude Desktop

Edita `claude_desktop_config.json` (Configuració → Desenvolupador → Editar configuració) i afegeix:

```json
{
  "mcpServers": {
    "tradelab": {
      "command": "node",
      "args": ["/RUTA/ABSOLUTA/A/tradelab/mcp-server/dist/index.js"],
      "env": {
        "TRADELAB_URL": "https://el-teu-tradelab.vercel.app",
        "TRADELAB_API_KEY": "tl_..."
      }
    }
  }
}
```

Reinicia Claude Desktop: veuràs les eines de TradeLab a la icona d'eines.

## Claude Code

```bash
claude mcp add tradelab -e TRADELAB_URL=https://el-teu-tradelab.vercel.app -e TRADELAB_API_KEY=tl_... -- node /RUTA/ABSOLUTA/A/tradelab/mcp-server/dist/index.js
```

## Prova ràpida

```bash
TRADELAB_URL=http://localhost:3000 TRADELAB_API_KEY=tl_... npm run smoke-test
```

> Atenció: la prova crea dades reals (una anàlisi, una operació i un informe). Fes-la contra l'entorn local.

## Exemple d'ús amb Claude

> "Analitza el BTC a 1H i 5m amb la meva estratègia, fes una captura i desa-la a TradeLab."

Claude farà l'anàlisi, desarà la captura en un fitxer i cridarà `save_analysis` amb `image_paths`.
