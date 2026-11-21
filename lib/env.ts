import "server-only";
import { z } from "zod";

const schema = z.object({
  // Accepta també la URL copiada amb /rest/v1 o una barra final i la normalitza
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().transform((u) => u.replace(/\/(rest|storage|auth)\/v1\/?$/, "").replace(/\/+$/, "")).pipe(z.url()),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(20),
  SUPABASE_STORAGE_BUCKET: z.string().default("media"),
  APP_TIMEZONE: z.string().default("Europe/Madrid"),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Falten variables d'entorn o són invàlides: ${fields}. Revisa .env.local (vegeu .env.example).`);
  }
  cached = parsed.data;
  return cached;
}
