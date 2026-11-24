import { connection } from "next/server";
import { readError } from "@/lib/error-log";

/** Detall d'un error del servidor (protegit pel codi d'accés, com la resta de la web). */
export async function GET(req: Request) {
  await connection();
  const digest = new URL(req.url).searchParams.get("d");
  const entry = await readError(digest);
  return Response.json(entry ?? { message: null }, { headers: { "cache-control": "no-store" } });
}
