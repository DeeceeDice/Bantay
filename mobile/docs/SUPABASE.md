# Connecting Bantay to Supabase

The app runs with **no backend at all** out of the box — everything is stored
on the device. Follow these steps only when you want real accounts and data
shared between phones.

**Time:** about 20 minutes. **Cost:** ₱0. No credit card.

The app detects Supabase automatically: if the two environment variables in
step 5 are set it uses Supabase, otherwise it falls back to on-device storage.
There is no switch to flip in the code.

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
3. Open `supabase/schema.sql` from this repo, copy **all** of it, paste it in.
4. Click **Run** (or Ctrl/Cmd + Enter).

You should see `Success. No rows returned`.

This creates 8 tables, turns on Row Level Security for every one of them, adds
14 access policies, creates the trigger that makes a profile row on signup,
and enables realtime. It is safe to run more than once.

---

## Step 3 — Add the sample data

1. **SQL Editor** → **New query** again.
2. Paste all of `supabase/seed.sql`.
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

1. Open the app and sign up with a real email and a password of 8+ characters.
2. In the Supabase dashboard, go to **Authentication → Users**. Your account
   should be listed.
3. Go to **Table Editor → profiles**. There should be a matching row, created
   by the trigger.
4. In the app, open **Profile** and scroll to the bottom. It should read
   `Bantay 1.0.0 · Supabase` instead of `· on-device`.

That last line is the quickest way to tell which backend you are on.

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

## Troubleshooting

**"Supabase is not configured"**
`.env` is missing, misspelled, or the server was not restarted. The variables
must start with `EXPO_PUBLIC_`. Run `npx expo start --clear`.

**`new row violates row-level security policy`**
You are signed out, or writing a row that belongs to someone else. Check
**Authentication → Users** and confirm you are logged in.

**Sign-up succeeds but no profile appears**
The trigger from step 2 did not run. Re-run `schema.sql` and check
**Database → Triggers** for `on_auth_user_created`.

**"Check your inbox to confirm your email"**
Supabase requires email confirmation by default. For a demo, turn it off:
**Authentication → Providers → Email** → disable *Confirm email*.

**The verify button does nothing**
Only `barangay_official` and `school_admin` may update reports — that is the
`reports_update_verifier` policy, and it is what stops someone verifying their
own hazard. Check the account's `role` in **Table Editor → profiles**.

**Realtime does not update the other phone**
Check **Database → Publications → supabase_realtime** and confirm `reports`
is listed. Re-run the last block of `schema.sql` if not.

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
`schema.sql`, not by the app code. That is deliberate: a client can always be
modified, a database policy cannot.
