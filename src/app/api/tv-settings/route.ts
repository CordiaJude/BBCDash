import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

const LAYOUTS = ["single_list", "columns_per_rep", "columns_by_status"];
const SOUNDS = ["chime", "bell", "soft_ping"];

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "manager") {
    return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (LAYOUTS.includes(body.layout_mode)) update.layout_mode = body.layout_mode;
  if (typeof body.alerts_enabled === "boolean") update.alerts_enabled = body.alerts_enabled;
  if (SOUNDS.includes(body.alert_sound)) update.alert_sound = body.alert_sound;
  if (
    Array.isArray(body.alert_offsets_minutes) &&
    body.alert_offsets_minutes.every((n: unknown) => typeof n === "number" && n >= 0 && n <= 180)
  ) {
    update.alert_offsets_minutes = body.alert_offsets_minutes;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  update.updated_by = session.id;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tv_settings")
    .update(update)
    .eq("id", 1)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
