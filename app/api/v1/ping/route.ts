import { api } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";

/** Comprova que la clau funciona. */
export const GET = api(async (_req, { key }) => ok({ ok: true, key: key.name, time: new Date().toISOString(), timezone: "Europe/Madrid" }));
