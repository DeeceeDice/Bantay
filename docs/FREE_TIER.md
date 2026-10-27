# Keeping Bantay free

Everything Bantay uses has a free tier, and nothing in the app or the public
website can run up a bill. This page lists every service, what is free, what
the repository already does to stay inside it, and the few switches only the
account owner can set.

| Service | Free allowance | Used for |
| --- | --- | --- |
| Supabase (Free plan) | 500 MB database, 1 GB file storage, 5 GB egress, 50,000 monthly active users, 500,000 Edge Function calls a month | Accounts, reports, alerts, PSGC, the `geo` function |
| Photon (photon.komoot.io) | Free, fair use | Place search, finding a barangay on the map |
| FOSSGIS OSRM (routing.openstreetmap.de) | Free, fair use | Street routes by car and on foot |
| CARTO Voyager basemap | Free for non-commercial use; requests carry the project's CARTO key | The map picture |
| PSA PSGC API | Free with a token | Barangay list (loaded once into Supabase) |
| GitHub Actions | 2,000 minutes and 500 MB artifact storage a month (private repo) | APK build, web build, database rule tests, keep-alive |
| GitHub Pages (included in the Pro plan) | Free hosting, 100 GB bandwidth a month (soft limit) | The browser app at deeceedice.github.io/Bantay |
| GitHub Releases | Free, no storage limit on release files | APK downloads |

Google Maps Platform is **no longer used** - see *Google* below.

---

## Search and routing

Place search, street routing and barangay lookups go through Bantay's `geo`
Edge Function (`supabase/functions/geo`), which calls Photon and FOSSGIS
OSRM. Both are OpenStreetMap services run by volunteers for fair use, so the
function is built to be a polite caller:

- Only signed-in accounts can use it, at most 30 requests a minute each.
- Answers are cached: a search for a day, a route for ten minutes. The app
  also keeps every answer for the rest of the session and only searches after
  a pause in typing and at least 3 letters.
- Every call the cache cannot answer takes a ticket from the database's
  monthly counter (`claim_api_call`): 30,000 searches and 30,000 routes a
  month for all phones together. When the month's tickets are gone the
  function says so and the app falls back to its free paths - the built-in
  Manila places, and the "Open in Google Maps" link (a plain link, never
  billed).
- It identifies itself with a User-Agent naming Bantay, as the services ask.

This month's usage: `select * from api_usage_this_month();` in the SQL editor
(or Bantay Admin's usage panel). To change a cap:
`update api_limits set monthly_limit = ... where api = 'osm_search';`
(clients cannot change it).

**A large public release** should not lean on volunteer servers: self-host
OSRM and Photon (both are open source), or take a paid plan from a provider
such as Stadia Maps or GraphHopper. Only the function changes; no app release.

---

## Google

Bantay used Google's Places, Routes and Map Tiles APIs until October 2026.
They are gone from the app and the website, because:

- the key had to ship inside the app and the public site, where anyone could
  copy it and bill the project's Google account directly; and
- Google's terms do not allow Places or Routes results on a non-Google map,
  and Bantay draws its own OpenStreetMap map.

Copies of the app installed before the change still ask the database for a
ticket before each Google call, and the Google allowances are now 0
(migration `20261027000100_osm_geo_limits.sql`), so they are refused and use
their free fallbacks instead.

**You set:** the old key (`AIzaSyDh...`) is still in published APKs and in
git history. In Google Cloud, **APIs & Services -> Credentials**, **delete
it** (or at least restrict it to nothing). If the Google Cloud project has a
billing account only for Bantay, you can close that too.

---

## The browser app

The site at https://deeceedice.github.io/Bantay/ is public, and everything a
browser runs can be read by anyone who opens it - including the keys in
`mobile/app.json`. Both are safe to be public:

- The **Supabase anon key** is meant to be public; Row Level Security
  decides what it can do, and the `geo` function only serves signed-in
  accounts within their limits.
- The **CARTO key** only reads public map tiles.

---

## Supabase

**Already done**

- **Photos do not travel with lists.** A report's photo is a ~100 KB image
  inside its row. The apps read reports without it (the generated `has_photo`
  column says whether there is one) and fetch a photo only when someone opens
  that report, once per session. Bantay Admin's safe-spot photos are not
  downloaded by the app at all.
- **Live updates read one row, not everything.** When another phone changes
  something, realtime says which report, and the app re-reads just that
  report and its votes (or just the safe-spot list, or just your alerts),
  gathering a burst of changes into one read. Before this, every vote on
  every phone made every open copy of the app reload every report.
- **The project stays awake.** A Free project pauses after 7 days without
  requests, which locks everyone out until someone restores it. The **Keep
  database awake** workflow (`.github/workflows/keep-alive.yml`) reads one row
  every second day.
- The database is about 21 MB of the 500 MB allowance (PSGC is 8.6 MB). At
  about 100 KB a photo, roughly 4,500 photo reports fill the rest; before
  that, move photos to Storage (mobile/docs/SUPABASE.md, step 9).
- The `geo` function's calls (one per uncached search or route) are a tiny
  part of the 500,000 free Edge Function calls a month.

**You set:** keep the organisation on the **Free plan** (Dashboard ->
Organization -> Billing). The Free plan has no overage charges: at a limit,
Supabase restricts the project instead of billing. If the organisation is
ever moved to Pro, turn the **Spend Cap** on. The Free plan also allows only
two active projects per organisation; a third has to be paused (as JDM-usec
was) for Bantay to run.

---

## GitHub Actions

**Already done**

- Four workflows, each only when it has work:
  - **Android APK** - typechecks, lints and tests, then builds and publishes
    the APK, on pushes that change the app. Caches Gradle, skips test- and
    docs-only pushes, 45-minute timeout. The APK artifact is kept 1 day (the
    Release keeps the APK for good, and release files are free).
  - **Web app** - tests, exports and publishes to Pages, on pushes that
    change the app. A couple of minutes; the Pages artifact is kept 1 day.
  - **Database rules** - builds a scratch Postgres from the migrations and
    runs the rule tests, only when `supabase/` changes. Under a minute, using
    the Postgres already on the runner.
  - **Keep database awake** - a few seconds every second day.
- 87 old artifacts (2.2 GB, mostly from the earlier Flutter builds) were
  deleted - the account was far over the 500 MB free storage.

**You set:** *github.com -> Settings -> Billing and plans -> Spending
limits*: keep Actions (and Packages) at **0 USD**. With a 0 limit GitHub
stops the jobs when the free minutes run out instead of charging.

---

## CARTO

Free for non-commercial use at moderate volume, with the attribution the
map already shows. Every tile request carries the project's CARTO key
(`mobile/app.json` -> `expo.extra.carto.apiKey`), so CARTO attributes the
traffic to this project. Tiles are served with a six-month cache lifetime,
so repeat views of the same area mostly come from the CDN and the phone's
image cache rather than new requests.

**You set:** in the CARTO dashboard, keep the key on the free plan and
check its usage page now and then. The key only reads public basemap tiles
and ships inside the app, so it grants nothing else. A commercial or large
public release needs a CARTO plan or another free-tier provider in
`mobile/src/components/map/tileSource.ts`.
