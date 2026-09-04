-- =========================================================
-- Stop rep deletion from permanently destroying their appointments
--
-- ⚠️  MANUAL STEP REQUIRED — run in the SQL editor
-- (https://supabase.com/dashboard/project/ufdlkaoaxrxjsnylnfop/sql/new),
-- same process as prior migrations.
--
-- appointments.rep_id had `on delete cascade`, so deleting a user row
-- hard-deleted every appointment referencing them immediately — bypassing
-- the deleted_at soft-delete/"Recently deleted" system entirely, with no
-- way to recover them from within the app. The API route now soft-deletes
-- a rep's appointments (sets deleted_at) *before* deleting the user, but
-- that alone doesn't help if the FK still cascades the row away — so the
-- FK itself changes from CASCADE to SET NULL. rep_id must be nullable for
-- that; a soft-deleted appointment with rep_id null still shows all its
-- other details (customer, vehicle, date/time, notes) in Recently
-- Deleted, just with "Unassigned" instead of a rep name once the account
-- is gone.
-- =========================================================

alter table public.appointments alter column rep_id drop not null;

alter table public.appointments drop constraint if exists appointments_rep_id_fkey;
alter table public.appointments add constraint appointments_rep_id_fkey
  foreign key (rep_id) references public.users(id) on delete set null;
