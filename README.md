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

**Web** — the same app runs in a browser: `cd mobile && npm install && npx expo start --web`.

**iOS** — the project is configured and builds, but Apple requires a paid
Developer Program membership and a Mac to produce an installable `.ipa`. See
[docs/RELEASING.md](docs/RELEASING.md).

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
verified-to-rejected ratio, notification preferences, alert-radius slider, and
an English / Filipino toggle that translates the whole interface.

---

## Two things worth knowing

**No API keys are required.** The map is a self-contained tile renderer
([`lib/core/map/`](lib/core/map/)) drawing OpenStreetMap tiles — not an
embedded vendor SDK. Clone the repo, run it, and you have a working map with
no billing account and no key to configure.

**Swap the tile source before you distribute the app to real users.** The
default points at the OpenStreetMap Foundation's volunteer-run tile servers,
and [their usage policy](https://operations.osmfoundation.org/policies/tiles/)
forbids distributing a consumer app that uses them by default without prior
permission. That is a licensing rule and applies at any traffic level, not
just at scale. Point it at a commercial OSM provider (MapTiler, Stadia Maps,
Geoapify, Thunderforest) or self-host - a one-line change in
[`map_tile_source.dart`](lib/core/map/map_tile_source.dart), and nothing else
in the app moves.

**One database, shared with Bantay Admin.** The app you download is the
React Native build in [`mobile/`](mobile/). Accounts, reports, verification,
alerts and subscriptions live in one Supabase project, so every phone sees the
same map and officials review reports in Bantay Admin. See
[mobile/README.md](mobile/README.md) and
[docs/SHARED_DATABASE.md](docs/SHARED_DATABASE.md).

The Flutter build at the repository root is an **offline build**: it keeps
everything on the device, so two phones running it each have their own world
and its accounts do not exist in Bantay Admin. Making it multi-user means
reimplementing two files ([`auth_repository.dart`](lib/data/repositories/auth_repository.dart)
and [`bantay_repository.dart`](lib/data/repositories/bantay_repository.dart))
against the shared database; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#going-multi-user).

---

## Building from source

The app (React Native, `mobile/`): see [mobile/README.md](mobile/README.md) -
`cd mobile && npm install && npx expo start`.

The Flutter offline build requires the [Flutter SDK](https://docs.flutter.dev/get-started/install)
3.47.5 or newer.

```bash
git clone https://github.com/DeeceeDice/Bantay.git
cd Bantay
flutter pub get

flutter run                 # on a connected device or emulator
flutter run -d chrome       # in a browser

flutter analyze             # static analysis
flutter test                # the full test suite
flutter build apk --release # a release APK in build/app/outputs/flutter-apk/
```

---

## Project layout

```
lib/
  app/          App root, theming, routing
  core/
    geo/        Coordinates, distance, bearing, path maths
    map/        The self-contained tile map: projection, camera, widget
    i18n/       Every user-facing string, in English and Filipino
    theme/      Brand palette and the Material 3 theme
    widgets/    Logo, map pins, badges, banners, shared components
    photos/     Cross-platform photo handling (conditional imports)
    utils/      Time formatting, hazard icon/colour/label mapping
  data/
    models/     Domain types, each with stable JSON identity
    local/      Key-value persistence
    repositories/  Auth, and the single source of domain truth
    seed/       Bundled Manila sample data and the offline gazetteer
  state/        Settings, location, report draft, navigation shell
  features/     One directory per screen area
test/           78 tests covering geo, projection, domain logic and flows
docs/           Architecture and release guides
```

---

## Tests

```
flutter test
```

78 tests, covering the Mercator projection and camera maths, geographic
distance including point-to-path, the full report → verify → alert → stats
loop, one-vote-per-user enforcement, area-scoped moderation, safety checks,
route hazard matching, trust-score bounds, password hashing and session
restoration, and the onboarding and sign-up flows end to end.

---

## Design

Brand colours are deep red `#C8102E` and blue `#1B4FA0`, from the logo's red
map-pin pupil inside a blue eye. Orange `#F4772E` and green `#2E9E44` are
reserved exclusively for hazard state — pending and verified-safe — so a
glance at the map is never ambiguous. Tap targets are at least 48dp and text
scaling is clamped, because this app gets used one-handed, outdoors, in the
rain, in a hurry.

---

## Licence

See [LICENSE](LICENSE).
