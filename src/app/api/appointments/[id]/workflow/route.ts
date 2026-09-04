import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

// Fields the MGM/Appraisal workflow itself is allowed to write on the
// appointment row (separate from AppointmentModal's EDITABLE_FIELDS).
const WORKFLOW_FIELDS = [
  "title_status",
  "payoff_amount",
  "bought_price",
  "workflow_status",
  "exit_step",
  "exit_reason",
  "showed_status",
  "sold_status",
] as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const supabase = createAdminClient();
  const [{ data: appointment, error: apptError }, { data: steps, error: stepsError }] = await Promise.all([
    supabase.from("appointments").select("*").eq("id", id).maybeSingle(),
    supabase.from("workflow_steps").select("*").eq("appointment_id", id),
  ]);

  if (apptError || !appointment) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  if (stepsError) return NextResponse.json({ error: stepsError.message }, { status: 500 });
  if (session.role !== "manager" && appointment.rep_id !== session.id) {
    return NextResponse.json({ error: "You can only view your own appointments." }, { status: 403 });
  }

  return NextResponse.json({ appointment, steps: steps ?? [] });
}

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
  if (fetchError || !existing) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  if (session.role !== "manager" && existing.rep_id !== session.id) {
    return NextResponse.json({ error: "You can only edit your own appointments." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const update: Record<string, unknown> = {};
  for (const field of WORKFLOW_FIELDS) {
    if (field in body) update[field] = body[field];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase.from("appointments").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointment: data });
}

// Nixes the checklist entirely — used when a rep marks the appointment a
// no-show from the workflow modal's top status circle. Wipes all
// workflow_steps rows and resets the appointment's workflow fields so a
// re-opened modal starts completely fresh.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const supabase = createAdminClient();
  const { data: existing, error: fetchError } = await supabase
    .from("appointments")
    .select("id, rep_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !existing) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  if (session.role !== "manager" && existing.rep_id !== session.id) {
    return NextResponse.json({ error: "You can only edit your own appointments." }, { status: 403 });
  }

  const { error: stepsError } = await supabase.from("workflow_steps").delete().eq("appointment_id", id);
  if (stepsError) return NextResponse.json({ error: stepsError.message }, { status: 500 });

  const { data, error } = await supabase
    .from("appointments")
    .update({
      workflow_status: "not_started",
      exit_step: null,
      exit_reason: null,
      showed_status: "no",
      sold_status: "no",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointment: data });
}
