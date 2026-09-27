-- ============================================================================
-- Bantay - shared database for the Bantay Admin console
--
-- Bantay (the community app) and Bantay Admin (the moderation console) are
-- two clients of this one database. This migration adds what the console
-- needs - super admins, zones, suspensions, access requests, review reasons,
-- safe-spot management, broadcasts and an audit log - and moves every rule
-- that decides who may do what into the database itself.
--
-- That last part is the point. Both apps ship the same public anon key, so
-- anything enforced only in a client is enforced nowhere. Here:
--
--   * nobody can grant themselves an official role, reinstate themselves, or
--     edit their own report statistics - a trigger refuses it;
--   * officials can review reports and manage safe spots only inside their
--     own zone - Row Level Security refuses the rest;
--   * a suspended account can no longer report, vote or flag;
--   * the side effects of a review (the reporter's alert, both users'
--     statistics, the audit log) are written by the database, so they happen
--     the same way whichever app the reviewer used.
--
-- Idempotent, like the initial migration: safe to re-run.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Zones - the barangays and school zones an official is responsible for
-- ---------------------------------------------------------------------------
create table if not exists public.zones (
  id          text primary key,
  name        text not null,
  kind        text not null check (kind in ('barangay','school')),
  city        text not null default '',
  center_lat  double precision not null,
  center_lng  double precision not null,
  -- A radius stands in for the real boundary, the same way Bantay's
  -- assigned area already does. Swapping in LGU polygons later only changes
  -- in_zone() and nearest_zone().
  radius_m    double precision not null default 900 check (radius_m > 0),
  created_at  timestamptz not null default now()
);

insert into public.zones (id, name, kind, city, center_lat, center_lng, radius_m) values
  ('commonwealth', 'Brgy. Commonwealth',     'barangay', 'Quezon City',      14.6975, 121.0860,  900),
  ('batasan',      'Brgy. Batasan Hills',    'barangay', 'Quezon City',      14.6790, 121.0985,  900),
  ('holyspirit',   'Brgy. Holy Spirit',      'barangay', 'Quezon City',      14.6835, 121.0735,  900),
  ('tatalon',      'Brgy. Tatalon',          'barangay', 'Quezon City',      14.6205, 121.0145,  900),
  ('malanday',     'Brgy. Malanday',         'barangay', 'Marikina City',    14.6555, 121.0955,  900),
  ('sampaloc',     'Sampaloc',               'barangay', 'Manila',           14.6096, 120.9925, 1800),
  ('ust',          'UST School Zone',        'school',   'Sampaloc, Manila', 14.6096, 120.9894,  750),
  ('bhnhs',        'Batasan Hills NHS Zone', 'school',   'Quezon City',      14.6925, 121.1095,  550)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- 2. Profiles: super admins, suspension, jurisdiction, home area
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('commuter','business_owner','barangay_official','school_admin','super_admin'));

alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('active','suspended'));

-- The zone an official reviews. Set only by a super admin.
alter table public.profiles add column if not exists zone_id text
  references public.zones(id) on delete set null;
-- The area whose broadcasts a person receives. Theirs to choose.
alter table public.profiles add column if not exists home_zone_id text
  references public.zones(id) on delete set null;


-- Until now every signed-in user could read every profile, emails included.
-- Bantay only ever reads its own; the admin console's officials need to see
-- who reported what. Everyone else sees nothing.
-- (Defined after is_verifier() below; the policy is created in section 12.)

-- ---------------------------------------------------------------------------
-- 3. Helpers used by the policies below
-- ---------------------------------------------------------------------------
create or replace function public.distance_m(lat1 double precision, lng1 double precision,
                                              lat2 double precision, lng2 double precision)
returns double precision
language sql immutable
as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

create or replace function public.in_zone(lat double precision, lng double precision, zone text)
returns boolean
language sql stable
set search_path = public
as $$
  select exists (
    select 1 from zones z
    where z.id = zone
      and distance_m(lat, lng, z.center_lat, z.center_lng) <= z.radius_m
  );
$$;

create or replace function public.nearest_zone(lat double precision, lng double precision)
returns text
language sql stable
set search_path = public
as $$
  select z.id from zones z
  where distance_m(lat, lng, z.center_lat, z.center_lng) <= z.radius_m
  order by distance_m(lat, lng, z.center_lat, z.center_lng)
  limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'super_admin' and status = 'active'
  );
$$;

-- Replaces the version from the initial migration: super admins count, and a
-- suspended official stops counting.
create or replace function public.is_verifier()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role in ('barangay_official','school_admin','super_admin')
      and status = 'active'
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'active');
$$;

-- May the caller review a report, or manage a safe spot, at this point?
-- Super admins anywhere; officials inside their own zone; nobody else.
create or replace function public.can_manage_at(lat double precision, lng double precision)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_super_admin()
      or exists (
        select 1 from profiles p
        where p.id = auth.uid()
          and p.role in ('barangay_official','school_admin')
          and p.status = 'active'
          and p.zone_id is not null
          and public.in_zone(lat, lng, p.zone_id)
      );
$$;

-- Writes made by the database's own triggers and admin functions are
-- trusted; writes made directly by a client are not. Triggers are
-- recognised by nesting depth, functions by a transaction-local flag that
-- they set and clear around their own writes. A client can call this, and
-- learns only "false": it cannot raise the trigger depth, and set_config is
-- not reachable through the REST API.
create or replace function public.is_trusted_write()
returns boolean
language sql stable
as $$
  select pg_trigger_depth() > 1
      or coalesce(current_setting('bantay.trusted_write', true), '') = 'on';
$$;


-- ---------------------------------------------------------------------------
-- 4. Audit log - every moderation action, whichever app it came from
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  admin_id   uuid references public.profiles(id) on delete set null,
  action     text not null check (action in (
               'verified','rejected','flagged','edited',
               'suspended','reinstated','role_changed',
               'access_approved','access_denied',
               'safe_spot_added','safe_spot_updated','safe_spot_removed','safe_spot_toggled',
               'broadcast_sent')),
  meta       jsonb not null default '{}'::jsonb,
  report_id  uuid references public.reports(id) on delete set null,
  at         timestamptz not null default now()
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);

create or replace function public.write_audit(p_action text, p_meta jsonb, p_report uuid default null)
returns void
language sql security definer
set search_path = public
as $$
  insert into audit_log (admin_id, action, meta, report_id)
  values (auth.uid(), p_action, p_meta, p_report);
$$;
revoke execute on function public.write_audit(text, jsonb, uuid) from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- 5. Alerts: two new kinds, and a link to the broadcast that sent them
-- ---------------------------------------------------------------------------
alter table public.alerts drop constraint if exists alerts_kind_check;
alter table public.alerts add constraint alerts_kind_check check (kind in (
  'verified_hazard','typhoon_warning','safe_spot_update',
  'report_verified','report_rejected','route_status',
  'broadcast',   -- an announcement from an official or super admin
  'account'));   -- your access request was decided, or your account changed


-- ---------------------------------------------------------------------------
-- 6. Profile guard: roles, suspension, areas and statistics are not yours to
--    set. Only a super admin (or the database itself) may change them.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- The dashboard, the service role, sign-up and our own triggers and admin
  -- functions: all trusted.
  if auth.uid() is null or public.is_trusted_write() or public.is_super_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role not in ('commuter','business_owner')
       or new.status <> 'active'
       or new.zone_id is not null
       or new.reports_submitted <> 0 or new.reports_verified <> 0
       or new.reports_rejected <> 0 or new.verifications_performed <> 0 then
      raise exception 'A new account starts as a commuter with no statistics.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role
     and not (old.role in ('commuter','business_owner') and new.role in ('commuter','business_owner')) then
    raise exception 'Official roles are granted by a super admin. Request access instead.'
      using errcode = '42501';
  end if;
  if new.status is distinct from old.status then
    raise exception 'Only a super admin can suspend or reinstate an account.'
      using errcode = '42501';
  end if;
  if new.zone_id is distinct from old.zone_id
     or new.area_center_lat is distinct from old.area_center_lat
     or new.area_center_lng is distinct from old.area_center_lng
     or new.area_radius_meters is distinct from old.area_radius_meters then
    raise exception 'An official''s area is assigned by a super admin.'
      using errcode = '42501';
  end if;
  if new.reports_submitted is distinct from old.reports_submitted
     or new.reports_verified is distinct from old.reports_verified
     or new.reports_rejected is distinct from old.reports_rejected
     or new.verifications_performed is distinct from old.verifications_performed then
    raise exception 'Report statistics are kept by the database.'
      using errcode = '42501';
  end if;
  if new.email is distinct from old.email then
    raise exception 'Your email is managed by your account, not your profile.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile
  before insert or update on public.profiles
  for each row execute function public.guard_profile();


-- ---------------------------------------------------------------------------
-- 7. Reports: review outcomes, escalation, zones
-- ---------------------------------------------------------------------------
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check
  check (status in ('pending','verified','rejected','flagged'));

alter table public.reports add column if not exists zone_id text
  references public.zones(id) on delete set null;
alter table public.reports add column if not exists reject_reason text;
alter table public.reports drop constraint if exists reports_reject_reason_check;
alter table public.reports add constraint reports_reject_reason_check
  check (reject_reason is null or reject_reason in ('duplicate','false_report','insufficient','outdated','other'));
alter table public.reports add column if not exists reject_note text;
alter table public.reports add column if not exists flag_note text;
alter table public.reports add column if not exists flagged_at timestamptz;
alter table public.reports add column if not exists reviewed_by uuid
  references public.profiles(id) on delete set null;
alter table public.reports add column if not exists edited_at timestamptz;

create index if not exists reports_zone_idx on public.reports (zone_id, status);

update public.reports set zone_id = public.nearest_zone(lat, lng) where zone_id is null;

-- New reports: the database decides the status, the reporter's name and
-- the time, so a client cannot file a report that is already "verified" or
-- that claims to come from someone else.
create or replace function public.reports_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.zone_id := public.nearest_zone(new.lat, new.lng);
  if auth.uid() is not null and not public.is_trusted_write() then
    new.status        := 'pending';
    new.reported_at   := now();
    new.reporter_name := coalesce((select name from profiles where id = auth.uid()), new.reporter_name);
    new.verified_by   := null;
    new.verified_at   := null;
    new.reviewed_by   := null;
    new.reject_reason := null;
    new.reject_note   := null;
    new.flag_note     := null;
    new.flagged_at    := null;
    new.edited_at     := null;
  end if;
  return new;
end;
$$;

drop trigger if exists reports_before_insert on public.reports;
create trigger reports_before_insert
  before insert on public.reports
  for each row execute function public.reports_before_insert();

-- Reviews: officials change the outcome, never the evidence. Only a super
-- admin may correct a report's details, and that is recorded.
create or replace function public.reports_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  reviewer_name text;
  content_changed boolean :=
       new.type is distinct from old.type
    or new.severity is distinct from old.severity
    or new.lat is distinct from old.lat
    or new.lng is distinct from old.lng
    or new.address_label is distinct from old.address_label
    or new.description is distinct from old.description
    or new.photo_uri is distinct from old.photo_uri
    or new.reporter_id is distinct from old.reporter_id
    or new.reporter_name is distinct from old.reporter_name
    or new.reported_at is distinct from old.reported_at;
begin
  if auth.uid() is null or public.is_trusted_write() then
    return new;
  end if;

  if content_changed then
    if not public.is_super_admin() then
      raise exception 'Officials review a report''s outcome, not its details.'
        using errcode = '42501';
    end if;
    new.edited_at := now();
    new.zone_id := public.nearest_zone(new.lat, new.lng);
  end if;

  if new.status is distinct from old.status then
    if new.status = 'pending' then
      raise exception 'A reviewed report cannot be sent back to pending.'
        using errcode = '22023';
    end if;
    if new.status = 'rejected' and new.reject_reason is null then
      raise exception 'Choose a reason for rejecting this report.'
        using errcode = '23514';
    end if;

    select p.name || ' - ' || coalesce(z.name, p.barangay)
      into reviewer_name
      from profiles p left join zones z on z.id = p.zone_id
      where p.id = auth.uid();

    new.reviewed_by := auth.uid();
    if new.status in ('verified','rejected') then
      new.verified_by := reviewer_name;
      new.verified_at := now();
    end if;
    if new.status = 'verified' then
      new.reject_reason := null;
      new.reject_note := null;
    elsif new.status = 'flagged' then
      new.flagged_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists reports_before_update on public.reports;
create trigger reports_before_update
  before update on public.reports
  for each row execute function public.reports_before_update();

-- What a review sets in motion, written once, here, for both apps.
create or replace function public.reports_after_write()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  zone_label text;
begin
  if tg_op = 'INSERT' then
    if new.reporter_id is not null then
      update profiles set reports_submitted = reports_submitted + 1 where id = new.reporter_id;
    end if;
    return new;
  end if;

  -- Super admin corrections.
  if new.edited_at is distinct from old.edited_at and new.edited_at is not null then
    perform public.write_audit('edited',
      jsonb_build_object('type', new.type, 'street', new.address_label), new.id);
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  -- Reporter statistics follow the report between outcomes.
  if new.reporter_id is not null then
    update profiles set
      reports_verified = reports_verified
        + (case when new.status = 'verified' then 1 else 0 end)
        - (case when old.status = 'verified' then 1 else 0 end),
      reports_rejected = reports_rejected
        + (case when new.status = 'rejected' then 1 else 0 end)
        - (case when old.status = 'rejected' then 1 else 0 end)
    where id = new.reporter_id;
  end if;

  if new.status in ('verified','rejected') and new.reviewed_by is not null then
    update profiles set verifications_performed = verifications_performed + 1
      where id = new.reviewed_by;
  end if;

  -- Tell the reporter, unless they reviewed their own report.
  if new.reporter_id is not null and new.reporter_id is distinct from new.reviewed_by then
    if new.status = 'verified' then
      insert into alerts (user_id, kind, title, body, report_id)
      values (new.reporter_id, 'report_verified', 'Your report was verified',
              format('Your report at %s was verified and is now live on the map. Thank you for keeping the community safe.', new.address_label),
              new.id);
    elsif new.status = 'rejected' then
      insert into alerts (user_id, kind, title, body, report_id)
      values (new.reporter_id, 'report_rejected', 'Your report was not verified',
              format('An official reviewed your report at %s and could not confirm it (%s).%s',
                     new.address_label,
                     replace(new.reject_reason, '_', ' '),
                     coalesce(' ' || nullif(trim(new.reject_note), ''), '')),
              null);
    end if;
  end if;

  -- A verified hazard is news for everyone who follows that area.
  if new.status = 'verified' and new.zone_id is not null then
    select name into zone_label from zones where id = new.zone_id;
    insert into alerts (user_id, kind, title, body, report_id)
    select p.id, 'verified_hazard',
           format('Verified: %s at %s', replace(new.type, '_', ' '), new.address_label),
           format('Confirmed by an official in %s. Plan around it.', zone_label),
           new.id
      from profiles p
     where p.home_zone_id = new.zone_id
       and p.status = 'active'
       and p.id is distinct from new.reporter_id
       and p.id is distinct from new.reviewed_by;
  end if;

  if new.status in ('verified','rejected','flagged') then
    perform public.write_audit(new.status,
      jsonb_build_object('type', new.type, 'street', new.address_label, 'reason', coalesce(new.reject_reason, '')),
      new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists reports_after_write on public.reports;
create trigger reports_after_write
  after insert or update on public.reports
  for each row execute function public.reports_after_write();

-- Policies: suspended accounts stop contributing; reviews are zone-scoped.
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (auth.uid() = reporter_id and public.is_active_user());

drop policy if exists reports_update_verifier on public.reports;
create policy reports_update_verifier on public.reports
  for update to authenticated
  using (public.can_manage_at(lat, lng))
  with check (public.can_manage_at(lat, lng));

drop policy if exists votes_insert_own on public.report_votes;
create policy votes_insert_own on public.report_votes
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_active_user());

drop policy if exists flags_insert_own on public.report_flags;
create policy flags_insert_own on public.report_flags
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_active_user());


-- ---------------------------------------------------------------------------
-- 8. Safe spots: managed by officials in their zone and by super admins
-- ---------------------------------------------------------------------------
alter table public.safe_spots drop constraint if exists safe_spots_category_check;
alter table public.safe_spots add constraint safe_spots_category_check
  check (category in ('mall','school','evacuation_center','terminal','other'));

-- "active" is whether the spot is listed at all; is_open_now is whether it is
-- open right now. An inactive spot disappears from the community app.
alter table public.safe_spots add column if not exists active boolean not null default true;
alter table public.safe_spots add column if not exists zone_id text
  references public.zones(id) on delete set null;
alter table public.safe_spots add column if not exists photo_url text;
alter table public.safe_spots add column if not exists updated_by uuid
  references public.profiles(id) on delete set null;

update public.safe_spots set zone_id = public.nearest_zone(lat, lng) where zone_id is null;

create or replace function public.safe_spots_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.zone_id := public.nearest_zone(new.lat, new.lng);
  new.last_updated := now();
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists safe_spots_before_write on public.safe_spots;
create trigger safe_spots_before_write
  before insert or update on public.safe_spots
  for each row execute function public.safe_spots_before_write();

create or replace function public.safe_spots_after_write()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  changed text;
begin
  if tg_op = 'INSERT' then
    perform public.write_audit('safe_spot_added', jsonb_build_object('name', new.name));
    return new;
  elsif tg_op = 'DELETE' then
    perform public.write_audit('safe_spot_removed', jsonb_build_object('name', old.name));
    return old;
  end if;

  if new.active is distinct from old.active then
    perform public.write_audit('safe_spot_toggled',
      jsonb_build_object('name', new.name, 'active', new.active::text));
  else
    perform public.write_audit('safe_spot_updated', jsonb_build_object('name', new.name));
  end if;

  -- People subscribed to a spot hear when something they rely on changes.
  changed := case
    when new.active is distinct from old.active and not new.active then 'is no longer listed as a safe spot'
    when new.is_open_now is distinct from old.is_open_now and new.is_open_now then 'is now open'
    when new.is_open_now is distinct from old.is_open_now then 'is now closed'
    when new.opening_hours is distinct from old.opening_hours then 'changed its hours to ' || coalesce(new.opening_hours, 'unknown')
    when new.capacity is distinct from old.capacity then 'updated its capacity'
    else null
  end;
  if changed is not null then
    insert into alerts (user_id, kind, title, body, safe_spot_id)
    select s.user_id, 'safe_spot_update', new.name || ' ' || changed,
           'A safe spot you follow was updated by an official.', new.id
      from spot_subscriptions s
      join profiles p on p.id = s.user_id and p.status = 'active'
     where s.spot_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists safe_spots_after_write on public.safe_spots;
create trigger safe_spots_after_write
  after insert or update or delete on public.safe_spots
  for each row execute function public.safe_spots_after_write();

drop policy if exists safe_spots_select on public.safe_spots;
create policy safe_spots_select on public.safe_spots
  for select to authenticated using (active or public.is_verifier());

drop policy if exists safe_spots_insert_admin on public.safe_spots;
create policy safe_spots_insert_admin on public.safe_spots
  for insert to authenticated with check (public.can_manage_at(lat, lng));

drop policy if exists safe_spots_update_admin on public.safe_spots;
create policy safe_spots_update_admin on public.safe_spots
  for update to authenticated
  using (public.can_manage_at(lat, lng)) with check (public.can_manage_at(lat, lng));

drop policy if exists safe_spots_delete_admin on public.safe_spots;
create policy safe_spots_delete_admin on public.safe_spots
  for delete to authenticated using (public.can_manage_at(lat, lng));


-- ---------------------------------------------------------------------------
-- 9. Access requests - how an official gets an account with powers
--
--    The requester creates an ordinary account first (sign-up in Bantay),
--    then asks for a role. A super admin approves it, which grants the role
--    and the zone to that same account. No password is ever created or
--    passed around by anyone but its owner.
-- ---------------------------------------------------------------------------
create table if not exists public.access_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          text not null check (role in ('barangay_official','school_admin')),
  zone_id       text references public.zones(id) on delete set null,
  organization  text not null check (char_length(trim(organization)) between 2 and 120),
  reason        text not null default '' check (char_length(reason) <= 500),
  status        text not null default 'pending' check (status in ('pending','approved','denied')),
  submitted_at  timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    uuid references public.profiles(id) on delete set null,
  decision_note text
);

-- One open request per person.
create unique index if not exists access_requests_one_pending
  on public.access_requests (user_id) where status = 'pending';

alter table public.access_requests enable row level security;

drop policy if exists access_requests_select on public.access_requests;
create policy access_requests_select on public.access_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists access_requests_insert_own on public.access_requests;
create policy access_requests_insert_own on public.access_requests
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and decided_at is null and decided_by is null and decision_note is null
    and public.is_active_user()
  );
-- No update or delete policy: requests are decided by decide_access_request().

create or replace function public.decide_access_request(
  request_id uuid, approve boolean, zone text default null, note text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  r access_requests;
  z zones;
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
    if not found then
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

    perform public.write_audit('access_approved',
      jsonb_build_object('user', who, 'role', r.role, 'zone', z.name));
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
revoke execute on function public.decide_access_request(uuid, boolean, text, text) from public, anon;
grant execute on function public.decide_access_request(uuid, boolean, text, text) to authenticated;


-- ---------------------------------------------------------------------------
-- 10. Super admin account actions: suspend / reinstate, change role
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_user_status(target uuid, new_status text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  who text;
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can suspend or reinstate accounts.' using errcode = '42501';
  end if;
  if new_status not in ('active','suspended') then
    raise exception 'Status must be active or suspended.' using errcode = '22023';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot change your own status.' using errcode = '42501';
  end if;
  select name into who from profiles where id = target;
  if not found then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;

  perform set_config('bantay.trusted_write', 'on', true);
  update profiles set status = new_status where id = target;
  insert into alerts (user_id, kind, title, body)
  values (target, 'account',
          case new_status when 'suspended' then 'Your account was suspended' else 'Your account was reinstated' end,
          case new_status
            when 'suspended' then 'You can still see the map, but you cannot report, confirm or flag hazards until a super admin reinstates your account.'
            else 'You can report, confirm and flag hazards again.' end);
  perform public.write_audit(case new_status when 'suspended' then 'suspended' else 'reinstated' end,
    jsonb_build_object('user', who));
  perform set_config('bantay.trusted_write', 'off', true);
end;
$$;
revoke execute on function public.admin_set_user_status(uuid, text) from public, anon;
grant execute on function public.admin_set_user_status(uuid, text) to authenticated;

create or replace function public.admin_set_user_role(target uuid, new_role text, zone text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  who text;
  z zones;
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can change roles.' using errcode = '42501';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot change your own role.' using errcode = '42501';
  end if;
  if new_role not in ('commuter','business_owner','barangay_official','school_admin','super_admin') then
    raise exception 'Unknown role %.', new_role using errcode = '22023';
  end if;
  select name into who from profiles where id = target;
  if not found then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;

  perform set_config('bantay.trusted_write', 'on', true);
  if new_role in ('barangay_official','school_admin') then
    select * into z from zones where id = zone;
    if not found then
      raise exception 'Choose the zone this official will cover.' using errcode = '23502';
    end if;
    if (new_role = 'school_admin') <> (z.kind = 'school') then
      raise exception '% is not a % zone.', z.name,
        case new_role when 'school_admin' then 'school' else 'barangay' end
        using errcode = '22023';
    end if;
    update profiles set role = new_role, zone_id = z.id, barangay = z.name,
      area_center_lat = z.center_lat, area_center_lng = z.center_lng, area_radius_meters = z.radius_m
    where id = target;
  else
    update profiles set role = new_role, zone_id = null where id = target;
  end if;

  insert into alerts (user_id, kind, title, body)
  values (target, 'account', 'Your role changed',
          'A super admin changed your role. Open your profile to see what you can do now.');
  perform public.write_audit('role_changed', jsonb_build_object('user', who, 'role', new_role));
  perform set_config('bantay.trusted_write', 'off', true);
end;
$$;
revoke execute on function public.admin_set_user_role(uuid, text, text) from public, anon;
grant execute on function public.admin_set_user_role(uuid, text, text) to authenticated;


-- ---------------------------------------------------------------------------
-- 11. Broadcasts - announcements delivered as alerts in the community app
--
--    Delivery is in-app only: each recipient gets a row in `alerts`, which
--    realtime pushes to their phone while Bantay is open. There is no push
--    notification or SMS gateway behind this, so the table does not pretend
--    to count push or SMS deliveries.
-- ---------------------------------------------------------------------------
create table if not exists public.broadcasts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(trim(title)) between 3 and 80),
  message     text not null check (char_length(trim(message)) between 3 and 500),
  type        text not null check (type in ('advisory','typhoon','evacuation','allclear')),
  audience    text not null check (audience in ('all','zones')),
  zone_ids    text[] not null default '{}',
  sent_by     uuid references public.profiles(id) on delete set null,
  sent_at     timestamptz not null default now(),
  recipients  integer not null default 0,
  opened      integer not null default 0
);

alter table public.alerts add column if not exists broadcast_id uuid
  references public.broadcasts(id) on delete cascade;

alter table public.broadcasts enable row level security;

drop policy if exists broadcasts_select on public.broadcasts;
create policy broadcasts_select on public.broadcasts
  for select to authenticated
  using (
    public.is_super_admin()
    or (public.is_verifier() and (
          sent_by = auth.uid()
          or audience = 'all'
          or (select zone_id from profiles where id = auth.uid()) = any (zone_ids)))
  );
-- No insert policy: broadcasts are sent through send_broadcast().

create or replace function public.send_broadcast(
  title text, message text, type text, zone_ids text[] default '{}')
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  me profiles;
  targets text[] := coalesce(zone_ids, '{}');
  b_id uuid;
  n integer;
  alert_kind text;
begin
  select * into me from profiles where id = auth.uid();
  if not found or me.status <> 'active'
     or me.role not in ('barangay_official','school_admin','super_admin') then
    raise exception 'Only officials and super admins can send broadcasts.' using errcode = '42501';
  end if;

  -- Officials broadcast to their own zone only; super admins anywhere.
  if me.role <> 'super_admin' then
    if me.zone_id is null then
      raise exception 'You have no assigned zone to broadcast to.' using errcode = '42501';
    end if;
    targets := array[me.zone_id];
  end if;
  if exists (select 1 from unnest(targets) t where t not in (select id from zones)) then
    raise exception 'Unknown zone in the audience.' using errcode = '22023';
  end if;

  insert into broadcasts (title, message, type, audience, zone_ids, sent_by)
  values (trim(title), trim(message), type,
          case when cardinality(targets) = 0 then 'all' else 'zones' end, targets, me.id)
  returning id into b_id;

  alert_kind := case type when 'typhoon' then 'typhoon_warning' else 'broadcast' end;

  insert into alerts (user_id, kind, title, body, broadcast_id)
  select p.id, alert_kind, trim(title), trim(message), b_id
    from profiles p
   where p.status = 'active'
     and p.id <> me.id
     and (cardinality(targets) = 0 or p.home_zone_id = any (targets));
  get diagnostics n = row_count;

  update broadcasts set recipients = n where id = b_id;
  perform public.write_audit('broadcast_sent',
    jsonb_build_object('title', trim(title), 'recipients', n::text));
  return b_id;
end;
$$;
revoke execute on function public.send_broadcast(text, text, text, text[]) from public, anon;
grant execute on function public.send_broadcast(text, text, text, text[]) to authenticated;

-- "Opened" is counted from recipients actually reading the alert.
create or replace function public.count_broadcast_open()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.broadcast_id is not null and new.is_read and not old.is_read then
    update broadcasts set opened = opened + 1 where id = new.broadcast_id;
  end if;
  return new;
end;
$$;

drop trigger if exists count_broadcast_open on public.alerts;
create trigger count_broadcast_open
  after update of is_read on public.alerts
  for each row execute function public.count_broadcast_open();


-- ---------------------------------------------------------------------------
-- 12. Read access: private profiles, readable zones, a scoped audit log
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_verifier());

alter table public.zones enable row level security;
drop policy if exists zones_select on public.zones;
create policy zones_select on public.zones for select to authenticated using (true);

alter table public.audit_log enable row level security;
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.is_super_admin() or (public.is_verifier() and admin_id = auth.uid()));


-- ---------------------------------------------------------------------------
-- 13. Realtime: the console's queue and history update live too
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['access_requests','broadcasts','profiles'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
