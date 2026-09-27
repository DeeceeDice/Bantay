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
safe spots or broadcast, and in which zone. What the two apps share, and how
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
filterable down to just your saved routes.

**Safe spots** — malls, schools, evacuation centres and covered terminals,
nearest first, with a subscribe toggle.

**Saved routes** — a live "Clear" / "2 hazards" badge measured against the
actual route line, not just its endpoints.

**Profile** — role badge, stats, a trust score derived from your
verified-to-rejected ratio, alert radius, and an English / Filipino toggle
that translates the whole interface.

---

## The map has no SDK

`src/components/map/` is a complete slippy map in about 600 lines: Web
Mercator projection, a gesture-driven camera, a raster tile layer and SVG
vector overlays.

Building it rather than embedding a vendor SDK buys three things: the app
needs **no API key** to run, there is no per-map-view billing, and nothing
depends on Google Play Services. The cost is no vector tiles, no 3D and no
built-in routing — none of which this app needs.

**Before you distribute the app**, change the tile source. The default points
at OpenStreetMap's volunteer-run servers, and
[their policy](https://operations.osmfoundation.org/policies/tiles/) forbids
distributing a consumer app that uses them by default. That is a licensing
rule and applies at any traffic level. Point
`src/components/map/tileSource.ts` at MapTiler, Stadia, Geoapify or
Thunderforest — a one-line change.

---

## Layout

```
app/                    Screens (expo-router file-based routing)
  (tabs)/               Map, Alerts, Safe Spots, Profile
  report.tsx            The four-step report flow
  verification.tsx      Official's queue
  directions.tsx        Route preview + simulated navigation
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
    models/             Domain types and enums
    repositories/       Backend seam, local + Supabase, pure domain logic
    seed/               Sample Manila data and the offline gazetteer
  state/                App store, location provider
scripts/                check-supabase.mjs, the connection check
docs/SUPABASE.md        Step-by-step backend setup
__tests__/              70 tests
```

The SQL is not in here. It lives in `supabase/` at the **repository root**,
because the database is shared infrastructure rather than something this app
owns:

```
supabase/config.toml    marks the repo as a Supabase project
supabase/migrations/    tables, RLS policies, trigger, realtime
supabase/seed.sql       sample spots and hazards
```

---

## Checks

```bash
npm run typecheck        # tsc, strict
npm run lint             # eslint, including the React Compiler rules
npm test                 # 70 tests
npm run check:supabase   # verifies the database connection, schema and RLS
```

`check:supabase` is the only one that needs configuration; with no `.env` it
says so and exits rather than pretending to pass.

Tests cover the Mercator projection and camera maths, geographic distance
including point-to-path, the verification loop, one-vote-per-user enforcement,
area-scoped moderation, safety checks, route hazard matching and trust-score
bounds.

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
