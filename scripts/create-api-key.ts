/**
 * Crea una clau d'API des de la terminal (útil per al primer cop o en CI).
 *   npm run apikey:create -- "Claude xat"
 */
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) {
  console.error("Falten NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(1);
}
const name = process.argv[2] ?? "Claude";
const key = `tl_${randomBytes(32).toString("base64url")}`;
const hash = createHash("sha256").update(key).digest("hex");

createClient(url, service, { auth: { persistSession: false } })
  .from("api_keys")
  .insert({ name, key_hash: hash, prefix: key.slice(0, 10) })
  .then(({ error }) => {
    if (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
    console.log(`Clau "${name}" creada. Desa-la ara, no es tornarà a mostrar:\n\n  ${key}\n`);
  });
