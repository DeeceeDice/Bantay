-- ============================================================================
-- Bantay - search and routing move from Google to OpenStreetMap services
--
-- Place search and street routing now go through the `geo` Edge Function
-- (supabase/functions/geo), which calls Photon and FOSSGIS OSRM: free,
-- OpenStreetMap-based, and allowed on a non-Google map. No API key ships in
-- the app or the public website any more.
--
-- The function takes a ticket from the same monthly counter as before
-- (claim_api_call, 20260928140000_free_tier_guard.sql) under two new names,
-- so Bantay Admin's usage panel keeps working and the volunteer-run servers
-- see a polite, capped amount of traffic.
--
-- The Google allowances drop to zero. Copies of the app installed before
-- this change still ask the counter before every Google call, so from now on
-- they are refused and fall back to their free paths (the built-in place
-- list, CARTO tiles, the "Open in Google Maps" link) - the old key stops
-- being used by Bantay at all. Delete or restrict that key in Google Cloud
-- too: it is in published builds and in git history.
-- ============================================================================

insert into public.api_limits (api, monthly_limit, google_sku, free_per_month) values
  ('osm_search', 30000, 'Photon place search (photon.komoot.io), fair use', 30000),
  ('osm_route',  30000, 'FOSSGIS OSRM routing (routing.openstreetmap.de), fair use', 30000)
on conflict (api) do nothing;

update public.api_limits set monthly_limit = 0
where api in ('places_text_search', 'routes_compute', 'map_tiles_view');
