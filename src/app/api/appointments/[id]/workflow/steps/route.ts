import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

// One tap = one upsert, so progress auto-saves as the rep goes and survives
// closing the tab mid-workflow (re-opening reloads from workflow_steps).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const stepKey = body?.step_key;
  if (!stepKey || typeof stepKey !== "string") {
    return NextResponse.json({ error: "step_key is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .select("id, rep_id")
    .eq("id", id)
    .maybeSingle();
  if (apptError || !appointment) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  if (session.role !== "manager" && appointment.rep_id !== session.id) {
    return NextResponse.json({ error: "You can only edit your own appointments." }, { status: 403 });
  }

  const completed = Boolean(body.completed);
  const data = body.data && typeof body.data === "object" ? body.data : {};

  const { data: row, error } = await supabase
    .from("workflow_steps")
    .upsert(
      {
        appointment_id: id,
        step_key: stepKey,
        completed_at: completed ? new Date().toISOString() : null,
        data,
      },
      { onConflict: "appointment_id,step_key" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ step: row });
}
