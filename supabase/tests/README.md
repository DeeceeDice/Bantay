# Database rule tests

`rules_test.py` checks what the shared database lets each kind of account do:
citizens, a requester, an approved official and a super admin. It covers the
privilege guard, private profiles, report filing, access requests, zone-scoped
review, suspension, safe-spot management, broadcasts, the audit log and PSGC
barangay requests, report photos and the monthly API caps - 106 checks,
each run as the role a real client would be.

The **Database rules** workflow (`.github/workflows/database.yml`) runs them
whenever the migrations, the seed or the tests change. To run them yourself you need
Postgres 16 and `psql`; `run.sh` builds a scratch database from the
migrations, in order, and runs the tests:

```bash
export PGHOST=/tmp PGPORT=5432 PGUSER=postgres PGDATABASE=bantay_test
supabase/tests/run.sh
```

It drops and recreates `PGDATABASE` first.

`supabase_stub.sql` stands in for the Supabase-provided roles and auth schema.
Never run it against a real project.
