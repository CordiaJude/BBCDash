import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

const MAX_BYTES = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "manager") {
    return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  }
  const { id } = await params;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 3MB." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${id}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("rep-photos")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicUrl } = supabase.storage.from("rep-photos").getPublicUrl(path);

  const { data, error } = await supabase
    .from("users")
    .update({ photo_url: publicUrl.publicUrl })
    .eq("id", id)
    .select("id, username, display_name, role, color_hex, photo_url, active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rep: data });
}
