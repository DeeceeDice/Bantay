# Architecture

## The shape of it

```
    Screens (lib/features/**)
        |   read state, call methods -- never touch storage
        v
    Controllers (lib/state/**)          Repositories (lib/data/repositories/**)
    settings, location, report draft,   AuthRepository        -- accounts, sessions
    navigation shell                    BantayRepository      -- all domain truth
        |                                        |
        +-----------------+----------------------+
                          v
                 LocalStore (lib/data/local/)
                          v
                  SharedPreferences
```

Everything is a `ChangeNotifier` published through `provider`. There is no
code generation, no build_runner step, and no dependency on a state-management
framework beyond `provider` itself.

## Why one repository holds all domain state

The spec's hardest requirement is that data created in one screen shows up
live in every other screen that references it: submit a report and it must
appear on the map, in the verification queue, in the alerts feed, in the
profile stats and in the saved-route status badge.

Splitting that across four repositories would mean four sources of truth and a
sync problem between them. `BantayRepository` instead owns reports, safe spots,
routes, alerts and subscriptions together, persists every mutation through
`LocalStore` *before* notifying listeners, and exposes read-only views. A
screen cannot get a stale copy because there is only one copy.

Auth is separate because it has a genuinely different lifecycle (a session
outlives any particular screen, and it is the one thing a real backend would
replace first), but `BantayRepository` holds a reference to it so verifying a
report can credit the reporter's stats in the same operation.

## The map

`lib/core/map/` is a complete slippy-map implementation in about 700 lines:

- **`map_camera.dart`** — Web Mercator projection and viewport maths. Pure,
  no Flutter dependency beyond `Offset`, and therefore directly unit-testable.
  `anchored()` is the interesting one: it returns the camera that keeps a given
  coordinate under a given screen point at a new zoom, which is what makes
  pinch-to-zoom feel right.
- **`bantay_map.dart`** — the widget. Gesture handling composes pan and zoom
  through the same `anchored()` call, so a one-finger drag and a two-finger
  pinch are the same code path. Tiles are rendered from the nearest integer
  zoom and scaled to the fractional zoom, exactly as every slippy map does.
- **`map_layers.dart`** — markers, polylines and metre-radius circles.
- **`map_tile_source.dart`** — where the tiles come from.

Building this rather than embedding a vendor SDK buys three things: the app
needs no API key to run, there is no per-map-view billing, and the behaviour is
identical on Android, iOS and web. The cost is that there is no vector
rendering, no 3D and no built-in routing — none of which this app needs.

The projection maths carries 15 unit tests, because gesture behaviour is
impossible to eyeball on a headless build but the maths underneath it is not.

## Testing strategy

Tests concentrate where bugs would be invisible or expensive:

- **Projection and camera** (`map_camera_test.dart`) — round-trips, the
  Mercator latitude limit, pinch anchoring, bounds fitting.
- **Geography** (`geo_test.dart`) — distance against known values,
  point-to-path distance (the thing route status depends on), interpolation
  clamping.
- **Domain logic** (`repository_test.dart`) — the whole report → verify →
  alert → stats loop, one-vote-per-user, area-scoped moderation, severity
  ordering, safety checks, route matching, undo.
- **Auth** (`auth_test.dart`) — hashing, session restore, trust-score bounds.
- **Flows** (`app_smoke_test.dart`) — the app boots and walks onboarding →
  sign-up → role selection, with validation, in both languages.

The widget tests earn their keep: the layout overflow in the auth footer was
found by a test, not by looking at a screen.

## Internationalisation

`lib/core/i18n/strings.dart` exposes every user-facing string as a typed
getter rather than a key lookup, so a missing or misspelled string is a
compile error instead of a blank label that only shows up in the Filipino
build. No `.arb` files, no codegen step.

The Filipino copy is code-switched the way Philippine public-safety notices
actually read — Tagalog structure, English kept for terms nobody translates in
practice ("flood", "barangay", "verified") — rather than translated literally.

## Going multi-user

The app currently stores everything on-device. Two phones each have their own
world. To make it a real shared service, reimplement two classes:

**`AuthRepository`** — replace the bodies of `signUp`, `logIn`,
`signInWithProvider` and `requestPasswordReset` with your provider's calls
(Firebase Auth, Supabase, your own API). The return types already model
success and failure, and the screens already handle both.

**`BantayRepository`** — replace `LocalStore` reads and writes with network
calls, and replace the in-memory lists with a subscription to a live query.
Because it is already a `ChangeNotifier` whose mutations persist before
notifying, streaming updates in from a server is a drop-in change: call
`notifyListeners()` when the server pushes, and every screen updates.

**No screen changes are needed.** Nothing in `lib/features/` imports
`LocalStore` or knows where data comes from.

A reasonable Firestore shape:

```
users/{userId}              profile, role, area, stats
reports/{reportId}          type, severity, status, location (geohash),
                            photoUrl, reporterId, confirmCount, votedUserIds
safeSpots/{spotId}          name, category, location, hours, isOpenNow
users/{userId}/routes/{id}  saved routes, private to the user
users/{userId}/alerts/{id}  alert feed, fanned out on write
```

Store a geohash alongside each report's coordinates so "hazards near me" is a
range query rather than a full scan, and move photos to object storage with
only the URL in the document.

## Things deliberately left simple

**Reverse geocoding** resolves against a built-in gazetteer of Manila
landmarks (`lib/data/seed/gazetteer.dart`) rather than a network geocoder. This
is on purpose: the app is most needed exactly when the network is worst, so the
offline path has to exist first. Layering a geocoding API on top, falling back
to the gazetteer, is the natural next step.

**Routing** bends a straight line away from hazards that sit on it, which
demonstrates avoidance end to end without a routing provider. Replacing
`_buildRoute` in `directions_screen.dart` with a real directions API is
self-contained — the ETA, progress and hazard warnings already work off
whatever polyline comes back.

**Barangay areas** are a radius around a point rather than real boundaries.
Swapping in LGU polygons changes one method,
`BantayRepository.pendingForOfficial`.

Each of these is a seam, not a stub: the feature works today, and the
replacement is a local change.
