import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionCookie, signSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Enter an email and password." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, password_hash, display_name, role, color_hex, active")
    .eq("email", email)
    .maybeSingle();

  if (error || !user || !user.active) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const sessionUser = {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
    color_hex: user.color_hex,
  };
  await createSessionCookie(sessionUser);

  // Also returned in the body (not just set as a cookie) so the Chrome
  // extension — a cross-site chrome-extension:// origin the SameSite=lax
  // cookie won't reach — can store it itself and send it back as a bearer
  // token. Harmless for the normal web login flow, which just ignores it.
  const token = await signSessionToken(sessionUser);

  return NextResponse.json({
    ok: true,
    token,
    user: { role: user.role, display_name: user.display_name },
  });
}
