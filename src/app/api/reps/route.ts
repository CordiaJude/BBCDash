import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionFromRequest } from "@/lib/auth";

// The web app reads the `reps` view directly via the public anon key
// (browser realtime hooks). The Chrome extension has no Supabase client,
// so it gets the same data through this session-gated route instead —
// used for the quick-add rep picker and to label appointments by rep
// name in the popup stats/notifications.
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("reps").select("*").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reps: data ?? [] });
}
