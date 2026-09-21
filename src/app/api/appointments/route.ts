import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionFromRequest } from "@/lib/auth";

// Used by the web app's own realtime hooks only indirectly (those read
// Supabase directly with the anon key) — this GET exists for callers that
// can't do that, namely the Chrome extension's popup stats/notifications,
// authenticated via bearer token instead of the session cookie.
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") === "everyone" ? "everyone" : "mine";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = createAdminClient();
  let query = supabase
    .from("appointments")
    .select("*")
    .is("deleted_at", null)
    .order("appt_date", { ascending: true })
    .order("appt_time", { ascending: true });

  // Reps only ever see their own appointments through this endpoint,
  // regardless of the requested scope — same rule the dashboard's
  // mine/everyone toggle enforces client-side for managers only.
  if (session.role !== "manager" || scope === "mine") {
    query = query.eq("rep_id", session.id);
  }
  if (from) query = query.gte("appt_date", from);
  if (to) query = query.lte("appt_date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
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
