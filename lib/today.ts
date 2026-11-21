import "server-only";
import { connection } from "next/server";
import { localDate } from "./time";

/** Dia local d'avui. Marca la ruta com a dinàmica (Cache Components no pot prerenderitzar "ara"). */
export async function today(): Promise<string> {
  await connection();
  return localDate(new Date());
}
