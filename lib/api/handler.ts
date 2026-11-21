import "server-only";
import { connection } from "next/server";
import { authenticate } from "./auth";
import { toErrorResponse } from "./respond";

type Ctx<P> = { params: Promise<P> };

/** Embolcall comú: autenticació + gestió d'errors JSON. */
export function api<P = Record<string, never>>(fn: (req: Request, ctx: { params: P; key: { keyId: string; name: string } }) => Promise<Response>) {
  return async (req: Request, ctx: Ctx<P>) => {
    await connection(); // sempre en temps de petició; fora del try perquè Next.js gestioni el seu senyal
    try {
      const key = await authenticate(req);
      const params = ctx?.params ? await ctx.params : ({} as P);
      return await fn(req, { params, key });
    } catch (e) {
      return toErrorResponse(e);
    }
  };
}
