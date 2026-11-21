import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const KEY_PREFIX = "tl_";

export function hashKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

/** Genera una clau nova: tl_<43 caràcters base64url>. Només es mostra una vegada. */
export function generateKey(): { key: string; hash: string; prefix: string } {
  const key = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { key, hash: hashKey(key), prefix: key.slice(0, 10) };
}
