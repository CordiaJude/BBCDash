"use client";

import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

// Anon-key client used in the browser for realtime subscriptions and reads.
// It can only SELECT (see RLS policies in supabase/migrations) — every
// write goes through an API route using the service role key instead.
export function getBrowserSupabase() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
