-- MGM & Appraisal workflow, market data capture, funnel reporting
-- MANUAL STEP REQUIRED — run this in the Supabase SQL editor.

-- =========================================================
-- appointments: new market-data + workflow columns
-- =========================================================
alter table public.appointments add column if not exists asking_price numeric;
alter table public.appointments add column if not exists market_indicates_min numeric;
alter table public.appointments add column if not exists market_indicates_max numeric;
alter table public.appointments add column if not exists title_status text check (title_status in ('clear', 'payoff'));
alter table public.appointments add column if not exists payoff_amount numeric;
alter table public.appointments add column if not exists bought_price numeric;
alter table public.appointments add column if not exists workflow_status text
  not null default 'not_started'
  check (workflow_status in ('not_started', 'mgm_in_progress', 'appraisal_in_progress', 'completed_purchase', 'exited'));
alter table public.appointments add column if not exists exit_step text;
alter table public.appointments add column if not exists exit_reason text;

-- =========================================================
-- workflow_steps — one row per (appointment, step), upserted as the rep
-- taps through the MGM/Appraisal checklist. `data` holds step-specific
-- fields (payoff amount, condition notes, OBD2 results, the three
-- return-drive answers, KBB ICO figure, established value, bought price).
-- =========================================================
create table if not exists public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  step_key text not null,
  completed_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id, step_key)
);

create index if not exists workflow_steps_appointment_idx on public.workflow_steps (appointment_id);
create index if not exists workflow_steps_key_idx on public.workflow_steps (step_key);

create or replace function public.set_workflow_step_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists workflow_steps_set_timestamp on public.workflow_steps;
create trigger workflow_steps_set_timestamp
  before update on public.workflow_steps
  for each row execute function public.set_workflow_step_timestamp();

-- =========================================================
-- dealership_settings (single row) — manager-configurable return-drive
-- questions for Appraisal step 6.
-- =========================================================
create table if not exists public.dealership_settings (
  id int primary key default 1 check (id = 1),
  return_drive_questions text[] not null default '{"Question 1","Question 2","Question 3"}',
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

insert into public.dealership_settings (id)
  values (1)
  on conflict (id) do nothing;

create or replace function public.set_dealership_settings_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists dealership_settings_set_timestamp on public.dealership_settings;
create trigger dealership_settings_set_timestamp
  before update on public.dealership_settings
  for each row execute function public.set_dealership_settings_timestamp();

-- =========================================================
-- Appraisal photos (Storage)
-- =========================================================
insert into storage.buckets (id, name, public)
  values ('appraisal-photos', 'appraisal-photos', true)
  on conflict (id) do nothing;

drop policy if exists "appraisal_photos_public_read" on storage.objects;
create policy "appraisal_photos_public_read" on storage.objects
  for select using (bucket_id = 'appraisal-photos');

-- Writes happen server-side with the service role key, same pattern as rep-photos.

-- =========================================================
-- Row Level Security — same permissive-read/no-anon-write pattern as the
-- rest of the schema (all writes go through API routes using the service
-- role key, which bypasses RLS).
-- =========================================================
alter table public.workflow_steps enable row level security;
alter table public.dealership_settings enable row level security;

drop policy if exists "workflow_steps_select_all" on public.workflow_steps;
create policy "workflow_steps_select_all" on public.workflow_steps
  for select using (true);

drop policy if exists "dealership_settings_select_all" on public.dealership_settings;
create policy "dealership_settings_select_all" on public.dealership_settings
  for select using (true);

-- =========================================================
-- Realtime
-- =========================================================
alter publication supabase_realtime add table public.workflow_steps;
alter publication supabase_realtime add table public.dealership_settings;
