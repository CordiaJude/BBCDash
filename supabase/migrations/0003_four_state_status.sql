-- =========================================================
-- Four-state status circles (blank / green check / red X / blue "?")
--
-- ⚠️  MANUAL STEP REQUIRED — this sandbox has no network route to the
-- live Supabase project, so this migration has NOT been applied. Run it
-- yourself in the SQL editor (https://supabase.com/dashboard/project/ufdlkaoaxrxjsnylnfop/sql/new),
-- same process as 0001_init.sql and 0002_email_password_auth.sql.
--
-- Previously each status field (confirmed_status / showed_status /
-- sold_status) only had three values ('pending' | 'yes' | 'no'), and the
-- UI mapped 'no' to a blue "?" circle for lack of a real fourth state.
-- This adds a genuine fourth value, 'maybe', for that blue "?" — 'no' now
-- means what it visually shows: a red X.
--
-- Existing 'no' rows keep meaning "no" (now shown as a red X, not a "?")
-- — no data rewrite needed, just widening what each column accepts.
-- =========================================================

alter table public.appointments drop constraint if exists appointments_confirmed_status_check;
alter table public.appointments add constraint appointments_confirmed_status_check
  check (confirmed_status in ('pending', 'yes', 'no', 'maybe'));

alter table public.appointments drop constraint if exists appointments_showed_status_check;
alter table public.appointments add constraint appointments_showed_status_check
  check (showed_status in ('pending', 'yes', 'no', 'maybe'));

alter table public.appointments drop constraint if exists appointments_sold_status_check;
alter table public.appointments add constraint appointments_sold_status_check
  check (sold_status in ('pending', 'yes', 'no', 'maybe'));
