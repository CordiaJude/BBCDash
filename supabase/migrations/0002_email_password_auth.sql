-- =========================================================
-- Email + password auth (replaces username + 4-digit PIN)
--
-- ⚠️  MANUAL STEP REQUIRED — this sandbox has no network route to the
-- live Supabase project, so this migration has NOT been applied. Run it
-- yourself the same way 0001_init.sql was applied: open the SQL editor
-- for the project (https://supabase.com/dashboard/project/ufdlkaoaxrxjsnylnfop/sql/new)
-- and run the contents of this file.
--
-- ⚠️  DATA IMPACT — after this runs, every existing row in public.users
-- keeps its id/display_name/role/color_hex but its old `username` value
-- becomes its `email` value (schema-level rename only — the *value*
-- itself is not validated as a real email address) and its old
-- `pin_hash` becomes `password_hash` (still a valid bcrypt hash, just of
-- a 4-digit PIN — it will never match a real password typed at the new
-- login form). Any existing account is effectively locked out until you:
--   1. UPDATE public.users SET email = '<real email>' WHERE id = '<id>';
--   2. Reset its password via `node scripts/create-admin.mjs` (for a
--      fresh manager) or the Admin → Reps & managers "Reset password"
--      action once you can log in with at least one working account.
-- =========================================================

alter table public.users rename column username to email;
alter table public.users rename column pin_hash to password_hash;

-- The `reps` view (0001_init.sql) was defined as `select id, username, ...`
-- with no alias, so its own output column is literally named "username" —
-- independent of the base table's column name. Postgres already updated
-- the view's internal reference when the table column above was renamed
-- (so the view still works), but a view's own column names only change via
-- an explicit rename — `create or replace view` cannot rename an existing
-- output column (errors 42P16), only append new ones or change types.
alter view public.reps rename column username to email;
