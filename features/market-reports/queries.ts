import "server-only";
import { db } from "@/lib/supabase/server";

export async function countUnreadReports(): Promise<number> {
  const { count, error } = await db().from("market_reports").select("id", { count: "exact", head: true }).eq("is_read", false);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
