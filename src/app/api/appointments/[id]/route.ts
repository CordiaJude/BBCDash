import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

const EDITABLE_FIELDS = [
  "customer_name",
  "vehicle",
  "appt_date",
  "appt_time",
  "confirmed_status",
  "showed_status",
  "sold_status",
  "appraisal_link",
  "vauto_link",
  "crm_link",
  "crm_label",
  "notes",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const supabase = createAdminClient();
  const { data: existing, error: fetchError } = await supabase
    .from("appointments")
    .select("id, rep_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }
  if (session.role !== "manager" && existing.rep_id !== session.id) {
    return NextResponse.json({ error: "You can only edit your own appointments." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const update: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field];
  }
  // Only a manager may reassign an appointment to a different rep.
  if (session.role === "manager" && "rep_id" in body) {
    update.rep_id = body.rep_id;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("appointments")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointment: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "manager") {
    return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  }
  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
