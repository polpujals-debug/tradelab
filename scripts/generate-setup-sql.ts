/**
 * Genera supabase/INSTAL·LAR.sql (instal·lació idempotent en un sol fitxer) a
 * partir de supabase/migrations/*.sql, i supabase/DADES-EXEMPLE.sql a partir
 * de supabase/seed.sql.
 *
 *   npm run db:setup-sql          regenera els fitxers
 *   npm run db:setup-sql -- --check   falla si no estan al dia
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildDemoSql, buildSetupSql, DEMO_FILE, SETUP_FILE } from "./setup-sql";

const SUPABASE = path.resolve(__dirname, "..", "supabase");
const MIGRATIONS = path.join(SUPABASE, "migrations");

export function generatedFiles(): Record<string, string> {
  const migrations = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(path.join(MIGRATIONS, name), "utf8") }));
  return {
    [SETUP_FILE]: buildSetupSql(migrations),
    [DEMO_FILE]: buildDemoSql(readFileSync(path.join(SUPABASE, "seed.sql"), "utf8")),
  };
}

if (typeof require !== "undefined" && require.main === module) {
  const check = process.argv.includes("--check");
  let stale = false;
  for (const [file, content] of Object.entries(generatedFiles())) {
    const target = path.join(SUPABASE, file);
    const current = existsSync(target) ? readFileSync(target, "utf8") : null;
    if (current === content) {
      console.log(`${file}: al dia`);
    } else if (check) {
      console.error(`${file}: NO està al dia amb les migracions. Executa npm run db:setup-sql`);
      stale = true;
    } else {
      writeFileSync(target, content);
      console.log(`${file}: generat`);
    }
  }
  if (stale) process.exit(1);
}
