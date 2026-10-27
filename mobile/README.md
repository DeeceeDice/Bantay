# Bantay — Android app (React Native / Expo)

Real-time community hazard mapping for the Philippines.

The installable APK is built from this folder and published on the
repository's Releases page on every push to `main`
(see [docs/RELEASING.md](../docs/RELEASING.md)).

---

## Run it

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your Android phone, or press `a` for an
Android emulator.

**Accounts are real.** Signing up creates an account in the project's
Supabase database and signing in checks it there - there is no on-device
mode, no guest mode and no sign-in button that does not reach a real
provider. Every screen past log-in stays locked until Supabase has issued a
session.

No setup is needed to try it: `app.json` already names the project
(`expo.extra.supabase`), and the database carries the sample hazards and safe
spots around Sampaloc, Manila. To stand up your own project, or point your
machine at another one with `.env`, see
**[docs/SUPABASE.md](docs/SUPABASE.md)**.

**Shared with Bantay Admin.** The moderation console,
[Bantay Admin](https://github.com/DeeceeDice/Bantay_Admin), uses the same
database and the same accounts. Officials are not a role you pick: choosing
Barangay Official or School Admin files an access request that a super admin
approves, and the database - not either app - decides who may review, manage
safe spots or broadcast, and in which zone. A barangay official names their
barangay from the PSA's official list (PSGC, all 42,010 barangays, loaded into
the database); if Bantay has no zone there yet, approval creates one where
OpenStreetMap finds it. What the two apps share, and how
the console's vocabulary maps onto it, is in
**[docs/SHARED_DATABASE.md](../docs/SHARED_DATABASE.md)**.

---

## What it does

**Map** — colour-coded pins: red verified hazard, orange pending report, green
safe spot, blue you. Tap any pin for the photo, severity, timestamp and who
verified it. Pinch to zoom, drag to pan.

**Am I Safe Here?** — scans your alert radius and says plainly whether
anything verified is near, with a jump-to-hazard action if so.

**Report a hazard** — four steps: place the pin, pick the type, pick the
severity, attach a photo and a note. Appears on the map immediately as an
orange pin.

**Verification** — officials and school admins get a queue of pending reports
in their assigned area, worst first, with the evidence attached. Verifying
turns the pin red for everyone.

**Community confirmation** — "Is this still here?" voting, one vote per person
so the counter means something.

**Alerts** — verified hazards, typhoon warnings and safe-spot changes,
filterable down to just your saved routes. While Bantay is open or running in
the background, a new alert also shows as a phone (or browser) notification;
see [docs/NOTIFICATIONS.md](../docs/NOTIFICATIONS.md) for what that covers and
what real push would need.

**Safe spots** — malls, schools, evacuation centres and covered terminals,
nearest first, with a subscribe toggle.

**Search** — type a place, street or business and OpenStreetMap search
(Photon) finds it, biased to where you are; a built-in list of Manila
landmarks and your safe spots answer too, and are all there is offline. Pick
a result to drop a pin and get directions to it.

**Directions** — real street routes from OpenStreetMap routing (OSRM), by car
or on foot. Bantay asks for every alternative and shows the one that passes
the fewest (and least severe) verified hazards; if every option passes one,
the hazards are named rather than hidden. Turn-by-turn is handed to the
Google Maps app with one tap - a plain link, no key, never billed.

**Saved routes** — the route you tap out is snapped to real streets, and its
live "Clear" / "2 hazards" badge is measured against that street path, not
just its endpoints.

**Profile** — role badge, stats, a trust score derived from your
verified-to-rejected ratio, alert radius, and an English / Filipino toggle
that translates the whole interface.

---

## The map has no SDK

`src/components/map/` is a complete slippy map in about 600 lines: Web
Mercator projection, a gesture-driven camera, a raster tile layer and SVG
vector overlays.

Building it rather than embedding a vendor SDK buys three things: drawing the
map needs **no API key**, there is no per-map-view billing, and nothing
depends on Google Play Services. The cost is no vector tiles and no 3D, which
this app does not need.

**Tiles come from CARTO's Voyager basemap** (OpenStreetMap data), requested
with the project's CARTO key from `app.json` → `expo.extra.carto.apiKey` (or
`EXPO_PUBLIC_CARTO_API_KEY`); without a key they load as the public basemap. The
OpenStreetMap Foundation's own servers refuse requests from apps, which is why
they are not used. CARTO's free basemaps are meant for non-commercial use at
moderate volume; for a large public release take a CARTO plan or point
`src/components/map/tileSource.ts` at MapTiler, Stadia or Thunderforest — a
one-line change.

### Search and routing: OpenStreetMap, through the `geo` function

Place search, street routing and finding a barangay on the map go through
Bantay's own Edge Function, `supabase/functions/geo` (client:
`src/data/geo/geoService.ts`), which asks free OpenStreetMap services:
**Photon** for places (Nominatim as a fallback) and **FOSSGIS OSRM** for car
and foot routes (the OSRM demo server as a fallback for car).

- **No key in the app or the website.** Nothing billable ships in either.
  (These used to be Google's Places and Routes APIs, with a key anyone could
  read out of the public site.)
- **Allowed on Bantay's map.** OpenStreetMap results may be drawn on any
  map; Google's terms do not allow Places or Routes results on a non-Google
  map, which is why Google is no longer used for them.
- **Polite and capped.** The function needs a signed-in account, allows 30
  requests a minute per account, caches answers (searches a day, routes ten
  minutes), and takes a ticket from the database's monthly counter
  (`osm_search`, `osm_route`: 30,000 each). The services are run by
  volunteers for fair use; a large public release should self-host OSRM or
  take a paid plan, which changes only the function.
- **No route, no fake route.** Offline or refused, search falls back to the
  built-in gazetteer and the directions screen says routing is unavailable,
  with the hand-off to the Google Maps app still working.

Check the function from the dashboard (**Edge Functions → geo → Test**, body
`{"action":"health"}`) or see [docs/SUPABASE.md](docs/SUPABASE.md).

---

## Layout

```
app/                    Screens (expo-router file-based routing)
  (tabs)/               Map, Alerts, Safe Spots, Profile
  report.tsx            The four-step report flow
  verification.tsx      Official's queue
  directions.tsx        Street route preview, safest alternative, Google Maps hand-off
src/
  core/
    geo/                Coordinates, distance, bearing, path maths
    map/                Mercator projection and camera (pure, testable)
    i18n/               Every string, English and Filipino
    theme/              Brand palette
    utils/              Time formatting, hazard icon/colour mapping
  components/
    map/                The map component, controller and tile source
    ui/                 Buttons, badges, cards, pins, sheets
  data/
    geo/                Place search and routing client (the geo function)
    models/             Domain types and enums
    repositories/       Backend seam, local + Supabase, pure domain logic
    seed/               Sample Manila data and the offline gazetteer
  state/                App store, location provider
scripts/                check-supabase.mjs, the connection check
docs/SUPABASE.md        Step-by-step backend setup
__tests__/              134 tests
```

The SQL is not in here. It lives in `supabase/` at the **repository root**,
because the database is shared infrastructure rather than something this app
owns:

```
supabase/config.toml    marks the repo as a Supabase project
supabase/migrations/    tables, RLS policies, trigger, realtime
supabase/functions/geo/ place search and routing (Edge Function)
supabase/seed.sql       sample spots and hazards
supabase/scripts/       psgc_to_sql.py, loads the PSGC barangay list
supabase/tests/         the database rule tests (run.sh)
```

---

## Checks

```bash
npm run typecheck        # tsc, strict
npm run lint             # eslint, including the React Compiler rules
npm test                 # 134 tests
npm run check:supabase   # verifies the database connection, schema and RLS
```

`check:supabase` is the only one that needs configuration; with no `.env` it
says so and exits rather than pretending to pass.

Tests cover the Mercator projection and camera maths, geographic distance
including point-to-path, the verification loop, one-vote-per-user enforcement,
area-scoped moderation, safety checks, route hazard matching, trust-score
bounds, applying realtime changes row by row, reading reports without their
photos, and the geo client: polyline decoding (against a real OSRM route),
path simplification and safest-route choice.

---

## Swapping the backend

`src/data/repositories/backend.ts` defines the seam. It is deliberately
*storage-level*, not operation-level: all of Bantay's rules live once in
`src/state/appStore.tsx` and the pure functions in `logic.ts`, so the local
and Supabase backends cannot disagree about behaviour — neither one implements
it.

Adding another backend means implementing `BantayBackend` and `BantayAuth`.
No screen imports storage directly.

---

## Design

Deep red `#C8102E` and blue `#1B4FA0` come from the logo — a blue eye with a
red map-pin pupil. Orange `#F4772E` and green `#2E9E44` are reserved
exclusively for hazard state, so a glance at the map is never ambiguous. Tap
targets are at least 48dp, because this app gets used one-handed, outdoors, in
the rain, in a hurry.
