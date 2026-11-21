import { readFile, stat } from "node:fs/promises";
import path from "node:path";

/** Client mínim per a l'API v1 de TradeLab. */
export class TradeLabClient {
  constructor(private baseUrl: string, private apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async request<T = unknown>(method: string, route: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; data: T; raw: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1${route}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(body !== undefined && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const raw = await res.text();
    if (!res.ok) {
      let message = raw;
      try {
        const j = JSON.parse(raw) as { error?: { message?: string; details?: unknown } };
        message = `${j.error?.message ?? raw}${j.error?.details ? `\nDetalls: ${JSON.stringify(j.error.details)}` : ""}`;
      } catch { /* resposta no JSON */ }
      throw new Error(`TradeLab ${res.status}: ${message}`);
    }
    const type = res.headers.get("content-type") ?? "";
    const data = (type.includes("application/json") ? (JSON.parse(raw) as { data: T }).data : raw) as T;
    return { status: res.status, data, raw };
  }

  /** Puja una captura local (PNG/JPG/WebP ≤ 10 MB) i retorna el media_id. */
  async uploadFile(filePath: string, caption?: string): Promise<string> {
    const abs = path.resolve(filePath);
    const info = await stat(abs);
    if (info.size > 10 * 1024 * 1024) throw new Error(`${filePath} supera els 10 MB`);
    const ext = path.extname(abs).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : null;
    if (!mime) throw new Error(`Format no suportat (${ext}). Fes servir PNG, JPG o WebP.`);
    const fd = new FormData();
    fd.append("file", new Blob([await readFile(abs)], { type: mime }), path.basename(abs));
    if (caption) fd.append("caption", caption);
    const { data } = await this.request<{ media_id: string }>("POST", "/uploads", fd);
    return data.media_id;
  }
}
