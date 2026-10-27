-- ============================================================================
-- Bantay - say whether a report has a photo without sending the photo
--
-- A report's photo travels inside its row as a JPEG data URI (about 100 KB;
-- see mobile/src/core/utils/reportPhoto.ts). Reading `select *` on reports
-- therefore downloaded every photo on every load, which on Supabase's free
-- 5 GB of monthly egress does not survive a busy storm.
--
-- The apps now read reports without `photo_uri` and fetch one photo only when
-- someone opens that report. `has_photo` is what lets a list or a map card
-- know there is a photo to fetch. It is generated, so no client can write it
-- and it can never disagree with `photo_uri`.
--
-- Additive: older builds of Bantay and Bantay Admin keep working unchanged.
-- ============================================================================

alter table public.reports
  add column if not exists has_photo boolean
  generated always as (photo_uri is not null) stored;
