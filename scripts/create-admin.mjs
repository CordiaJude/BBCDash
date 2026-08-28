// One-time bootstrap: creates the first manager account.
// Usage: node scripts/create-admin.mjs <email> <display_name> <password>
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const [email, displayName, password] = process.argv.slice(2);
if (!email || !displayName || !password || !EMAIL_RE.test(email) || password.length < 8) {
  console.error("Usage: node scripts/create-admin.mjs <email> <display_name> <password>");
  console.error("  <email>    must look like a real email address");
  console.error("  <password> must be at least 8 characters");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (check .env.local).");
  process.exit(1);
}

const supabase = createClient(url, key);
const password_hash = await bcrypt.hash(password, 10);
const REP_COLOR_PALETTE = ["#4F8EF7", "#E0654F", "#3FB88A", "#C99A3C", "#9D6FE0", "#3FAFC2", "#E0578C", "#7C9C4A"];

const { data: existing } = await supabase.from("users").select("color_hex");
const used = new Set((existing ?? []).map((u) => u.color_hex));
const color_hex = REP_COLOR_PALETTE.find((c) => !used.has(c)) ?? REP_COLOR_PALETTE[0];

const { data, error } = await supabase
  .from("users")
  .insert({
    email: email.toLowerCase(),
    display_name: displayName,
    password_hash,
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

console.log(`Created manager account "${data.email}" (${data.display_name}).`);
