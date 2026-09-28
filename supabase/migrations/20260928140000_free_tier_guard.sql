-- Keeps Google Maps Platform inside its free monthly allowance.
--
-- Google gives every SKU a free monthly cap (since March 2025): 10,000 calls
-- for Essentials SKUs, 5,000 for Pro, 100,000 for 2D map tiles. Past it,
-- every call is billed. So every phone asks this database for a ticket
-- before it calls Google, and the database stops handing them out a
-- margin below the free cap - for all users together, not per phone.
--
-- When a counter runs out the app falls back to what costs nothing: the
-- built-in place list for search, the "Open in Google Maps" link for
-- directions (a plain link, never billed), the CARTO basemap for tiles.
--
-- This is the app's own brake. The hard stop is the per-day quota set on
-- the Google Cloud project itself (see docs/FREE_TIER.md), which nothing
-- running on a phone can get around.

create table if not exists public.api_limits (
  api           text primary key,
  monthly_limit integer not null check (monthly_limit >= 0),
  -- What the limit is measured against, for whoever reads this table.
  google_sku    text not null,
  free_per_month integer not null
);

insert into public.api_limits (api, monthly_limit, google_sku, free_per_month) values
  -- Text Search with name + address + location is billed as Text Search Pro.
  ('places_text_search', 4500, 'Places API (New): Text Search Pro', 5000),
  -- No traffic, no waypoints: Compute Routes Essentials.
  ('routes_compute',     9000, 'Routes API: Compute Routes Essentials', 10000),
  -- One placement map opened with Google tiles. A view loads well under 100
  -- tiles, so 900 views stay under the 100,000 free 2D tiles.
  ('map_tiles_view',      900, 'Map Tiles API: 2D Map Tiles (per ~100 tiles)', 100000)
on conflict (api) do nothing;

create table if not exists public.api_usage (
  month date not null,
  api   text not null references public.api_limits(api) on delete cascade,
  used  integer not null default 0 check (used >= 0),
  primary key (month, api)
);

-- Neither table is readable or writable by clients; only the functions below.
alter table public.api_limits enable row level security;
alter table public.api_usage enable row level security;
revoke all on public.api_limits, public.api_usage from anon, authenticated;

-- One ticket for one Google call, or false once this month's are gone.
-- Months are UTC; the 10% margin covers Google's Pacific-time month edge.
create or replace function public.claim_api_call(api text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  cap integer;
  this_month date := date_trunc('month', now() at time zone 'utc')::date;
  granted boolean;
begin
  select monthly_limit into cap from api_limits where api_limits.api = claim_api_call.api;
  if cap is null or cap = 0 then
    return false;
  end if;

  insert into api_usage as u (month, api, used)
  values (this_month, claim_api_call.api, 1)
  on conflict on constraint api_usage_pkey do update set used = u.used + 1
    where u.used < cap
  returning true into granted;

  return coalesce(granted, false);
end;
$$;
revoke execute on function public.claim_api_call(text) from public, anon;
grant execute on function public.claim_api_call(text) to authenticated;

-- This month's usage, for the console or anyone signed in who is curious.
create or replace function public.api_usage_this_month()
returns table (api text, used integer, monthly_limit integer, free_per_month integer, google_sku text)
language sql stable security definer
set search_path = public
as $$
  select l.api, coalesce(u.used, 0), l.monthly_limit, l.free_per_month, l.google_sku
  from api_limits l
  left join api_usage u
    on u.api = l.api and u.month = date_trunc('month', now() at time zone 'utc')::date
  order by l.api;
$$;
revoke execute on function public.api_usage_this_month() from public, anon;
grant execute on function public.api_usage_this_month() to authenticated;
