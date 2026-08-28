import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { nextAvailableColor } from "@/lib/colors";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "manager") {
    return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const display_name = typeof body?.display_name === "string" ? body.display_name.trim() : "";
  const role = body?.role === "manager" ? "manager" : "rep";

  if (!username || !/^[a-z0-9_.-]+$/.test(username)) {
    return NextResponse.json({ error: "Username must be lowercase letters/numbers only." }, { status: 400 });
  }
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 4 digits." }, { status: 400 });
  }
  if (!display_name) {
    return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: existingUsers } = await supabase.from("users").select("color_hex");
  const color_hex = nextAvailableColor((existingUsers ?? []).map((u) => u.color_hex));
  const pin_hash = await bcrypt.hash(pin, 10);

  const { data, error } = await supabase
    .from("users")
    .insert({ username, pin_hash, display_name, role, color_hex, active: true })
    .select("id, username, display_name, role, color_hex, photo_url, active, created_at")
    .single();

  if (error) {
    const message = error.code === "23505" ? "That username is already taken." : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ rep: data });
}
