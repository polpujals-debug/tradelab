import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { saveError } = await import("./lib/error-log");
    const e = err as Error & { digest?: string };
    await saveError({
      digest: e?.digest ? String(e.digest) : null,
      message: e instanceof Error ? e.message : String(err),
      stack: e instanceof Error && e.stack ? e.stack.split("\n").slice(0, 8).join("\n") : null,
      path: request.path,
      method: request.method,
      route: context.routePath,
      at: new Date().toISOString(),
    });
  } catch (logErr) {
    console.error("No s'ha pogut desar l'error", logErr);
  }
};
