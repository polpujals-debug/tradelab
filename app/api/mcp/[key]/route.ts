import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { connection } from "next/server";
import { authenticateKey } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/respond";
import { buildMcpServer } from "@/features/mcp/server";

/**
 * Connector MCP remot de TradeLab per a Claude (Streamable HTTP, sense estat).
 * URL: https://<app>/api/mcp/<clau d'API>  → s'afegeix a Claude com a connector personalitzat.
 */
export const maxDuration = 60;

async function handle(req: Request, ctx: RouteContext<"/api/mcp/[key]">) {
  await connection();
  const { key } = await ctx.params;
  try {
    await authenticateKey(decodeURIComponent(key));
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 401;
    return Response.json({ jsonrpc: "2.0", error: { code: -32001, message: e instanceof Error ? e.message : "No autoritzat" }, id: null }, { status });
  }
  const url = new URL(req.url);
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? `${req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")}://${req.headers.get("x-forwarded-host") ?? url.host}`;
  const server = buildMcpServer(base);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 12 * 1024 * 1024 });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    // Sense estat: es tanca quan la resposta ja s'ha generat
    void transport.close().catch(() => undefined);
  }
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
