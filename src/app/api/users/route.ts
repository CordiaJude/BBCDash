import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { nextAvailableColor } from "@/lib/colors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "manager") {
    return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const display_name = typeof body?.display_name === "string" ? body.display_name.trim() : "";
  const role = body?.role === "manager" ? "manager" : "rep";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (!display_name) {
    return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: existingUsers } = await supabase.from("users").select("color_hex");
  const color_hex = nextAvailableColor((existingUsers ?? []).map((u) => u.color_hex));
  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert({ email, password_hash, display_name, role, color_hex, active: true })
    .select("id, email, display_name, role, color_hex, photo_url, active, created_at")
    .single();

  if (error) {
    const message = error.code === "23505" ? "That email is already in use." : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ rep: data });
}
