# Connecting Bantay to Supabase

Bantay keeps everything in one Supabase project. Creating an account writes
it to that project's `auth.users` table, the sign-up trigger writes its row in
`public.profiles`, and signing in checks the password against the database.
There is no on-device mode, no guest mode and no social sign-in button that
does not reach a real provider: an account that is not in the database does
not exist, and every screen past log-in is locked until Supabase has issued a
session.

**This repository is already connected.** `app.json` (`expo.extra.supabase`)
names the project, so a fresh clone and every build sign up and log in against
it with no setup. The steps below are for standing up a *different* project,
or rebuilding this one from scratch.

**Time:** about 20 minutes. **Cost:** ₱0. No credit card.

If neither `app.json` nor `.env` names a project, the app does not start in
some reduced mode - it shows a "not connected to a database" screen.

### Where the database lives in this repository

```
supabase/
  config.toml                                   marks this a Supabase project
  migrations/
    20260923120000_bantay_initial_schema.sql    tables, RLS, trigger, realtime
    20260927000000_admin_console.sql            what Bantay Admin shares
    20260928120000_psgc.sql                     the PSGC barangay list
  scripts/psgc_to_sql.py                        loads PSGC from the PSA API
  seed.sql                                      sample spots and hazards
```

It sits at the repository root rather than inside `mobile/`, because the
database is shared infrastructure: this app, Bantay Admin and the dashboard
all talk to the same Postgres.

There are two ways to get that SQL into a project, and they are not
alternatives so much as stages:

- **By hand**, pasting into the SQL Editor. This is steps 2 and 3 below, it
  takes two minutes, and it is the right choice for a demo.
- **Automatically**, by connecting the repository to the project so Supabase
  applies `supabase/migrations/` on every push to `main`. That is
  [Step 10](#step-10--optional-apply-migrations-automatically-from-github),
  and it is worth doing once the schema starts changing.

Connecting the repository on GitHub does **not** by itself put any tables in
the database. Until one of the two routes above has actually run, the project
is empty.

---

## Step 1 — Create the project

1. Go to [supabase.com](https://supabase.com) and sign in with GitHub.
2. Click **New project**.
3. Fill in:
   - **Name:** `bantay`
   - **Database Password:** generate one and **save it somewhere** — you
     cannot see it again, and you need it if you ever connect directly to
     Postgres.
   - **Region:** `Southeast Asia (Singapore)` — the closest to the
     Philippines, which is the difference between a snappy map and a laggy one.
4. Click **Create new project** and wait ~2 minutes while it provisions.

---

## Step 2 — Create the tables

1. In the left sidebar open **SQL Editor**.
2. Click **New query**.
3. Open `supabase/migrations/20260923120000_bantay_initial_schema.sql` from the
   repository root, copy **all** of it, paste it in.
4. Click **Run** (or Ctrl/Cmd + Enter).
5. Do the same with `supabase/migrations/20260927000000_admin_console.sql`,
   then `20260928120000_psgc.sql` and `20260928130000_psgc_search_accents.sql`. Order matters: each
   builds on the one before.

You should see `Success. No rows returned` each time.

The first creates Bantay's tables, turns on Row Level Security for every one
of them, creates the trigger that makes a profile row on signup, and enables
realtime. The second adds what the Bantay Admin console shares with it -
zones, super admins, suspensions, access requests, review reasons, broadcasts
and an audit log - and moves every rule about who may do what into the
database. Both are safe to run more than once. See
[docs/SHARED_DATABASE.md](../../docs/SHARED_DATABASE.md) for what the second
one adds and why.

---

## Step 3 — Add the sample data

1. **SQL Editor** → **New query** again.
2. Paste all of `supabase/seed.sql` (repository root).
3. **Run**.

Check it worked: **Table Editor** → `safe_spots` should show 8 rows, and
`reports` should show 5.

### Load the barangay list (PSGC)

Barangay officials pick their barangay from the PSA's Philippine Standard
Geographic Code. The migration makes the table; the rows come from the PSA
API with your token, which stays on your machine:

```bash
PSGC_TOKEN=your-psa-token python3 supabase/scripts/psgc_to_sql.py > psgc.sql
psql "$DATABASE_URL" -f psgc.sql
```

`DATABASE_URL` is under **Project Settings → Database → Connection string**.
(`psgc.sql` is about 6 MB; the SQL Editor may refuse a paste that large, so
use `psql`.) Re-run it for a new PSGC release: it updates in place.
**Table Editor** → `psgc_areas` should show 43,768 rows.

---

## Step 4 — Copy your keys

1. Sidebar → **Project Settings** (the gear) → **API**.
2. Copy these two values:

| Field in the dashboard | Looks like |
|---|---|
| **Project URL** | `https://abcdefgh.supabase.co` |
| **anon public** key | a long `eyJhbGci...` string |

> **Only ever use the `anon` key in the app.** The `service_role` key on the
> same page bypasses Row Level Security completely — putting it in a mobile
> app hands every user full read and write access to your database. It belongs
> on a server, never in a client.
>
> The anon key *is* meant to be public, which is safe precisely because step 2
> turned RLS on.

---

## Step 5 — Point the app at your project

The project every build uses is set in `mobile/app.json`:

```json
"extra": {
  "supabase": {
    "url": "https://abcdefgh.supabase.co",
    "anonKey": "eyJhbGciOi...your-anon-key..."
  }
}
```

Committing these is deliberate: the anon key is public by design, it ships
inside every build anyway, and Row Level Security is what protects the data.
Never put the `service_role` key here - `npm test` fails if the key in
`app.json` is anything but an anon key.

To point just your own machine at a different project, create `mobile/.env`
instead. It overrides `app.json` and is ignored by git:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key...
```

Now restart with the cache cleared, or Expo will keep serving the old bundle
that had no keys in it:

```bash
npx expo start --clear
```

---

## Step 6 — Check it worked

The connected project already has confirmation off and requires passwords of
at least 8 characters on the server, matching the sign-up screen, so the rule
cannot be skipped by calling the API directly. For a new project, set
**Authentication → Providers → Email → Minimum password length** to 8.

Before signing up, decide how accounts get confirmed. A new Supabase project
requires every sign-up to click a link in a confirmation email, and its
built-in mailer only delivers to members of your Supabase team, at about two
emails an hour. Anyone else who signs up is told the email could not be sent,
and never gets an account they can use. Pick one:

- **For a demo, turn confirmation off.** **Authentication → Providers → Email**
  → disable *Confirm email*. Sign-up then logs straight in.
- **For real users, keep it on and set up SMTP** under **Authentication →
  Emails → SMTP Settings**, then add `bantay://**` (and `exp://**` while
  testing in Expo Go) under **Authentication → URL Configuration → Redirect
  URLs**, so the confirmation link opens the app instead of `localhost:3000`.
  The app tells people to check their inbox and sends them to log in.

1. Open the app and sign up with a real email and a password of 8+ characters.
2. In the Supabase dashboard, go to **Authentication → Users**. Your account
   should be listed.
3. Go to **Table Editor → profiles**. There should be a matching row, created
   by the trigger.
4. Pick a role on the next screen, log out, and log back in. The role you
   picked should still be there - it was read back from `profiles`.

### Or check it from the terminal

```bash
cd mobile
npm run check:supabase
```

This reads the same configuration the app does (`.env`, then `app.json`)
and reports, in order: whether the
keys are present and are the *anon* key rather than the service key, whether
the project answers, whether Bantay's 8 core tables exist, and whether Row Level
Security actually refuses an anonymous reader. It exits non-zero on failure,
so CI can gate on it.

To also verify the signup trigger and the seed data, give it an account you
have already created in the app:

```bash
BANTAY_CHECK_EMAIL=you@example.com BANTAY_CHECK_PASSWORD=... npm run check:supabase
```

The RLS check is the one that earns its keep. The anon key ships inside the
app, so a project that answers happily but hands rows to a stranger is worse
than one that is simply down.

---

## Step 7 — The two-phone demo

This is the thing worth showing. Realtime is already on from step 2.

1. Install the app on **two** devices (or one phone and one emulator).
2. Sign up as two different accounts, e.g. `commuter@test.com` and
   `official@test.com`.
3. On the **official** account, pick **Barangay Official** at role selection,
   choose **Sampaloc** as the area and enter an office. That sends an access
   request; it does not make anyone an official by itself.
4. Approve it. A super admin does this in Bantay Admin; until the console is
   connected, run it in the **SQL Editor** (which the database trusts):

   ```sql
   select set_config('request.jwt.claims',
     json_build_object('sub', (select id from profiles where role = 'super_admin' limit 1))::text, true);
   select decide_access_request(
     (select id from access_requests where status = 'pending' order by submitted_at desc limit 1),
     true, 'sampaloc');
   ```

   That needs one super admin to exist; see "The first super admin" in
   [docs/SHARED_DATABASE.md](../../docs/SHARED_DATABASE.md). The official's
   phone gets an "Access approved" alert and its Verification Panel opens.
5. On the **commuter** phone: tap the red **+**, file a hazard in Sampaloc
   with a photo.
   It appears as an orange pin.
6. On the **official** phone: Profile → **Verification Panel**. The report is
   in the queue. Tap **Verify**.
7. Watch the **commuter** phone. The pin turns red on its own, with no
   refresh, and a "Your report was verified" alert arrives - sent by the
   database, not by the official's phone.

If the pin does not change, see Troubleshooting below.

---

## Step 8 — Optional: Google sign-in

The app does not offer Google sign-in, because the project has no Google
provider configured and a button that cannot reach Google would be a fake
door. Email and password are the only way in. To add Google for real:

1. Create OAuth credentials in the
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Dashboard → **Authentication → Providers → Google** → enable, and paste in
   the client ID and secret.
3. Add `bantay://**` under **Authentication → URL Configuration → Redirect
   URLs**. The scheme is already registered in `app.json`.
4. Add a `signInWithGoogle` method to `SupabaseAuth` that calls
   `supabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`
   and completes the redirect, then put the button back on the log-in and
   sign-up screens - only once it signs a real Google account in.

---

## Step 9 — Optional: move photos to Storage

A report's photo already reaches every device: the app downscales it to an
800px JPEG (about 100 KB) and stores it in `photo_uri` as a data URI
(`src/core/utils/reportPhoto.ts`), so officials see it in Bantay Admin and on
their own phones with no extra setup. Reports filed before this held a path on
the reporter's phone; those show "Photo unavailable" everywhere else.

That keeps the project card-free, at the cost of every report row carrying
its photo. If reports grow into the thousands, move photos to Storage:

1. Dashboard → **Storage → New bucket**, name it `hazard-photos`, mark it
   **Public**.
2. Upload the compressed file after picking it, and store the returned public
   URL in `photo_uri` instead of the data URI. Both apps already display
   `https://` photos.

**Heads up on cost:** since 3 February 2026 Cloud Storage requires a linked
billing account (the Blaze-equivalent plan) even at zero usage. Your bill
stays ₱0 inside the free allowance, but you need a card on file.

---

## Step 10 — Optional: apply migrations automatically from GitHub

Connecting the repository to the project means Supabase applies anything new
in `supabase/migrations/` whenever you push, instead of you pasting SQL.

Two things have to be true, and they are separate:

1. **The repository has to be laid out as a Supabase project** — a
   `supabase/config.toml` with a `migrations/` directory beside it. That part
   is already done and committed.
2. **The integration has to be switched on in the dashboard.** This is the
   half that cannot live in the repository.

To do the second half:

1. Supabase dashboard → **Project Settings → Integrations → GitHub**.
2. **Connect repository**, authorise the Supabase GitHub app, pick
   `DeeceeDice/Bantay`.
3. Set **Supabase directory path** to `supabase` (the repository root, which
   is where `config.toml` lives).
4. Set the **production branch** to `main`.
5. Optionally enable **branching** so pull requests get a throwaway preview
   database seeded from `seed.sql`.

After that, a push to `main` that adds a file under `supabase/migrations/`
applies it to the production database.

> **The seed does not come with it.** Supabase runs `seed.sql` for local
> development and preview branches only — never against production, because
> overwriting real rows on every deploy is not a thing anyone wants by
> accident. So a freshly connected project ends up with every table and policy
> and no data at all, which looks broken and is not.
>
> Seed production once, by hand, with step 3. After that the app has spots to
> show and the map stops looking empty.

### Adding a migration later

Never edit the initial migration once it has been applied anywhere — a
migration that has already run is history, and changing it means two databases
silently disagree about what the schema is. Add a new file instead:

```bash
supabase migration new add_barangay_boundaries
# writes supabase/migrations/<timestamp>_add_barangay_boundaries.sql
```

Filenames sort by timestamp and that ordering *is* the apply order, so keep
the generated prefix.

### Checking it actually ran

The dashboard reports the push as successful when it has applied the
migrations. Confirm it against the database rather than the green tick:

```bash
cd mobile && npm run check:supabase
```

A connected repository with a green deployment and zero tables is a state
worth being able to recognise, and section 3 of that check is what recognises
it.

---

## Troubleshooting

**"Bantay is not connected to a database"**
Neither `app.json` (`expo.extra.supabase`) nor `.env` names a project. Restore
the `extra.supabase` block in `app.json`, or check `.env` for typos - its
variables must start with `EXPO_PUBLIC_`.

**Changed `.env` or `app.json` but the app still talks to the old project**
Restart with `npx expo start --clear`. `EXPO_PUBLIC_*` values from `.env` are
inlined into the JavaScript bundle at build time, so a cached bundle keeps
whatever was there when it was built. The same applies to
`npx expo export --clear`. To see which project a built bundle uses when it
came from `.env`:

```bash
strings dist/_expo/static/js/android/*.hbc | grep -c 'supabase.co'
```

Values from `app.json` are not in the JavaScript at all - they travel in the
app manifest - so to check those, run `npx expo config --type public` and
look at `extra.supabase`.

**`new row violates row-level security policy`**
You are signed out, or writing a row that belongs to someone else. Check
**Authentication → Users** and confirm you are logged in.

**Sign-up succeeds but no profile appears**
The trigger from step 2 did not run. Re-apply the initial migration and check
**Database → Triggers** for `on_auth_user_created`. The app creates a missing
row itself the next time that account logs in, so an account made before the
trigger existed still works, but new accounts should get one from the trigger.

**"Check your email" after signing up**
The project requires email confirmation, which is the default. The account
exists and can log in once the link is opened. See step 6 to turn
confirmation off for a demo, or to set up the mail and redirect it needs.

**"The confirmation email could not be sent"**
Supabase's built-in mailer only sends to members of your Supabase team, and
only about twice an hour. Turn *Confirm email* off, or set up SMTP. See step 6.

**"Only officials can review reports, and only inside their assigned zone"**
Exactly that: a barangay official or school admin may review a report only if
it lies inside their zone, and a super admin anywhere. Check the account's
`role` and `zone_id` in **Table Editor → profiles**, and that the report is in
that zone. Roles come from an approved access request, not from the role
screen.

**"Official roles are granted by a super admin"**
Someone tried to set their own role to an official one. That is refused by
design - request access instead (Profile → Change role).

**Realtime does not update the other phone**
Check **Database → Publications → supabase_realtime** and confirm `reports`
is listed. Re-run the last block of the initial migration if not.

---

## What lives where

| Data | Table | Who can see it |
|---|---|---|
| Accounts and stats | `profiles` | You, plus officials and super admins. Role, status, zone and stats are set by the database or a super admin only. |
| Hazard reports | `reports` | Anyone signed in; only officials in the report's zone, or a super admin, may review |
| Votes / flags | `report_votes`, `report_flags` | Anyone; one per user, enforced by the primary key; not from a suspended account |
| Safe spots | `safe_spots` | Listed ones to anyone; officials manage those in their zone |
| Zones | `zones` | Anyone signed in |
| Access requests | `access_requests` | Your own; super admins decide them |
| Broadcasts | `broadcasts` | Officials and super admins; they arrive for everyone else as alerts |
| Audit log | `audit_log` | Super admins; officials see their own entries |
| Saved routes | `routes` | Only you |
| Alerts | `alerts` | Only you |
| Subscriptions | `spot_subscriptions` | Only you |

The privacy guarantees in that last column are enforced by the RLS policies in
`supabase/migrations/`, not by the app code. That is deliberate: a client can
always be modified, a database policy cannot.
