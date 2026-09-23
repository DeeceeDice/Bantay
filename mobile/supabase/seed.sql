-- ============================================================================
-- Bantay - sample content
--
-- Run this AFTER schema.sql. It inserts the safe spots and a few hazards so a
-- fresh Supabase project opens onto a live-looking map instead of an empty
-- one, exactly like the on-device demo data.
--
-- Safe to re-run: every insert is keyed on a fixed id and does nothing if the
-- row already exists.
--
-- These are realistic samples, NOT live data. Hours and capacities are
-- plausible placeholders. Replace them with real LGU data before anyone
-- relies on them in a storm.
-- ============================================================================

insert into public.safe_spots
  (id, name, category, lat, lng, address_label, description, opening_hours, is_open_now, capacity, contact_number)
values
  ('11111111-1111-4111-8111-000000000001', 'SM City Manila', 'mall', 14.5896, 120.9817,
   'Natividad Lopez St, Ermita, Manila',
   'Air-conditioned mall opposite Manila City Hall. Ground floor atrium is opened to the public during storm signals.',
   'Mon-Sun, 10:00 AM - 9:00 PM', true, 800, '(02) 8528 5088'),

  ('11111111-1111-4111-8111-000000000002', 'Robinsons Place Manila', 'mall', 14.5776, 120.9847,
   'Pedro Gil cor. Adriatico St, Ermita, Manila',
   'Large covered mall with elevated parking levels used as temporary shelter during flooding.',
   'Mon-Sun, 10:00 AM - 9:00 PM', true, 1200, '(02) 8536 7809'),

  ('11111111-1111-4111-8111-000000000003', 'University of Santo Tomas', 'school', 14.6091, 120.9892,
   'España Blvd, Sampaloc, Manila',
   'Campus gymnasium is activated as an evacuation area by the Manila DRRMO during typhoon signals 2 and above.',
   'Activated during storm signals', true, 1500, '(02) 8406 1611'),

  ('11111111-1111-4111-8111-000000000004', 'Far Eastern University', 'school', 14.6042, 120.9880,
   'Nicanor Reyes St, Sampaloc, Manila',
   'Covered quadrangle and auditorium on elevated ground.',
   'Activated during storm signals', true, 900, null),

  ('11111111-1111-4111-8111-000000000005', 'Sampaloc Evacuation Center', 'evacuation_center', 14.6130, 120.9950,
   'Bgy. 395 Hall, Sampaloc, Manila',
   'Barangay-run evacuation centre with cots, potable water and a generator. Pets are allowed in the covered court.',
   'Open 24 hours', true, 250, '0917 555 0143'),

  ('11111111-1111-4111-8111-000000000006', 'Manila City Hall Covered Court', 'evacuation_center', 14.5915, 120.9812,
   'Padre Burgos Ave, Ermita, Manila',
   'City-run shelter with medical station on standby.',
   'Open 24 hours', true, 600, null),

  ('11111111-1111-4111-8111-000000000007', 'Legarda LRT-2 Station', 'terminal', 14.6005, 120.9950,
   'Legarda St, Sampaloc, Manila',
   'Elevated covered concourse. Safe waiting area when the street below is flooded.',
   'Mon-Sun, 5:00 AM - 9:30 PM', true, null, null),

  ('11111111-1111-4111-8111-000000000008', 'Blumentritt Covered Terminal', 'terminal', 14.6248, 120.9836,
   'Blumentritt Rd, Sta. Cruz, Manila',
   'Covered jeepney terminal with a raised waiting bay.',
   'Mon-Sun, 4:00 AM - 11:00 PM', false, null, null)
on conflict (id) do nothing;

-- Hazards. reporter_id is left null because these are not attributable to a
-- real account; reporter_name still shows on the pin.
insert into public.reports
  (id, type, severity, status, lat, lng, address_label, reported_at,
   reporter_id, reporter_name, description, photo_uri, verified_by, verified_at)
values
  ('22222222-2222-4222-8222-000000000001', 'flooded_road', 'not_passable', 'verified',
   14.6096, 120.9925, 'España Blvd cor. Lacson Ave, Sampaloc',
   now() - interval '24 minutes', null, 'Maria S.',
   'Knee-deep near the underpass. Jeepneys are turning around.', 'seed:flooded_road',
   'Brgy. 395 - Kgd. R. Dela Cruz', now() - interval '11 minutes'),

  ('22222222-2222-4222-8222-000000000002', 'fallen_tree', 'not_passable', 'verified',
   14.6150, 120.9910, 'Lacson Ave near Vicente Cruz, Sampaloc',
   now() - interval '2 hours', null, 'Ana R.',
   'Big acacia branch blocking the outer lane.', 'seed:fallen_tree',
   'Brgy. 468 - Official', now() - interval '1 hour 48 minutes'),

  ('22222222-2222-4222-8222-000000000003', 'power_line_down', 'life_threatening', 'verified',
   14.6042, 120.9866, 'Nicanor Reyes St (Morayta), Sampaloc',
   now() - interval '37 minutes', null, 'Carlo D.',
   'Live wire down on the sidewalk. Meralco notified.', 'seed:power_line_down',
   'Brgy. 397 - Official', now() - interval '29 minutes'),

  ('22222222-2222-4222-8222-000000000004', 'flooded_road', 'passable_with_caution', 'pending',
   14.6005, 120.9905, 'Legarda St near Mendiola, Manila',
   now() - interval '8 minutes', null, 'Ramon T.',
   'Starting to rise at the corner.', 'seed:flooded_road', null, null),

  ('22222222-2222-4222-8222-000000000005', 'landslide', 'life_threatening', 'pending',
   14.6250, 120.9830, 'Blumentritt Rd embankment, Sta. Cruz',
   now() - interval '15 minutes', null, 'Grace V.',
   'Soil collapsed onto the service road after the rain.', 'seed:landslide', null, null)
on conflict (id) do nothing;
