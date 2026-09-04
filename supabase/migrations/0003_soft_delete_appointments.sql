-- =========================================================
-- Soft-delete appointments (Recently Deleted / restore, 7-day retention)
--
-- ⚠️  MANUAL STEP REQUIRED — this sandbox has no network route to the
-- live Supabase project, so this migration has NOT been applied. Run it
-- in the SQL editor (https://supabase.com/dashboard/project/ufdlkaoaxrxjsnylnfop/sql/new),
-- same process as the prior migrations.
--
-- Deleting an appointment now sets deleted_at instead of removing the
-- row outright, so it can be listed and restored from Admin →
-- "Recently deleted" for up to 7 days. There is no scheduled job (no
-- pg_cron) doing the actual purge — POST /api/appointments/purge-expired
-- hard-deletes anything past its 7-day window, and the client calls that
-- route whenever a manager opens the "Recently deleted" panel, so expired
-- rows are cleaned up on next view rather than by a background timer.
-- =========================================================

alter table public.appointments add column if not exists deleted_at timestamptz;
create index if not exists appointments_deleted_at_idx on public.appointments (deleted_at);
