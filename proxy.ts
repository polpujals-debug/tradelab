import { NextResponse, type NextRequest } from "next/server";

/**
 * Protecció opcional sense contrasenya per a la web (no per a l'API, que fa servir claus).
 *
 * Si defineixes APP_ACCESS_TOKEN, només s'hi pot entrar des d'un dispositiu que hagi obert
 * un cop l'enllaç d'accés: https://el-teu-tradelab.vercel.app/?acces=<APP_ACCESS_TOKEN>
 * Això deixa una cookie (1 any) i a partir d'aquí la web s'obre directament.
 * Sense APP_ACCESS_TOKEN, la web és oberta (útil en local).
 */
const COOKIE = "tl_access";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function proxy(req: NextRequest) {
  const token = process.env.APP_ACCESS_TOKEN;
  if (!token) return NextResponse.next();
  const expected = await sha256(`tradelab:${token}`);

  const given = req.nextUrl.searchParams.get("acces");
  if (given) {
    if ((await sha256(`tradelab:${given.trim()}`)) !== expected) return denied(true);
    const clean = req.nextUrl.clone();
    clean.searchParams.delete("acces");
    const res = NextResponse.redirect(clean);
    res.cookies.set(COOKIE, expected, { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  if (req.cookies.get(COOKIE)?.value === expected) return NextResponse.next();
  return denied();
}

function denied(wrong = false) {
  return new NextResponse(
    `<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#05070d"><title>TradeLab</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#05070d;color:#e5e7eb;font-family:system-ui,-apple-system,sans-serif;padding:16px;box-sizing:border-box}
div{width:100%;max-width:400px;padding:28px;border:1px solid #1e293b;border-radius:18px;background:#111827;text-align:center;box-sizing:border-box}
h1{font-size:19px;margin:0 0 8px}p{color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 18px}
input{width:100%;box-sizing:border-box;height:48px;border-radius:12px;border:1px solid ${wrong ? "#ef4444" : "#2a3a52"};background:#0b0f1a;color:#e5e7eb;font-size:16px;padding:0 14px;outline:none}
input:focus{border-color:#3b82f6}button{margin-top:12px;width:100%;height:48px;border:0;border-radius:12px;background:#2563eb;color:#fff;font-size:16px;font-weight:600}
.err{color:#ef4444;font-size:13px;margin:8px 0 0}</style></head>
<body><div><h1>Accés restringit</h1><p>Escriu el teu codi d'accés (el valor d'APP_ACCESS_TOKEN). Només cal fer-ho una vegada en aquest dispositiu o app.</p>
<form method="get" action="/"><input name="acces" type="password" autocomplete="current-password" placeholder="Codi d'accés" required autofocus>
${wrong ? '<p class="err">Codi incorrecte. Torna-ho a provar.</p>' : ""}<button type="submit">Entrar</button></form></div></body></html>`,
    { status: 401, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

export const config = {
  // L'API (/api/v1) té les seves pròpies claus; els fitxers estàtics, les icones i el manifest
  // (necessaris per instal·lar l'app) no es protegeixen.
  matcher: ["/((?!api/|_next/static|_next/image|seed/|icons/|manifest.webmanifest|icon.png|apple-icon.png).*)"],
};
