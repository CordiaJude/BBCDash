import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

// Appends one uploaded photo's public URL to the "appraisal_1" (Take
// photos) step's data.photo_urls array — the caller re-POSTs a file per
// photo, there's no fixed count required (see spec section 2, step 1).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

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

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP, or HEIC image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 8MB." }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/heic" ? "heic" : "jpg";
  const path = `${id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("appraisal-photos")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicUrl } = supabase.storage.from("appraisal-photos").getPublicUrl(path);

  const { data: existingStep } = await supabase
    .from("workflow_steps")
    .select("data")
    .eq("appointment_id", id)
    .eq("step_key", "appraisal_1")
    .maybeSingle();

  const priorUrls: string[] = Array.isArray(existingStep?.data?.photo_urls) ? existingStep!.data.photo_urls : [];
  const photo_urls = [...priorUrls, publicUrl.publicUrl];

  const { data: row, error } = await supabase
    .from("workflow_steps")
    .upsert(
      { appointment_id: id, step_key: "appraisal_1", completed_at: new Date().toISOString(), data: { photo_urls } },
      { onConflict: "appointment_id,step_key" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ step: row, url: publicUrl.publicUrl });
}
