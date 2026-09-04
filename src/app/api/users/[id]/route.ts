import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "manager") {
    return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof body.display_name === "string" && body.display_name.trim()) {
    update.display_name = body.display_name.trim();
  }
  if (body.role === "rep" || body.role === "manager") update.role = body.role;
  if (typeof body.active === "boolean") update.active = body.active;
  if (typeof body.password === "string") {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    update.password_hash = await bcrypt.hash(body.password, 10);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .update(update)
    .eq("id", id)
    .select("id, email, display_name, role, color_hex, photo_url, active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rep: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "manager") {
    return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  }
  const { id } = await params;

  if (id === session.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: target, error: fetchError } = await supabase
    .from("users")
    .select("id, role, active")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !target) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (target.role === "manager" && target.active) {
    const { count } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "manager")
      .eq("active", true);
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "Can't delete the last active manager." }, { status: 400 });
    }
  }

  // tv_settings.updated_by references users(id) with no ON DELETE rule
  // (default RESTRICT), so deleting whoever last touched TV settings
  // fails with a foreign-key violation unless that reference is cleared
  // first.
  await supabase.from("tv_settings").update({ updated_by: null }).eq("updated_by", id);

  // Soft-delete this rep's appointments (same as a manual delete) *before*
  // removing the user, so they land in Recently Deleted instead of being
  // destroyed outright. Requires supabase/migrations/0004_rep_delete_soft_deletes_appointments.sql
  // (appointments.rep_id changed from ON DELETE CASCADE to ON DELETE SET
  // NULL) — without it, the cascade still hard-deletes the rows before
  // this soft-delete would matter.
  await supabase
    .from("appointments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("rep_id", id)
    .is("deleted_at", null);

  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
