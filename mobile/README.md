# Bantay — React Native (Expo)

Real-time community hazard mapping for the Philippines.

This is the React Native build. A Flutter build of the same app lives in the
repository root; the two are independent — keep whichever you prefer and
delete the other.

---

## Run it

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `a` for an Android
emulator, `i` for an iOS simulator, `w` for the browser.

**No API keys, no accounts, no backend.** The app ships with sample hazards
around Sampaloc, Manila and stores everything on the device. Every feature
works immediately — that is deliberate, so a demo needs zero setup.

To share data between phones, see **[docs/SUPABASE.md](docs/SUPABASE.md)**.
The app switches backends automatically when the Supabase environment
variables are present.

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
needs **no API key** to run, there is no per-map-view billing, and behaviour
is identical on Android, iOS and web. The cost is no vector tiles, no 3D and
no built-in routing — none of which this app needs.

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
supabase/               schema.sql and seed.sql
docs/SUPABASE.md        Step-by-step backend setup
__tests__/              58 tests
```

---

## Checks

```bash
npm run typecheck   # tsc, strict
npm run lint        # eslint, including the React Compiler rules
npm test            # 58 tests
```

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
