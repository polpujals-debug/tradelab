/** Escriu API.md i CLAUDE_INSTRUCTIONS.md a partir de features/api-docs/content.ts. */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { apiReference, claudeInstructions } from "../features/api-docs/content";

const base = process.env.DOCS_BASE_URL ?? "https://EL-TEU-TRADELAB.vercel.app";
const root = path.resolve(__dirname, "..");
const note = `<!-- Generat amb \`npm run docs:generate\` a partir de features/api-docs/content.ts. Substitueix ${base} per la URL real (o mira /docs/api a l'app, que ja la porta posada). -->\n\n`;
writeFileSync(path.join(root, "API.md"), note + apiReference(base));
writeFileSync(path.join(root, "CLAUDE_INSTRUCTIONS.md"), note + claudeInstructions(base));
console.log("API.md i CLAUDE_INSTRUCTIONS.md generats");
