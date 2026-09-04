import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

// Hard-deletes soft-deleted appointments past their 7-day retention window.
// There's no scheduled job (no pg_cron) doing this in the background — the
// "Recently deleted" panel calls this route on mount, so expired rows get
// cleaned up on next view rather than by a timer.
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "manager") {
    return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  }

  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
  const supabase = createAdminClient();
  const { error } = await supabase.from("appointments").delete().lt("deleted_at", cutoff);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
