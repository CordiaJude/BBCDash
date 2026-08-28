import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client — server only, bypasses RLS. Never import this from
// client components; all writes to appointments/users/tv_settings go
// through this so the anon key stays read-only in the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase service role env vars");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
