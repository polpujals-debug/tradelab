import "server-only";
import { z } from "zod";
import { ImageError } from "@/lib/media/process-image";
import { ServiceError } from "@/features/trades/service";

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200, headers?: HeadersInit) {
  return Response.json({ data }, { status, headers });
}

export function fail(status: number, code: string, message: string, details?: unknown) {
  const body: ApiErrorBody = { error: { code, message, ...(details !== undefined ? { details } : {}) } };
  return Response.json(body, { status });
}

/** Converteix qualsevol error en una resposta JSON descriptiva. */
export function toErrorResponse(e: unknown): Response {
  if (e instanceof ApiError) return fail(e.status, e.code, e.message, e.details);
  if (e instanceof z.ZodError) {
    return fail(400, "validation_error", "Les dades no són vàlides. Revisa 'details'.", e.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  if (e instanceof ImageError) return fail(e.status, "invalid_image", e.message);
  if (e instanceof ServiceError) return fail(e.status, e.status === 404 ? "not_found" : "invalid_request", e.message, e.details);
  console.error("[api]", e);
  return fail(500, "internal_error", "Error intern. Torna-ho a provar.");
}

/** Llegeix el cos com a JSON amb un error clar si no ho és. */
export async function readJson(req: Request): Promise<unknown> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new ApiError(415, "unsupported_media_type", "Envia el cos com a JSON amb 'Content-Type: application/json'.");
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "invalid_json", "El cos no és un JSON vàlid.");
  }
}

export const uuidParam = z.uuid({ error: "L'id ha de ser un UUID" });
