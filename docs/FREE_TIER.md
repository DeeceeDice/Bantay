# Keeping Bantay free

Everything Bantay uses has a free tier. This page lists every service, what
is free, what the repository already does to stay inside it, and the few
switches only the account owner can set. **Do the "You set" items once**;
after that, nothing can bill.

| Service | Free allowance | Used for |
| --- | --- | --- |
| Supabase (Free plan) | 500 MB database, 1 GB file storage, 50,000 monthly active users, 5 GB egress | Accounts, reports, alerts, PSGC |
| Google Maps Platform | Per SKU per month: 10,000 Essentials calls, 5,000 Pro calls, 100,000 2D map tiles | Place search, street routes, placement-map tiles |
| CARTO Voyager basemap | Free for non-commercial use; requests carry the project's CARTO key | The map picture |
| PSA PSGC API | Free with a token | Barangay list (loaded once into Supabase) |
| GitHub Actions (private repo) | 2,000 minutes and 500 MB artifact storage a month | CI and the APK build |
| GitHub Releases | Free, no storage limit on release files | APK downloads |

---

## Google Maps Platform

Google needs a billing account on the project, but since March 2025 each
SKU has its own free monthly cap, and nothing is charged below it. Bantay
uses three SKUs:

| Call | SKU | Free / month | Bantay stops at |
| --- | --- | --- | --- |
| Place search (`places:searchText`, name + address + location) | Places API (New) - Text Search **Pro** | 5,000 | 4,500 |
| Street route (`computeRoutes`, no traffic, no waypoints) | Routes API - Compute Routes **Essentials** | 10,000 | 9,000 |
| Map tiles on the pin-placement maps | Map Tiles API - **2D Map Tiles** | 100,000 tiles | 900 map views |

**Already done in the code**

- Every Google call first takes a ticket from the shared database
  (`claim_api_call`, migration `20260928140000_free_tier_guard.sql`). The
  counter covers all phones together and stops 10% below the free cap.
  When it says no - or cannot be reached - the call is not made:
  - search uses the built-in Manila places and your safe spots,
  - directions say this month's free routing is used up, and **Open in
    Google Maps** still works (a plain link, never billed),
  - placement maps use the CARTO basemap,
  - a barangay access request is filed without a map centre (the super
    admin picks the zone).
- Routes are requested **without traffic** (`TRAFFIC_UNAWARE`) and without
  waypoints, which keeps them on the Essentials SKU (traffic would move
  them to Pro, with half the free allowance).
- A search or route already fetched is reused for the rest of the session
  instead of paid for again; search waits for a pause in typing and at
  least 3 letters.
- This month's usage: `select * from api_usage_this_month();` in the SQL
  editor (or `rpc('api_usage_this_month')` from either app).
- To change a limit: `update api_limits set monthly_limit = ... where api = '...';`
  in the SQL editor (clients cannot change it).

**You set (Google Cloud console, project that owns the key)**

1. **APIs & Services -> Credentials -> the key -> API restrictions ->
   Restrict key** to exactly: *Places API (New)*, *Routes API*, *Map Tiles
   API*. Nothing else can then be billed through this key.
2. **Application restrictions -> Android apps**: package
   `com.deeceedice.bantay` plus the SHA-1 of the signing certificate (the
   APK workflow's debug keystore). Other apps then cannot use the key.
   (Skip this while testing in Expo Go, which is a different app.)
3. **The hard stop - per-day quotas.** *IAM & Admin -> Quotas & System
   Limits*, filter by each API, edit the *per day* request limit:

   | API | Quota | Set to |
   | --- | --- | --- |
   | Places API (New) | Text Search requests per day | **150** |
   | Routes API | Compute Routes requests per day | **300** |
   | Map Tiles API | 2D tile requests per day | **3,000** |

   30 days at those limits stays under every free cap, and Google refuses
   the call - it does not bill it - once a day's quota is used. This is the
   one guarantee nothing on a phone can get around.
4. **Billing -> Budgets & alerts**: a budget of the smallest amount
   (e.g. 1 USD/PHP 50) with alerts at 50%, 90%, 100%. A budget only emails,
   it does not stop anything - step 3 is what stops spending.
5. Do **not** enable other Maps APIs on the project, and do not turn on
   traffic, waypoints or extra Places fields in the code without updating
   the table above.

---

## Supabase

**Already done:** the database is about 20 MB of the 500 MB allowance
(PSGC is 8.6 MB), no files are stored (report photos are small inline
images), and the free-tier counter above is two small tables.

**You set:** keep the organisation on the **Free plan** (Dashboard ->
Organization -> Billing). The Free plan has no overage charges: at a limit,
Supabase restricts the project instead of billing. If the organisation is
ever moved to Pro, turn the **Spend Cap** on. A Free project pauses after
a week with no requests; opening the app or the dashboard wakes it.

---

## GitHub Actions

**Already done**

- CI no longer uploads a bundle artifact; the APK artifact is kept for 1
  day (the Release keeps the APK for good, and release files are free).
- 87 old artifacts (2.2 GB, mostly from the earlier Flutter builds) were
  deleted - the account was far over the 500 MB free storage.
- The APK build caches Gradle between runs, skips pushes that only change
  tests or docs, and has a 45-minute timeout; CI jobs time out after 15
  and 10 minutes, so a stuck job cannot eat the month's minutes.

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
