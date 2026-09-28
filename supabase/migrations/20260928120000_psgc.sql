-- Philippine Standard Geographic Code (PSGC), Q2 2026, from the Philippine
-- Statistics Authority.
--
-- Gives both apps the official list of every region, province, city,
-- municipality and barangay, with the PSA's own codes. Bantay uses it so a
-- barangay official can name *their* barangay - any of the 42,000 - when
-- asking for access, and approval turns it into a zone on the spot.
--
-- This migration only makes the table. The rows are loaded by
-- supabase/scripts/psgc_to_sql.py, which reads the PSA API with your token
-- (the token never goes in the app or in git). Re-running it upserts, so a
-- new PSGC release is one command.

create table if not exists public.psgc_areas (
  code            text primary key check (code ~ '^[0-9]{10}$'),
  name            text not null,
  -- PSA's geographic level: Reg, Prov, City, Mun, SubMun, Bgy (blank for the
  -- two special areas that are none of these).
  level           text not null default '',
  region_code     text not null,
  parent_code     text,
  -- Ready-made labels, so a barangay search needs no joins:
  -- city is "Quezon City" or "Sampaloc, City of Manila";
  -- province is the province, or the region where a city has none.
  city            text not null default '',
  province        text not null default '',
  urban_rural     text not null default '',
  population_2024 integer,
  version         text not null
);

create index if not exists psgc_areas_level_idx on public.psgc_areas (level);
create index if not exists psgc_areas_parent_idx on public.psgc_areas (parent_code);

-- Public reference data: anyone may read it, only the loader writes it.
alter table public.psgc_areas enable row level security;
drop policy if exists psgc_areas_select on public.psgc_areas;
create policy psgc_areas_select on public.psgc_areas
  for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.psgc_areas from anon, authenticated;
grant select on public.psgc_areas to anon, authenticated;

-- Barangay search: every word must appear in the barangay, city or province
-- name, so "commonwealth quezon" finds exactly one. Exact and prefix matches
-- come first, then the most populous.
create or replace function public.search_barangays(q text, max_results integer default 20)
returns table (code text, name text, city text, province text)
language sql stable
set search_path = public
as $$
  with words as (
    select w from unnest(string_to_array(lower(trim(coalesce(q, ''))), ' ')) as w
    where w <> ''
  ), first_word as (
    select coalesce((select w from words limit 1), '') as w
  )
  select a.code, a.name, a.city, a.province
  from psgc_areas a, first_word f
  where a.level = 'Bgy'
    and char_length(trim(coalesce(q, ''))) >= 2
    and not exists (
      select 1 from words
      where position(words.w in lower(a.name || ' ' || a.city || ' ' || a.province)) = 0)
  order by
    lower(a.name) = lower(trim(q)) desc,
    starts_with(lower(a.name), f.w) desc,
    a.population_2024 desc nulls last,
    a.name
  limit least(greatest(coalesce(max_results, 20), 1), 50);
$$;
grant execute on function public.search_barangays(text, integer) to anon, authenticated;

-- Zones name the PSGC barangay they stand for. No foreign key: the zones
-- exist before the PSGC rows are loaded.
alter table public.zones add column if not exists psgc_code text;
create unique index if not exists zones_psgc_code_key
  on public.zones (psgc_code) where psgc_code is not null;

update public.zones set psgc_code = v.code
from (values
  ('commonwealth', '1381300022'),
  ('batasan',      '1381300139'),
  ('holyspirit',   '1381300140'),
  ('tatalon',      '1381300121'),
  ('malanday',     '1380700005'),
  ('sampaloc',     '1380606000')
) as v(id, code)
where zones.id = v.id and zones.psgc_code is null;

-- An access request can name a PSGC barangay instead of an existing zone,
-- with the map centre the app found for it.
alter table public.access_requests
  add column if not exists psgc_code text references public.psgc_areas(code) on delete set null;
alter table public.access_requests
  add column if not exists center_lat double precision check (center_lat between -90 and 90);
alter table public.access_requests
  add column if not exists center_lng double precision check (center_lng between -180 and 180);

-- A request for a barangay that already has a zone is filed against that
-- zone, so the console shows it the same way as before.
create or replace function public.access_request_link_zone()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.zone_id is null and new.psgc_code is not null then
    select id into new.zone_id from zones where psgc_code = new.psgc_code;
  end if;
  return new;
end;
$$;

drop trigger if exists access_request_link_zone on public.access_requests;
create trigger access_request_link_zone
  before insert on public.access_requests
  for each row execute function public.access_request_link_zone();

-- Approving a request for a barangay with no zone yet creates the zone from
-- the PSGC name and the centre filed with the request. Everything else is
-- unchanged from the admin-console migration.
create or replace function public.decide_access_request(
  request_id uuid, approve boolean, zone text default null, note text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  r access_requests;
  z zones;
  area psgc_areas;
  created boolean := false;
  who text;
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can decide access requests.' using errcode = '42501';
  end if;

  select * into r from access_requests where id = request_id for update;
  if not found then
    raise exception 'Access request not found.' using errcode = 'P0002';
  end if;
  if r.status <> 'pending' then
    raise exception 'This request has already been decided.' using errcode = '22023';
  end if;
  select name into who from profiles where id = r.user_id;

  perform set_config('bantay.trusted_write', 'on', true);

  if approve then
    select * into z from zones where id = coalesce(zone, r.zone_id);
    if not found and zone is null and r.psgc_code is not null then
      select * into z from zones where psgc_code = r.psgc_code;
      if not found then
        select * into area from psgc_areas where code = r.psgc_code;
        if area.code is null or r.center_lat is null or r.center_lng is null then
          raise exception 'Choose the zone this official will cover: the barangay has no map centre yet.'
            using errcode = '23502';
        end if;
        insert into zones (id, name, kind, city, center_lat, center_lng, radius_m, psgc_code)
        values ('psgc-' || area.code, 'Brgy. ' || area.name, 'barangay', area.city,
                r.center_lat, r.center_lng, 900, area.code)
        returning * into z;
        created := true;
      end if;
    end if;
    if z.id is null then
      raise exception 'Choose the zone this official will cover.' using errcode = '23502';
    end if;
    if (r.role = 'school_admin') <> (z.kind = 'school') then
      raise exception '% is not a % zone.', z.name,
        case r.role when 'school_admin' then 'school' else 'barangay' end
        using errcode = '22023';
    end if;

    update profiles set
      role = r.role, status = 'active', zone_id = z.id, barangay = z.name,
      area_center_lat = z.center_lat, area_center_lng = z.center_lng,
      area_radius_meters = z.radius_m
    where id = r.user_id;

    update access_requests set
      status = 'approved', zone_id = z.id, decided_at = now(),
      decided_by = auth.uid(), decision_note = nullif(trim(note), '')
    where id = r.id;

    insert into alerts (user_id, kind, title, body)
    values (r.user_id, 'account', 'Access approved',
            format('You are now a %s for %s. Your Verification Panel is open, and the same email and password sign you in to Bantay Admin.',
                   case r.role when 'school_admin' then 'School Admin' else 'Barangay Official' end, z.name));

    -- The console reads user, role and zone; the PSGC fields are extra.
    perform public.write_audit('access_approved',
      jsonb_build_object('user', who, 'role', r.role, 'zone', z.name)
      || case when z.psgc_code is null then '{}'::jsonb
              else jsonb_build_object('psgc', z.psgc_code, 'zone_created', created) end);
  else
    update access_requests set
      status = 'denied', decided_at = now(), decided_by = auth.uid(),
      decision_note = nullif(trim(note), '')
    where id = r.id;

    insert into alerts (user_id, kind, title, body)
    values (r.user_id, 'account', 'Access request declined',
            coalesce('Reason: ' || nullif(trim(note), ''), 'A super admin reviewed your request and declined it.'));

    perform public.write_audit('access_denied',
      jsonb_build_object('user', who, 'reason', coalesce(note, '')));
  end if;

  perform set_config('bantay.trusted_write', 'off', true);
end;
$$;
