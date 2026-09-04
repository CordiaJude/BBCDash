import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const {
    rep_id,
    customer_name,
    vehicle,
    appt_date,
    appt_time,
    appraisal_link,
    vauto_link,
    crm_link,
    crm_label,
    notes,
    asking_price,
    market_indicates_min,
    market_indicates_max,
  } = body;

  if (!customer_name?.trim() || !vehicle?.trim() || !appt_date || !appt_time) {
    return NextResponse.json({ error: "Customer, vehicle, date, and time are required." }, { status: 400 });
  }

  // Reps may only create appointments for themselves; managers may assign to anyone.
  const targetRep = session.role === "manager" && rep_id ? rep_id : session.id;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      rep_id: targetRep,
      customer_name: customer_name.trim(),
      vehicle: vehicle.trim(),
      appt_date,
      appt_time,
      appraisal_link: appraisal_link || null,
      vauto_link: vauto_link || null,
      crm_link: crm_link || null,
      crm_label: crm_label || null,
      notes: notes || null,
      asking_price: asking_price === "" || asking_price == null ? null : Number(asking_price),
      market_indicates_min: market_indicates_min === "" || market_indicates_min == null ? null : Number(market_indicates_min),
      market_indicates_max: market_indicates_max === "" || market_indicates_max == null ? null : Number(market_indicates_max),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointment: data });
}
