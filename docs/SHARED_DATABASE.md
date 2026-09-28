# One database, two apps

Bantay (the community app, `mobile/`) and **Bantay Admin** (the moderation
console, [DeeceeDice/Bantay_Admin](https://github.com/DeeceeDice/Bantay_Admin))
are two clients of the same Supabase project. This document is the contract
between them: what the database holds, which operations exist, who may call
them, and how the console's vocabulary maps onto it.

The schema lives in [`supabase/migrations/`](../supabase/migrations). The
admin-console half is
[`20260927000000_admin_console.sql`](../supabase/migrations/20260927000000_admin_console.sql).

## The rule that shapes everything

Both apps ship the same public anon key, so a rule enforced only inside an app
is enforced nowhere - anyone can call the API directly. Every decision about
who may do what is therefore made by the database: Row Level Security,
triggers and a handful of functions. The apps only ask.

That is also why the two apps cannot drift apart. A report verified in the
console and a report verified in Bantay go through the same trigger, which
records the reviewer, alerts the reporter, updates both people's statistics
and writes the audit log.

[`supabase/tests/rules_test.py`](../supabase/tests/rules_test.py) checks all of
it - 71 checks, each run as the role a real client would be - on every push.

## Accounts

There is one kind of account: a row in `auth.users` with its profile in
`public.profiles`. The same email and password sign in to both apps.

| Console role (`AdminRole`) | Database `profiles.role` | How an account gets it |
|---|---|---|
| `citizen` | `commuter` or `business_owner` | Sign up in Bantay. The owner can switch between these two. |
| `barangay` | `barangay_official` | Access request, approved by a super admin |
| `school` | `school_admin` | Access request, approved by a super admin |
| `super` | `super_admin` | Granted by another super admin, or bootstrapped (below) |

**Nobody grants themselves a role.** A trigger (`guard_profile`) refuses any
client that tries to change its own official role, status, zone, assigned area
or report statistics. Only a super admin - through the functions below - or
the database itself can.

### How an official gets an account

1. They sign up in Bantay like anyone else: that creates the account, with a
   password only they know.
2. In Bantay, **Profile -> Change role -> Barangay Official / School Admin**,
   they pick the area they will cover and their office. That inserts a row in
   `access_requests`. A barangay official searches the PSA's list of every
   barangay (PSGC, see below) and picks theirs; a school admin picks a school
   zone.
3. A super admin approves it in the console with
   `decide_access_request(request_id, true, zone)`. The same account becomes
   an official for that zone, and gets an alert saying so. For a barangay
   request `zone` can be left null: see *Barangays from PSGC*.
4. They sign in to Bantay Admin with the email and password they already have.

This replaces the console's mock "approve generates a temporary password" and
"Invite Admin". Creating an account and choosing its password on someone
else's behalf needs Supabase's service-role key, which must never be in an app;
doing it for real means an Edge Function, which does not exist yet. Until it
does, the console should not offer those two buttons.

### The first super admin

A super admin can only be made by a super admin, so the first one is made from
the Supabase dashboard's **SQL Editor**, which the guard trusts:

```sql
update public.profiles set role = 'super_admin', status = 'active'
where email = 'you@example.com';   -- an account that has already signed up
```

## What the console can do, and how

Reads are ordinary selects; Row Level Security decides what comes back.

| Console action | Database operation | Allowed for |
|---|---|---|
| Review queue, report detail | `select` from `reports`, `report_votes`, `report_flags` | Everyone signed in |
| Verify | `update reports set status = 'verified'` | Officials inside their zone; super admins anywhere |
| Reject | `update reports set status = 'rejected', reject_reason, reject_note` | Same. `reject_reason` is required. |
| Flag (escalate) | `update reports set status = 'flagged', flag_note` | Same |
| Edit details | `update reports set type / severity / lat / lng / ...` | Super admins only. Recorded as `edited_at`. |
| Add / edit / toggle / delete a safe spot | `insert` / `update` / `delete` on `safe_spots` | Officials inside their zone; super admins anywhere |
| Users list, user detail | `select` from `profiles` | Officials and super admins (citizens see only themselves) |
| Suspend / reinstate | `rpc('admin_set_user_status', { target, new_status })` | Super admins, not on themselves |
| Change role | `rpc('admin_set_user_role', { target, new_role, zone })` | Super admins, not on themselves |
| Access requests | `select` from `access_requests`; `rpc('decide_access_request', { request_id, approve, zone, note })` | Super admins |
| Broadcast | `rpc('send_broadcast', { title, message, type, zone_ids })` | Officials (their own zone only) and super admins |
| Broadcast history | `select` from `broadcasts` | Super admins; officials see their own and their zone's |
| Audit log | `select` from `audit_log` | Super admins; officials see their own entries |
| Zones | `select` from `zones` | Everyone signed in |

A review that Row Level Security refuses is not an error in PostgREST - it
updates zero rows. The console should request `returning` rows (`.select()`)
and treat zero as refused, as Bantay does.

### What happens without the console asking

| When | The database |
|---|---|
| A report is filed | Sets it `pending`, stamps the time and the reporter's real name, assigns its zone, adds 1 to the reporter's submitted count |
| A report is verified or rejected | Records the reviewer and time, alerts the reporter (with the reason if rejected), moves both people's statistics, writes the audit log |
| A report is verified | Alerts everyone whose home area is that zone |
| A safe spot changes | Writes the audit log, alerts everyone subscribed to that spot |
| An access request is decided, or an account is suspended, reinstated or re-roled | Alerts that person, writes the audit log |
| A broadcast is sent | Delivers it as an alert to every active account in the audience, counts the recipients |
| A recipient opens a broadcast | Adds 1 to its `opened` count |

## Vocabulary mapping

The database's values are the ones Bantay has always used. The console's are
different in places; map them at its edge.

**Hazard types:** `flood` -> `flooded_road`, `power_line` -> `power_line_down`,
`bridge` -> `impassable_bridge`; `landslide`, `fallen_tree` and `other` are the
same.

**Severity** - the database has three levels, the console four:

| Console | Database |
|---|---|
| `low`, `medium` | `passable_with_caution` |
| `high` | `not_passable` |
| `critical` | `life_threatening` |

**Report status:** identical - `pending`, `verified`, `rejected`, `flagged`.
Bantay shows `flagged` as still awaiting review.

**Reject reasons:** identical - `duplicate`, `false_report`, `insufficient`,
`outdated`, `other`.

**Safe spot categories:** `evacuation` -> `evacuation_center`; `mall`,
`school` and `other` are the same. The database also has `terminal`.
The console's `active` is the database's `active`; `is_open_now` is a separate
"open right now" flag Bantay shows.

**Zones:** the database's `zones` table uses the console's zone ids
(`commonwealth`, `batasan`, `holyspirit`, `tatalon`, `malanday`, `ust`,
`bhnhs`) plus `sampaloc`, which covers Bantay's own sample data. Each is a
centre and a radius; the console's polygons can be drawn from them.

**Barangays from PSGC:** `psgc_areas` holds the Philippine Standard
Geographic Code (Q2 2026) from the Philippine Statistics Authority: all
18 regions, 82 provinces, 1,642 cities and municipalities, 14 Manila
sub-municipalities and 42,010 barangays, keyed by the PSA's 10-digit code.
Anyone may read it; only the loader writes it
(`supabase/scripts/psgc_to_sql.py`, which needs your PSA token in
`PSGC_TOKEN`; the token is not in either app or in git).

- `rpc('search_barangays', { q, max_results })` finds barangays whose name,
  city or province contain every word of `q`, most populous first.
- `zones.psgc_code` names the barangay a zone stands for. The six seeded
  barangay zones carry theirs (Commonwealth `1381300022`, Sampaloc
  `1380606000`, ...).
- An access request may carry `psgc_code` plus `center_lat` / `center_lng`,
  the centre Bantay found for it with Google Places. If a zone already
  stands for that barangay, the request is filed against it (`zone_id` is
  set on insert). If not, `decide_access_request(id, true)` with no `zone`
  creates one - id `psgc-<code>`, named `Brgy. <name>`, a 900 m radius
  around the filed centre - and makes the requester its official. With no
  centre on file, approval asks the console for a zone, as before.
- The approval's audit entry keeps `user`, `role` and `zone` and adds
  `psgc` and `zone_created`.

The console can show a request's barangay by embedding it:
`select('*, psgc:psgc_areas(code, name, city, province)')`.

**Broadcast types:** identical - `advisory`, `typhoon`, `evacuation`,
`allclear`. A `typhoon` broadcast arrives in Bantay as a typhoon warning,
the rest as broadcasts.

**Audit actions:** the database writes `verified`, `rejected`, `flagged`,
`edited`, `suspended`, `reinstated`, `role_changed`, `access_approved`,
`access_denied`, `safe_spot_added`, `safe_spot_updated`, `safe_spot_removed`,
`safe_spot_toggled` and `broadcast_sent`.

**User status:** `active` and `suspended`. The console's `invited` has no
equivalent, for the reason under *How an official gets an account*.

## Deliberately not in the database

These are console features backed by nothing real today. The database does not
pretend otherwise, and the console should not either:

- **Push and SMS delivery.** Broadcasts are delivered in-app, live through
  realtime. `broadcasts` records recipients and opens, not push or SMS
  deliveries, because nothing sends those.
- **Temporary passwords and invites** - see above.
- **Saved-route audiences.** Routes belong to individual people in Bantay;
  there is no shared route list to broadcast to. Audiences are everyone, or
  zones.
- **Service health, analytics exports and demo accounts.** The console
  simulates these. Analytics can be computed from `reports` and `audit_log`.

## Connecting the console

The console currently runs on in-memory mock data. To point it at this
database it needs `@supabase/supabase-js`, the project URL and anon key from
`mobile/app.json` (`expo.extra.supabase`), and its store's actions replaced by
the operations above. Realtime is published for `reports`, `report_votes`,
`alerts`, `safe_spots`, `access_requests`, `broadcasts` and `profiles`, so its
queue, requests and users update live.
