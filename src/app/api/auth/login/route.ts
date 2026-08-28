import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";

  if (!username || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Enter a username and 4-digit PIN." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("id, username, pin_hash, display_name, role, color_hex, active")
    .eq("username", username)
    .maybeSingle();

  if (error || !user || !user.active) {
    return NextResponse.json({ error: "Invalid username or PIN." }, { status: 401 });
  }

  const ok = await bcrypt.compare(pin, user.pin_hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid username or PIN." }, { status: 401 });
  }

  await createSessionCookie({
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    color_hex: user.color_hex,
  });

  return NextResponse.json({
    ok: true,
    user: { role: user.role, display_name: user.display_name },
  });
}
