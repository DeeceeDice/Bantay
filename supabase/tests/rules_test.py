"""
Behaviour tests for the shared database's rules.

Runs against plain Postgres with Supabase's auth stubbed (supabase_stub.sql),
after both migrations and the seed. Every step runs as the `authenticated`
or `anon` role with a JWT subject, exactly as PostgREST runs a request from
either app, so these test what the database lets a client do - not what a
client chooses to do.

Connection comes from the standard PG* environment variables (PGHOST,
PGPORT, PGUSER, PGDATABASE, PGPASSWORD). See supabase/tests/README.md.
"""
import json, subprocess, sys, uuid

PSQL = ["psql", "-v", "ON_ERROR_STOP=1", "-X", "-q", "-tA"]
results = []

def sql(stmt, as_user=None, role="authenticated"):
    if as_user is None and role == "postgres":
        body = stmt
    else:
        claims = json.dumps({"sub": as_user, "role": role}) if as_user else "{}"
        body = (f"begin; set local role {role}; "
                f"select set_config('request.jwt.claims', '{claims}', true) \\g /dev/null\n"
                f"{stmt}\ncommit;")
    p = subprocess.run(PSQL, input=body, capture_output=True, text=True)
    return p.returncode, (p.stdout.strip(), p.stderr.strip())

def admin(stmt):
    rc, (out, err) = sql(stmt, role="postgres")
    if rc != 0:
        print("SETUP FAILED:", stmt, err); sys.exit(1)
    return out

def check(name, ok, detail=""):
    results.append(ok)
    print(("PASS  " if ok else "FAIL  ") + name + ("" if ok else f"   <-- {detail}"))

def expect_ok(name, stmt, user, expect_out=None):
    rc, (out, err) = sql(stmt, user, "authenticated" if user else "anon")
    ok = rc == 0 and (expect_out is None or out == expect_out)
    check(name, ok, err or f"got {out!r}, expected {expect_out!r}")
    return out

def expect_error(name, stmt, user, fragment, role="authenticated"):
    rc, (out, err) = sql(stmt, user, role)
    check(name, rc != 0 and fragment.lower() in err.lower(), err or f"succeeded: {out!r}")

def signup(email, name):
    uid = str(uuid.uuid4())
    admin(f"insert into auth.users (id, email, raw_user_meta_data) values ('{uid}', '{email}', '{{\"name\": \"{name}\"}}');")
    return uid

# --- accounts: every one created through the same sign-up path --------------
A = signup("ana@example.com", "Ana")        # citizen
B = signup("ben@example.com", "Ben")        # citizen following Sampaloc
R = signup("rosa@example.com", "Rosa")      # will request barangay official
S = signup("sam@example.com", "Sam")        # promoted to super admin from the dashboard
admin(f"update profiles set role = 'super_admin' where id = '{S}';")   # the documented bootstrap
print("setup: 4 accounts signed up, 1 bootstrapped to super admin\n")

check("sign-up trigger created 4 profiles as commuters",
      admin("select count(*) from profiles where role = 'commuter'") == "3"
      and admin(f"select role from profiles where id = '{S}'") == "super_admin")

# --- privilege guard ---------------------------------------------------------
expect_error("citizen cannot make themselves an official",
             f"update profiles set role = 'barangay_official' where id = '{A}';", A, "request access instead")
expect_error("citizen cannot make themselves a super admin",
             f"update profiles set role = 'super_admin' where id = '{A}';", A, "request access instead")
expect_ok("citizen can switch commuter -> business owner",
          f"update profiles set role = 'business_owner' where id = '{A}';", A)
expect_ok("...and back", f"update profiles set role = 'commuter' where id = '{A}';", A)
expect_error("citizen cannot change own status",
             f"update profiles set status = 'suspended' where id = '{A}';", A, "super admin")
expect_error("citizen cannot assign themselves a zone",
             f"update profiles set zone_id = 'sampaloc' where id = '{A}';", A, "assigned by a super admin")
expect_error("citizen cannot inflate own statistics",
             f"update profiles set reports_verified = 99 where id = '{A}';", A, "kept by the database")
expect_ok("citizen can choose a home zone for broadcasts",
          f"update profiles set home_zone_id = 'sampaloc' where id = '{B}';", B)

# --- private profiles ------------------------------------------------------
expect_ok("citizen reads own profile", "select count(*) from profiles;", A, "1")
expect_ok("super admin reads every profile", "select count(*) from profiles;", S, "4")
expect_ok("signed-out client reads nothing (anon: RLS returns 0 rows)",
          "select count(*) from profiles;", None, "0")

# --- reports -----------------------------------------------------------------
REP = str(uuid.uuid4())
expect_ok("citizen files a report (even claiming 'verified' and another name)",
          f"""insert into reports (id, type, severity, status, lat, lng, address_label, reporter_id, reporter_name, verified_by)
              values ('{REP}', 'flooded_road', 'not_passable', 'verified', 14.6100, 120.9920, 'Test St', '{A}', 'The Mayor', 'Fake');""", A)
row = admin(f"select status || '|' || reporter_name || '|' || coalesce(zone_id,'-') || '|' || coalesce(verified_by,'-') from reports where id = '{REP}'")
check("...stored as pending, under the reporter's real name, in the right zone, unverified",
      row == "pending|Ana|sampaloc|-", row)   # 60 m from Sampaloc centre, 280 m from UST
check("...and the reporter's submitted count went up",
      admin(f"select reports_submitted from profiles where id = '{A}'") == "1")
expect_error("citizen cannot file a report as someone else",
             f"insert into reports (type, severity, lat, lng, reporter_id) values ('other','not_passable',14.61,120.99,'{B}');",
             A, "row-level security")
expect_ok("citizen cannot change a report's status (RLS: 0 rows)",
          f"with u as (update reports set status = 'verified' where id = '{REP}' returning 1) select count(*) from u;", A, "0")

# --- access requests --------------------------------------------------------
expect_error("request must be for yourself",
             f"insert into access_requests (user_id, role, organization) values ('{A}', 'barangay_official', 'Brgy');",
             R, "row-level security")
expect_error("request cannot arrive pre-approved",
             f"insert into access_requests (user_id, role, organization, status) values ('{R}', 'barangay_official', 'Brgy', 'approved');",
             R, "row-level security")
REQ = expect_ok("requester submits a request for Sampaloc",
                f"insert into access_requests (user_id, role, zone_id, organization, reason) values ('{R}', 'barangay_official', 'sampaloc', 'Brgy. 395 Council', 'Kagawad for disaster response') returning id;", R)
expect_error("only one open request per person",
             f"insert into access_requests (user_id, role, organization) values ('{R}', 'school_admin', 'UST');", R, "duplicate key")
expect_error("requester cannot approve their own request",
             f"select decide_access_request('{REQ}', true, 'sampaloc');", R, "only a super admin")
expect_error("super admin cannot give a barangay official a school zone",
             f"select decide_access_request('{REQ}', true, 'ust');", S, "not a barangay zone")
expect_ok("super admin approves it", f"select decide_access_request('{REQ}', true, 'sampaloc', 'Welcome');", S)
row = admin(f"select role || '|' || zone_id || '|' || area_radius_meters from profiles where id = '{R}'")
check("...the same account is now a Sampaloc official with the zone's area", row == "barangay_official|sampaloc|1800", row)
check("...the requester got an 'account' alert",
      admin(f"select count(*) from alerts where user_id = '{R}' and kind = 'account'") == "1")
check("...and it is in the audit log", admin("select count(*) from audit_log where action = 'access_approved'") == "1")
expect_error("a decided request cannot be decided again",
             f"select decide_access_request('{REQ}', false);", S, "already been decided")

# --- zone-scoped review -----------------------------------------------------
expect_ok("official verifies a report inside their zone",
          f"update reports set status = 'verified', verified_by = 'I say so' where id = '{REP}';", R)
row = admin(f"select status || '|' || verified_by || '|' || (reviewed_by = '{R}')::text from reports where id = '{REP}'")
check("...reviewer recorded by the database, not by the client", row == "verified|Rosa - Sampaloc|true", row)
row = admin(f"select (select reports_verified from profiles where id = '{A}') || '|' || (select verifications_performed from profiles where id = '{R}')")
check("...reporter's verified count and official's verification count both moved", row == "1|1", row)
check("...reporter got 'Your report was verified'",
      admin(f"select count(*) from alerts where user_id = '{A}' and kind = 'report_verified'") == "1")
check("...a citizen following Sampaloc got a verified-hazard alert",
      admin(f"select count(*) from alerts where user_id = '{B}' and kind = 'verified_hazard'") == "1")
OUTSIDE = "22222222-2222-4222-8222-000000000005"   # Blumentritt, Sta. Cruz: outside Sampaloc
expect_ok("official cannot review outside their zone (RLS: 0 rows)",
          f"with u as (update reports set status = 'verified' where id = '{OUTSIDE}' returning 1) select count(*) from u;", R, "0")
INSIDE = "22222222-2222-4222-8222-000000000004"    # Legarda: inside Sampaloc, pending
expect_error("official cannot rewrite a report's details",
             f"update reports set description = 'edited' where id = '{INSIDE}';", R, "outcome, not its details")
expect_error("rejecting needs a reason",
             f"update reports set status = 'rejected' where id = '{INSIDE}';", R, "choose a reason")
expect_ok("official rejects with a reason",
          f"update reports set status = 'rejected', reject_reason = 'duplicate', reject_note = 'Same as the Espana report' where id = '{INSIDE}';", R)
expect_error("a reviewed report cannot go back to pending",
             f"update reports set status = 'pending' where id = '{INSIDE}';", R, "back to pending")
expect_ok("super admin can correct a report's details",
          f"update reports set severity = 'life_threatening' where id = '{REP}';", S)
check("...recorded as an edit", admin(f"select (edited_at is not null)::text from reports where id = '{REP}'") == "true"
      and admin("select count(*) from audit_log where action = 'edited'") == "1")

# --- suspension ---------------------------------------------------------------
expect_error("super admin cannot suspend themselves",
             f"select admin_set_user_status('{S}', 'suspended');", S, "your own status")
expect_error("an official cannot suspend anyone",
             f"select admin_set_user_status('{A}', 'suspended');", R, "only a super admin")
expect_ok("super admin suspends a citizen", f"select admin_set_user_status('{A}', 'suspended');", S)
expect_error("suspended citizen cannot report",
             f"insert into reports (type, severity, lat, lng, reporter_id) values ('other','not_passable',14.61,120.99,'{A}');",
             A, "row-level security")
expect_error("suspended citizen cannot vote",
             f"insert into report_votes (report_id, user_id, confirms) values ('{OUTSIDE}', '{A}', true);",
             A, "row-level security")
expect_error("suspended citizen cannot reinstate themselves",
             f"update profiles set status = 'active' where id = '{A}';", A, "super admin")

# --- safe spots ---------------------------------------------------------------
SPOT_IN = "11111111-1111-4111-8111-000000000005"    # Sampaloc Evacuation Center
SPOT_OUT = "11111111-1111-4111-8111-000000000008"   # Blumentritt terminal, outside
admin(f"insert into spot_subscriptions (user_id, spot_id) values ('{B}', '{SPOT_IN}');")
expect_ok("citizen sees 8 listed safe spots", "select count(*) from safe_spots;", B, "8")
expect_error("citizen cannot edit a safe spot (RLS)",
             f"insert into safe_spots (name, category, lat, lng) values ('Mine', 'other', 14.61, 120.99);", B, "row-level security")
expect_ok("official closes a safe spot in their zone",
          f"update safe_spots set is_open_now = false where id = '{SPOT_IN}';", R)
check("...its subscriber was told", admin(f"select count(*) from alerts where user_id = '{B}' and kind = 'safe_spot_update'") == "1")
expect_ok("official delists a safe spot in their zone", f"update safe_spots set active = false where id = '{SPOT_IN}';", R)
expect_ok("...the community app no longer sees it", "select count(*) from safe_spots;", B, "7")
expect_ok("...the official still does", "select count(*) from safe_spots;", R, "8")
expect_ok("official cannot touch a spot outside their zone (RLS: 0 rows)",
          f"with u as (update safe_spots set active = false where id = '{SPOT_OUT}' returning 1) select count(*) from u;", R, "0")
expect_ok("official adds a safe spot in their zone",
          "insert into safe_spots (name, category, lat, lng, address_label) values ('Brgy. 395 Hall', 'other', 14.6100, 120.9930, 'Sampaloc');", R)

# --- broadcasts -----------------------------------------------------------------
expect_error("a citizen cannot broadcast",
             "select send_broadcast('Hello', 'Just me', 'advisory');", B, "only officials")
BC = expect_ok("official broadcasts (tries to target another barangay)",
               "select send_broadcast('Flood advisory', 'Avoid Espana underpass', 'advisory', array['commonwealth']);", R)
row = admin(f"select audience || '|' || array_to_string(zone_ids, ',') || '|' || recipients from broadcasts where id = '{BC}'")
check("...kept to their own zone, delivered to the one follower", row == "zones|sampaloc|1", row)
check("...who has it as a 'broadcast' alert",
      admin(f"select count(*) from alerts where user_id = '{B}' and broadcast_id = '{BC}' and kind = 'broadcast'") == "1")
BC2 = expect_ok("super admin broadcasts a typhoon warning to everyone",
                "select send_broadcast('Signal No. 2', 'Typhoon approaching Metro Manila', 'typhoon');", S)
row = admin(f"select audience || '|' || recipients from broadcasts where id = '{BC2}'")
check("...reaches every active account except the sender (the suspended one is skipped)", row == "all|2", row)
expect_ok("recipient reads the alert",
          f"update alerts set is_read = true where user_id = '{B}' and broadcast_id = '{BC}';", B)
check("...and 'opened' counts it", admin(f"select opened from broadcasts where id = '{BC}'") == "1")
expect_error("broadcasts cannot be inserted directly",
             "insert into broadcasts (title, message, type, audience) values ('Fake','Fake message','advisory','all');", S, "row-level security")

# --- audit log --------------------------------------------------------------------
expect_ok("super admin reads the whole audit log", "select (count(*) > 5)::text from audit_log;", S, "true")
expect_ok("official reads only their own entries",
          f"select (count(*) = count(*) filter (where admin_id = '{R}'))::text from audit_log;", R, "true")
expect_ok("citizen reads none", "select count(*) from audit_log;", B, "0")
expect_error("nobody writes the audit log directly",
             "insert into audit_log (action) values ('verified');", S, "row-level security")

# --- role changes ---------------------------------------------------------------------
expect_error("super admin cannot make a school admin with a barangay zone",
             f"select admin_set_user_role('{B}', 'school_admin', 'sampaloc');", S, "not a school zone")
expect_ok("super admin makes a school admin for UST", f"select admin_set_user_role('{B}', 'school_admin', 'ust');", S)
expect_error("super admin cannot demote themselves", f"select admin_set_user_role('{S}', 'commuter');", S, "your own role")

# --- PSGC: official barangays for access requests ---------------------------------
admin("""insert into psgc_areas (code, name, level, region_code, parent_code, city, province, population_2024, version) values
  ('1381300000', 'Quezon City', 'City', '1300000000', '1300000000', '', 'National Capital Region (NCR)', 3084270, 'Q2_2026'),
  ('1381300022', 'Commonwealth', 'Bgy', '1300000000', '1381300000', 'Quezon City', 'National Capital Region (NCR)', 215035, 'Q2_2026'),
  ('0804816010', 'Commonwealth', 'Bgy', '0800000000', '0804816000', 'Tarangnan', 'Samar', 900, 'Q2_2026'),
  ('1381300050', 'Pasong Tamo', 'Bgy', '1300000000', '1381300000', 'Quezon City', 'National Capital Region (NCR)', 120000, 'Q2_2026'),
  ('1381300060', 'Sauyo', 'Bgy', '1300000000', '1381300000', 'Quezon City', 'National Capital Region (NCR)', 90000, 'Q2_2026');""")
T = signup("tess@example.com", "Tess")      # official for a barangay that already has a zone
U = signup("uly@example.com", "Uly")        # official for a barangay with no zone and no map centre
V = signup("vic@example.com", "Vic")        # official for a barangay with no zone yet

check("seeded zones carry their PSGC codes",
      admin("select psgc_code from zones where id = 'commonwealth'") == "1381300022"
      and admin("select psgc_code from zones where id = 'sampaloc'") == "1380606000")
expect_ok("anyone, signed in or not, can read PSGC", "select count(*) from psgc_areas where level = 'Bgy';", None, "4")
expect_error("nobody but the loader writes PSGC",
             "insert into psgc_areas (code, name, region_code, version) values ('0000000001','Fake','0000000000','x');",
             S, "permission denied")
expect_ok("barangay search needs every word to match",
          "select string_agg(code || ':' || city, ',') from search_barangays('commonwealth quezon');", None,
          "1381300022:Quezon City")
expect_ok("...and puts the most populous first",
          "select string_agg(code, ',') from search_barangays('commonwealth');", None, "1381300022,0804816010")
expect_ok("...and ignores a one-letter query", "select count(*) from search_barangays('c');", None, "0")
expect_error("a request cannot name a barangay that is not in PSGC",
             f"insert into access_requests (user_id, role, organization, psgc_code) values ('{T}', 'barangay_official', 'Brgy', '1399999999');",
             T, "foreign key")
TREQ = expect_ok("a request for a barangay with a zone is filed against that zone",
                 f"insert into access_requests (user_id, role, organization, psgc_code) values ('{T}', 'barangay_official', 'Brgy. Commonwealth Council', '1381300022') returning id;", T)
check("...zone linked automatically", admin(f"select zone_id from access_requests where id = '{TREQ}'") == "commonwealth")
UREQ = expect_ok("a request for a barangay with no zone and no centre is accepted",
                 f"insert into access_requests (user_id, role, organization, psgc_code) values ('{U}', 'barangay_official', 'Brgy. Sauyo Council', '1381300060') returning id;", U)
expect_error("...but cannot be approved without a zone",
             f"select decide_access_request('{UREQ}', true);", S, "no map centre")
VREQ = expect_ok("a request for a barangay with no zone carries the centre the app found",
                 f"insert into access_requests (user_id, role, organization, psgc_code, center_lat, center_lng) values ('{V}', 'barangay_official', 'Brgy. Pasong Tamo Council', '1381300050', 14.6760, 121.0470) returning id;", V)
expect_ok("super admin approves it", f"select decide_access_request('{VREQ}', true);", S)
row = admin("select name || '|' || kind || '|' || city || '|' || center_lat || '|' || psgc_code from zones where id = 'psgc-1381300050'")
check("...which creates the zone from PSGC", row == "Brgy. Pasong Tamo|barangay|Quezon City|14.676|1381300050", row)
row = admin(f"select role || '|' || zone_id || '|' || barangay from profiles where id = '{V}'")
check("...and makes them its official", row == "barangay_official|psgc-1381300050|Brgy. Pasong Tamo", row)
row = admin("select meta->>'psgc' || '|' || (meta->>'zone_created') from audit_log where action = 'access_approved' order by id desc limit 1")
check("...and the audit entry says the zone was created", row == "1381300050|true", row)
expect_ok("approving a barangay with a zone reuses it", f"select decide_access_request('{TREQ}', true);", S)
check("...no second zone", admin("select count(*) from zones where psgc_code = '1381300022'") == "1")

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
