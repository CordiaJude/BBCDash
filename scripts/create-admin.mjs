// One-time bootstrap: creates the first manager account.
// Usage: node scripts/create-admin.mjs <username> <display_name> <4-digit-pin>
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // .env.local not found — assume env vars are already set
  }
}
loadEnvLocal();

const [username, displayName, pin] = process.argv.slice(2);
if (!username || !displayName || !/^\d{4}$/.test(pin ?? "")) {
  console.error("Usage: node scripts/create-admin.mjs <username> <display_name> <4-digit-pin>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (check .env.local).");
  process.exit(1);
}

const supabase = createClient(url, key);
const pin_hash = await bcrypt.hash(pin, 10);
const REP_COLOR_PALETTE = ["#4F8EF7", "#E0654F", "#3FB88A", "#C99A3C", "#9D6FE0", "#3FAFC2", "#E0578C", "#7C9C4A"];

const { data: existing } = await supabase.from("users").select("color_hex");
const used = new Set((existing ?? []).map((u) => u.color_hex));
const color_hex = REP_COLOR_PALETTE.find((c) => !used.has(c)) ?? REP_COLOR_PALETTE[0];

const { data, error } = await supabase
  .from("users")
  .insert({
    username: username.toLowerCase(),
    display_name: displayName,
    pin_hash,
    role: "manager",
    color_hex,
    active: true,
  })
  .select()
  .single();

if (error) {
  console.error("Failed to create account:", error.message);
  process.exit(1);
}

console.log(`Created manager account "${data.username}" (${data.display_name}).`);
