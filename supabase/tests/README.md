# Database rule tests

`rules_test.py` checks what the shared database lets each kind of account do:
citizens, a requester, an approved official and a super admin. It covers the
privilege guard, private profiles, report filing, access requests, zone-scoped
review, suspension, safe-spot management, broadcasts, the audit log and PSGC
barangay requests and the free-tier guard - 98 checks, each run as the role a real client would be.

CI runs it on every push (the "Database rules" job). To run it locally you
need Postgres 16 and `psql`:

```bash
export PGHOST=/tmp PGPORT=5432 PGUSER=postgres PGDATABASE=bantay_test
createdb bantay_test
psql -v ON_ERROR_STOP=1 -q -f supabase/tests/supabase_stub.sql
psql -v ON_ERROR_STOP=1 -q -f supabase/migrations/20260923120000_bantay_initial_schema.sql
psql -v ON_ERROR_STOP=1 -q -f supabase/seed.sql
psql -v ON_ERROR_STOP=1 -q -f supabase/migrations/20260927000000_admin_console.sql
psql -v ON_ERROR_STOP=1 -q -f supabase/migrations/20260928120000_psgc.sql
psql -v ON_ERROR_STOP=1 -q -f supabase/migrations/20260928130000_psgc_search_accents.sql
psql -v ON_ERROR_STOP=1 -q -f supabase/migrations/20260928140000_free_tier_guard.sql
python3 supabase/tests/rules_test.py
```

`supabase_stub.sql` stands in for the Supabase-provided roles and auth schema.
Never run it against a real project.
