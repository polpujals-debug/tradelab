import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";

export const metadata = { title: "Diagnòstic" };

type Check = { name: string; ok: boolean; detail: string };

/** Identifica el tipus de clau sense mostrar-la mai. */
function keyKind(key: string | undefined): { ok: boolean; detail: string } {
  if (!key) return { ok: false, detail: "No està definida a Vercel." };
  const k = key.trim();
  if (k !== key) return { ok: false, detail: "Té espais o salts de línia al principi o al final." };
  if (k.startsWith("sb_secret_")) return { ok: true, detail: "Clau secreta nova (sb_secret_…): correcte." };
  if (k.startsWith("sb_publishable_")) return { ok: false, detail: "És la clau PUBLISHABLE (pública). Cal la SECRET (sb_secret_…) o la service_role." };
  if (k.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(Buffer.from(k.split(".")[1], "base64url").toString("utf8")) as { role?: string };
      if (payload.role === "service_role") return { ok: true, detail: "Clau service_role (JWT): correcte." };
      return { ok: false, detail: `És una clau amb rol «${payload.role ?? "?"}». Cal la service_role (o la secret).` };
    } catch {
      return { ok: false, detail: "Sembla un JWT però no es pot llegir: potser està tallada." };
    }
  }
  return { ok: false, detail: "Format desconegut: comprova que l'has copiada sencera." };
}

async function Checks() {
  await connection();
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = rawUrl?.trim().replace(/\/(rest|storage|auth)\/v1\/?$/, "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const checks: Check[] = [];

  const urlOk = !!url && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim()) || (!!url && url.startsWith("http://127.0.0.1"));
  const fixed = !!rawUrl && rawUrl.trim() !== url;
  checks.push({ name: "NEXT_PUBLIC_SUPABASE_URL", ok: urlOk, detail: !url ? "No està definida a Vercel." : urlOk ? `Format correcte (${new URL(url).host}).${fixed ? " Nota: tenia un tros de més al final (/rest/v1 o /), l'app el treu sola." : ""}` : `Format inesperat: ha de ser https://xxxx.supabase.co (ara: «${url.slice(0, 60)}»).` });
  const kk = keyKind(key);
  checks.push({ name: "SUPABASE_SERVICE_ROLE_KEY", ...kk });

  if (url && key) {
    try {
      const db = createClient(url.trim(), key.trim(), { auth: { persistSession: false } });
      const tests: [string, () => PromiseLike<{ error: { message: string; code?: string } | null }>][] = [
        ["Taula settings", () => db.from("settings").select("id").limit(1)],
        ["Taula trades", () => db.from("trades").select("id").limit(1)],
        ["Vista v_trade_metrics", () => db.from("v_trade_metrics").select("id").limit(1)],
        ["Escriptura (api_keys)", () => db.from("api_keys").select("id").limit(1)],
      ];
      for (const [name, run] of tests) {
        const { error } = await run();
        checks.push({ name, ok: !error, detail: error ? `${error.code ?? ""} ${error.message}`.trim() : "D'acord." });
      }
      const bucket = await db.storage.getBucket("media");
      checks.push({ name: "Storage (bucket media)", ok: !bucket.error, detail: bucket.error ? bucket.error.message : "D'acord." });
    } catch (e) {
      checks.push({ name: "Connexió", ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
  }

  const allOk = checks.every((c) => c.ok);
  return (
    <>
      <p style={{ color: allOk ? "#10b981" : "#f59e0b", fontWeight: 600 }}>{allOk ? "Tot correcte ✅" : "Hi ha algun problema ⚠️"}</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {checks.map((c) => (
          <li key={c.name} style={{ padding: "10px 0", borderBottom: "1px solid #1e293b" }}>
            <strong style={{ color: c.ok ? "#10b981" : "#ef4444" }}>{c.ok ? "✓" : "✗"} {c.name}</strong>
            <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 4, wordBreak: "break-word" }}>{c.detail}</div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function DiagnosticPage() {
  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22 }}>TradeLab · diagnòstic</h1>
      <p style={{ color: "#94a3b8", fontSize: 14 }}>Comprova la connexió amb Supabase. No mostra cap clau.</p>
      <Suspense fallback={<p>Comprovant…</p>}><Checks /></Suspense>
    </main>
  );
}
