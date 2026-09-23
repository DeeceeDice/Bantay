# Connecting Bantay to Supabase

The app runs with **no backend at all** out of the box — everything is stored
on the device. Follow these steps only when you want real accounts and data
shared between phones.

**Time:** about 20 minutes. **Cost:** ₱0. No credit card.

The app detects Supabase automatically: if the two environment variables in
step 5 are set it uses Supabase, otherwise it falls back to on-device storage.
There is no switch to flip in the code.

### Where the database lives in this repository

```
supabase/
  config.toml                                   marks this a Supabase project
  migrations/
    20260923120000_bantay_initial_schema.sql    tables, RLS, trigger, realtime
  seed.sql                                      sample spots and hazards
```

It sits at the repository root rather than inside `mobile/`, because the
database is shared infrastructure: the Flutter build, the Expo build and the
dashboard all talk to the same Postgres.

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

You should see `Success. No rows returned`.

This creates 8 tables, turns on Row Level Security for every one of them, adds
14 access policies, creates the trigger that makes a profile row on signup,
and enables realtime. It is safe to run more than once.

---

## Step 3 — Add the sample data

1. **SQL Editor** → **New query** again.
2. Paste all of `supabase/seed.sql` (repository root).
3. **Run**.

Check it worked: **Table Editor** → `safe_spots` should show 8 rows, and
`reports` should show 5.

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

In the `mobile/` folder create a file called `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key...
```

The `EXPO_PUBLIC_` prefix is required — it is what tells Expo to make the
value available to app code.

`.env` is already in `.gitignore`, so your keys will not be committed.

Now restart with the cache cleared, or Expo will keep serving the old bundle
that had no keys in it:

```bash
npx expo start --clear
```

---

## Step 6 — Check it worked

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
4. In the app, open **Profile** and scroll to the bottom. It should read
   `Bantay 1.0.0 · Supabase` instead of `· on-device`.

That last line is the quickest way to tell which backend you are on.

### Or check it from the terminal

```bash
cd mobile
npm run check:supabase
```

This reads the same `.env` the app does and reports, in order: whether the
keys are present and are the *anon* key rather than the service key, whether
the project answers, whether all 8 tables exist, and whether Row Level
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

1. Install the app on **two** devices (or one phone and one simulator).
2. Sign up as two different accounts, e.g. `commuter@test.com` and
   `official@test.com`.
3. On the **official** account, pick **Barangay Official** at role selection.
   (If you already chose Commuter: Profile → Change role.)
4. On the **commuter** phone: tap the red **+**, file a hazard with a photo.
   It appears as an orange pin.
5. On the **official** phone: Profile → **Verification Panel**. The report is
   in the queue. Tap **Verify**.
6. Watch the **commuter** phone. The pin turns red on its own, with no
   refresh, and an alert appears in the Alerts tab.

If the pin does not change, see Troubleshooting below.

---

## Step 8 — Optional: Google sign-in

The Google button currently returns a clear error on the Supabase backend
rather than pretending to work. To make it real:

1. Dashboard → **Authentication → Providers → Google** → enable.
2. Create OAuth credentials in the
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   and paste the client ID and secret into Supabase.
3. Add `bantay://` to the provider's redirect allow-list. The scheme is
   already registered in `app.json`.
4. Replace the body of `signInWithProvider` in
   `src/data/repositories/supabaseBackend.ts` with `supabase().auth
   .signInWithOAuth({ provider: 'google', options: { redirectTo } })`.

Email and password work without any of this, which is enough for a demo.

---

## Step 9 — Optional: real photos

Right now a report's `photo_uri` is a local file path on the device that took
it, so it does not display on a second phone. To fix that you need Storage:

1. Dashboard → **Storage → New bucket**, name it `hazard-photos`, mark it
   **Public**.
2. Upload the file after picking it, and store the returned public URL in
   `photo_uri` instead of the local path.

**Heads up on cost:** since 3 February 2026 Cloud Storage requires a linked
billing account (the Blaze-equivalent plan) even at zero usage. Your bill
stays ₱0 inside the free allowance, but you need a card on file.

**To stay completely card-free for a demo,** skip Storage: downscale the image
and store it as a base64 string in the `photo_uri` column. A ~600px JPEG fits
comfortably under Postgres row limits and nobody watching a demo can tell the
difference.

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
> accident. So a freshly connected project ends up with all 8 tables, all 14
> policies and no data at all, which looks broken and is not.
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

**"Supabase is not configured"**, or Profile still reads `· on-device`
`.env` is missing, misspelled, or the server was not restarted. The variables
must start with `EXPO_PUBLIC_`. Run `npx expo start --clear`.

The `--clear` is not optional advice. `EXPO_PUBLIC_*` values are inlined into
the bundle at build time, so a bundle built before `.env` existed stays cached
with no keys in it and the app silently falls back to on-device storage — it
looks like it works, against the wrong backend. The same applies to
`npx expo export --clear`. To confirm which bundle you actually have:

```bash
strings dist/_expo/static/js/android/*.hbc | grep -c 'supabase.co'
```

`1` means the keys made it in; `0` means you are still on a stale bundle.

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

**The verify button does nothing**
Only `barangay_official` and `school_admin` may update reports — that is the
`reports_update_verifier` policy, and it is what stops someone verifying their
own hazard. Check the account's `role` in **Table Editor → profiles**.

**Realtime does not update the other phone**
Check **Database → Publications → supabase_realtime** and confirm `reports`
is listed. Re-run the last block of the initial migration if not.

---

## What lives where

| Data | Table | Who can see it |
|---|---|---|
| Accounts and stats | `profiles` | Anyone signed in (names show on pins) |
| Hazard reports | `reports` | Anyone signed in; only verifiers may edit |
| Votes / flags | `report_votes`, `report_flags` | Anyone; one per user, enforced by the primary key |
| Safe spots | `safe_spots` | Anyone; read-only from the app |
| Saved routes | `routes` | Only you |
| Alerts | `alerts` | Only you |
| Subscriptions | `spot_subscriptions` | Only you |

The privacy guarantees in that last column are enforced by the RLS policies in
`supabase/migrations/`, not by the app code. That is deliberate: a client can
always be modified, a database policy cannot.
