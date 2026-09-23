-- ============================================================================
-- Bantay - initial schema
--
-- This is a Supabase migration. There are two ways it reaches a database:
--
--   * `supabase db push`, or the Supabase GitHub integration, which applies
--     every file in supabase/migrations/ in filename order. This is the
--     normal path once the repository is connected to a project.
--   * Pasting it into the SQL Editor by hand (Dashboard > SQL Editor > New
--     query > Run), which is the fastest way to set up a one-off project.
--
-- Either way it is idempotent: every statement guards itself, so re-running
-- it only creates what is absent. That is deliberate - a migration that
-- cannot be re-run is a migration you cannot recover with.
--
-- Security model, in one sentence: the anon key shipped in the app is public
-- by design, so every table below has Row Level Security enabled and the
-- policies - not the client - decide who may read and write what.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profiles
--    One row per auth user. Created automatically by a trigger so a user can
--    never exist without a profile.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                      uuid primary key references auth.users on delete cascade,
  name                    text        not null default '',
  email                   text        not null default '',
  role                    text        not null default 'commuter'
                            check (role in ('commuter','barangay_official','school_admin','business_owner')),
  barangay                text        not null default 'Sampaloc, Manila',
  reports_submitted       integer     not null default 0,
  reports_verified        integer     not null default 0,
  reports_rejected        integer     not null default 0,
  verifications_performed integer     not null default 0,
  auth_provider           text        default 'email',
  joined_at               timestamptz default now(),
  -- Radius stand-in for a real barangay boundary. Swapping in an LGU polygon
  -- later changes only the official-queue query.
  area_center_lat         double precision not null default 14.6096,
  area_center_lng         double precision not null default 120.9925,
  area_radius_meters      double precision not null default 3000
);

-- ---------------------------------------------------------------------------
-- 2. Hazard reports
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  type          text not null
                  check (type in ('flooded_road','landslide','fallen_tree',
                                  'power_line_down','impassable_bridge','other')),
  severity      text not null
                  check (severity in ('passable_with_caution','not_passable','life_threatening')),
  status        text not null default 'pending'
                  check (status in ('pending','verified','rejected')),
  lat           double precision not null,
  lng           double precision not null,
  address_label text not null default '',
  reported_at   timestamptz not null default now(),
  reporter_id   uuid references public.profiles(id) on delete set null,
  reporter_name text not null default 'Anonymous',
  description   text default '',
  photo_uri     text,
  verified_by   text,
  verified_at   timestamptz
);

create index if not exists reports_status_idx on public.reports (status);
create index if not exists reports_reported_at_idx on public.reports (reported_at desc);

-- ---------------------------------------------------------------------------
-- 3. Votes and flags
--    Separate tables with a composite primary key, so "one vote per user" is
--    enforced by the database rather than by client-side good manners.
-- ---------------------------------------------------------------------------
create table if not exists public.report_votes (
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  confirms  boolean not null,
  voted_at  timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table if not exists public.report_flags (
  report_id  uuid not null references public.reports(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  flagged_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 4. Safe spots (shared reference data, read-only to the app)
-- ---------------------------------------------------------------------------
create table if not exists public.safe_spots (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  category       text not null
                   check (category in ('mall','school','evacuation_center','terminal')),
  lat            double precision not null,
  lng            double precision not null,
  address_label  text not null default '',
  description    text default '',
  opening_hours  text default 'Open 24 hours',
  is_open_now    boolean not null default true,
  capacity       integer,
  contact_number text,
  last_updated   timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 5. Per-user data: saved routes, alerts, subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.routes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  label       text not null,
  start_label text not null default '',
  end_label   text not null default '',
  start_lat   double precision not null,
  start_lng   double precision not null,
  end_lat     double precision not null,
  end_lng     double precision not null,
  waypoints   jsonb default '[]'::jsonb,
  created_at  timestamptz default now()
);

create table if not exists public.alerts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade,
  kind           text not null
                   check (kind in ('verified_hazard','typhoon_warning','safe_spot_update',
                                   'report_verified','report_rejected','route_status')),
  title          text not null,
  body           text not null default '',
  created_at     timestamptz not null default now(),
  is_read        boolean not null default false,
  report_id      uuid references public.reports(id) on delete cascade,
  safe_spot_id   uuid references public.safe_spots(id) on delete cascade,
  route_id       uuid references public.routes(id) on delete cascade,
  on_saved_route boolean not null default false
);

create index if not exists alerts_user_idx on public.alerts (user_id, created_at desc);

create table if not exists public.spot_subscriptions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  spot_id uuid not null references public.safe_spots(id) on delete cascade,
  primary key (user_id, spot_id)
);

-- ---------------------------------------------------------------------------
-- 6. Auto-create a profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 7. Helper: is the caller allowed to verify reports?
-- ---------------------------------------------------------------------------
create or replace function public.is_verifier()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('barangay_official','school_admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- 8. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.reports            enable row level security;
alter table public.report_votes       enable row level security;
alter table public.report_flags       enable row level security;
alter table public.safe_spots         enable row level security;
alter table public.routes             enable row level security;
alter table public.alerts             enable row level security;
alter table public.spot_subscriptions enable row level security;

-- Profiles: everyone signed in can read (reporter names appear on pins);
-- you may only write your own row.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- Reports: readable by everyone signed in. You may file your own. Only
-- verifiers may change a report, which is what stops a reporter from
-- verifying their own hazard.
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select to authenticated using (true);

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert to authenticated with check (auth.uid() = reporter_id);

drop policy if exists reports_update_verifier on public.reports;
create policy reports_update_verifier on public.reports
  for update to authenticated using (public.is_verifier()) with check (public.is_verifier());

-- Votes and flags: readable by all, writable only as yourself. The composite
-- primary key already prevents a second vote.
drop policy if exists votes_select on public.report_votes;
create policy votes_select on public.report_votes
  for select to authenticated using (true);

drop policy if exists votes_insert_own on public.report_votes;
create policy votes_insert_own on public.report_votes
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists flags_select on public.report_flags;
create policy flags_select on public.report_flags
  for select to authenticated using (true);

drop policy if exists flags_insert_own on public.report_flags;
create policy flags_insert_own on public.report_flags
  for insert to authenticated with check (auth.uid() = user_id);

-- Safe spots: read-only reference data. Edit them in the dashboard.
drop policy if exists safe_spots_select on public.safe_spots;
create policy safe_spots_select on public.safe_spots
  for select to authenticated using (true);

-- Per-user data: strictly your own rows, for every operation.
drop policy if exists routes_own on public.routes;
create policy routes_own on public.routes
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists alerts_own on public.alerts;
create policy alerts_own on public.alerts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists subs_own on public.spot_subscriptions;
create policy subs_own on public.spot_subscriptions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 9. Realtime
--    This is what makes the two-phone demo work: one device verifies a report
--    and the other sees the pin turn red without a refresh.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- Adding a table that is already published raises an error, so each one is
-- guarded to keep this script safe to re-run.
do $$
declare
  t text;
begin
  foreach t in array array['reports','report_votes','alerts','safe_spots'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
