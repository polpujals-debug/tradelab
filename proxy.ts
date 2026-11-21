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
    if ((await sha256(`tradelab:${given}`)) !== expected) return denied();
    const clean = req.nextUrl.clone();
    clean.searchParams.delete("acces");
    const res = NextResponse.redirect(clean);
    res.cookies.set(COOKIE, expected, { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  if (req.cookies.get(COOKIE)?.value === expected) return NextResponse.next();
  return denied();
}

function denied() {
  return new NextResponse(
    `<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TradeLab</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#05070d;color:#e5e7eb;font-family:system-ui,sans-serif}
div{max-width:420px;padding:32px;border:1px solid #1e293b;border-radius:16px;background:#111827;text-align:center}
h1{font-size:18px;margin:0 0 8px}p{color:#94a3b8;font-size:14px;line-height:1.6;margin:0}</style></head>
<body><div><h1>Accés restringit</h1><p>Obre l'enllaç d'accés de TradeLab en aquest dispositiu (una sola vegada) per entrar.</p></div></body></html>`,
    { status: 401, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

export const config = {
  // L'API (/api/v1) té les seves pròpies claus; els fitxers estàtics no es protegeixen.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|seed/).*)"],
};
