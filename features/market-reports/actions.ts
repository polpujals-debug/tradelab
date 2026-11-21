"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { setReportRead } from "./service";

export async function setReportReadAction(id: string, isRead: boolean) {
  await setReportRead(z.uuid().parse(id), isRead);
  revalidatePath("/", "layout");
}

export async function markAllReadAction() {
  await db().from("market_reports").update({ is_read: true }).eq("is_read", false);
  revalidatePath("/", "layout");
}
