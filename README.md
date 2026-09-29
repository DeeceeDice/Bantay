# Bantay

**Real-time community hazard mapping for the Philippines.**

Bantay ("to watch over") helps commuters, students and residents find out which
roads are flooded, blocked or dangerous during typhoons — before they leave the
house. Anyone can report a hazard; barangay officials and school admins verify
it; everyone nearby sees it on a live map.

---

## Getting the app

**Android — download and install**

1. On your Android phone, open the [latest release](../../releases/latest) of
   this repository.
2. Tap `bantay-<version>-build<N>.apk`, then open the download and allow
   installing from your browser when asked. Later builds install over it.
3. Sign up in the app. The same email and password sign in to
   [Bantay Admin](https://github.com/DeeceeDice/Bantay_Admin), the officials'
   console, which shares the same database.

A new APK is published automatically on every push to `main` that changes
the app (see [docs/RELEASING.md](docs/RELEASING.md)).

---

## What it does

**Map** — a live hazard map with colour-coded pins: red for verified hazards,
orange for reports still awaiting verification, green for safe spots, blue for
you. Tap any pin for the photo, severity, timestamp and who verified it.

**Am I Safe Here?** — scans your alert radius and tells you plainly whether
anything verified is near you, with a jump-to-hazard action if there is.

**Report a hazard** — a four-step flow: place the pin, pick the hazard type,
pick the severity, attach a photo and an optional note. Your report appears on
the map immediately as an orange pin.

**Verification** — officials and school admins get a panel listing pending
reports in their assigned area, worst first, with the evidence attached.
Verifying turns the pin red for everyone; rejecting removes it.

**Community confirmation** — anyone can answer "Is this still here?" on a pin.
One vote per person, so the counter means something.

**Alerts** — a feed of verified hazards, typhoon warnings and safe-spot
changes, filterable down to just your saved routes.

**Safe spots** — browsable malls, schools, evacuation centres and covered
terminals, sorted by distance, with a subscribe toggle for status changes.

**Saved routes** — save your daily commute and it shows a live "Clear" or
"2 hazards" badge, measured against the actual route line rather than just its
endpoints.

**Profile** — role badge, report stats, a trust score derived from your
verified-to-rejected ratio, "My area" for the alerts you follow, and an
English / Filipino toggle that translates the whole interface.

---

## Two things worth knowing

**One database, shared with Bantay Admin.** Accounts, reports, verification,
alerts and subscriptions live in one Supabase project, so every phone sees the
same map and officials review reports in Bantay Admin. See
[mobile/README.md](mobile/README.md) and
[docs/SHARED_DATABASE.md](docs/SHARED_DATABASE.md).

**The map needs no SDK.** It is a self-contained tile renderer
([`mobile/src/components/map/`](mobile/src/components/map/)) drawing CARTO's
Voyager basemap (OpenStreetMap data from a CDN). Tile requests carry the
project's CARTO key from `mobile/app.json` (`expo.extra.carto.apiKey`); with
no key they still load, as the public basemap. CARTO's free basemaps are meant for non-commercial use at moderate
volume; for a large public release take a CARTO plan or point
[`tileSource.ts`](mobile/src/components/map/tileSource.ts) at another provider
(MapTiler, Stadia Maps, Thunderforest) - a one-line change.

---

## Building from source

```bash
git clone https://github.com/DeeceeDice/Bantay.git
cd Bantay/mobile
npm install
npx expo start           # press `a` for an Android device or emulator

npm run typecheck        # tsc, strict
npm run lint             # eslint
npm test                 # the test suite
```

See [mobile/README.md](mobile/README.md) for the app and
[mobile/docs/SUPABASE.md](mobile/docs/SUPABASE.md) for the database.

---

## Project layout

```
mobile/         The Android app (React Native / Expo)
supabase/       The shared database: migrations, seed, rule tests
docs/           The shared-database contract and the release guide
```

---

## Design

Brand colours are deep red `#C8102E` and blue `#1B4FA0`, from the logo's red
map-pin pupil inside a blue eye. Orange `#F4772E` and green `#2E9E44` are
reserved exclusively for hazard state — pending and verified-safe — so a
glance at the map is never ambiguous. Tap targets are at least 48dp, because
this app gets used one-handed, outdoors, in the rain, in a hurry.

---

## Licence

See [LICENSE](LICENSE).
