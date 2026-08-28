-- Dealership Appointment Board — initial schema
create extension if not exists pgcrypto;

-- =========================================================
-- users
-- =========================================================
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  pin_hash text not null,
  display_name text not null,
  role text not null check (role in ('rep', 'manager')) default 'rep',
  color_hex text not null,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Publicly-safe view (no pin_hash) used by the browser client for realtime/reads.
create or replace view public.reps as
  select id, username, display_name, role, color_hex, photo_url, active, created_at
  from public.users;

-- =========================================================
-- appointments
-- =========================================================
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.users(id) on delete cascade,
  customer_name text not null,
  vehicle text not null,
  appt_date date not null,
  appt_time time not null,
  confirmed_status text not null check (confirmed_status in ('pending', 'yes', 'no')) default 'pending',
  showed_status text not null check (showed_status in ('pending', 'yes', 'no')) default 'pending',
  sold_status text not null check (sold_status in ('pending', 'yes', 'no')) default 'pending',
  appraisal_link text,
  vauto_link text,
  crm_link text,
  crm_label text check (crm_label in ('VAN', 'DealerCentric')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists appointments_date_idx on public.appointments (appt_date);
create index if not exists appointments_rep_idx on public.appointments (rep_id);

-- =========================================================
-- tv_settings (single row)
-- =========================================================
create table if not exists public.tv_settings (
  id int primary key default 1 check (id = 1),
  layout_mode text not null check (layout_mode in ('single_list', 'columns_per_rep', 'columns_by_status')) default 'single_list',
  alerts_enabled boolean not null default false,
  alert_sound text not null check (alert_sound in ('chime', 'bell', 'soft_ping')) default 'chime',
  alert_offsets_minutes int[] not null default '{30,15}',
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

insert into public.tv_settings (id, layout_mode)
  values (1, 'single_list')
  on conflict (id) do nothing;

-- =========================================================
-- Rep photos (Storage)
-- =========================================================
insert into storage.buckets (id, name, public)
  values ('rep-photos', 'rep-photos', true)
  on conflict (id) do nothing;

drop policy if exists "rep_photos_public_read" on storage.objects;
create policy "rep_photos_public_read" on storage.objects
  for select using (bucket_id = 'rep-photos');

-- Writes to storage happen server-side with the service role key (bypasses RLS),
-- same pattern as the appointments/users tables — no anon/authenticated write policy.

-- =========================================================
-- updated_at / completed_at trigger
-- =========================================================
create or replace function public.set_appointment_timestamps()
returns trigger as $$
begin
  new.updated_at = now();
  if new.confirmed_status <> 'pending' and new.showed_status <> 'pending' and new.sold_status <> 'pending' then
    if old.completed_at is null then
      new.completed_at = now();
    end if;
  else
    new.completed_at = null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists appointments_set_timestamps on public.appointments;
create trigger appointments_set_timestamps
  before update on public.appointments
  for each row execute function public.set_appointment_timestamps();

-- =========================================================
-- Row Level Security
-- Custom PIN auth (not supabase auth) is used, so all writes happen
-- server-side with the service role key, which bypasses RLS.
-- The anon key is used only in the browser for read + realtime, so
-- select policies are permissive but no anon/authenticated write
-- policies exist (default deny).
-- =========================================================
alter table public.users enable row level security;
alter table public.appointments enable row level security;
alter table public.tv_settings enable row level security;

-- No select policy on public.users itself (pin_hash must never reach the client).
-- The `reps` view is owned by postgres and exposes only safe columns.
grant select on public.reps to anon, authenticated;

drop policy if exists "appointments_select_all" on public.appointments;
create policy "appointments_select_all" on public.appointments
  for select using (true);

drop policy if exists "tv_settings_select_all" on public.tv_settings;
create policy "tv_settings_select_all" on public.tv_settings
  for select using (true);

-- =========================================================
-- Realtime
-- =========================================================
alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.tv_settings;
