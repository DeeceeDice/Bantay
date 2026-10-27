#!/usr/bin/env bash
# Builds a scratch database from the migrations, in order, and runs the rule
# tests against it. Connection comes from the standard PG* variables; the
# database named by PGDATABASE (default bantay_test) is dropped and recreated.
# Never point this at a real project.
set -euo pipefail
cd "$(dirname "$0")/../.."

export PGDATABASE="${PGDATABASE:-bantay_test}"
export PGOPTIONS="--client-min-messages=warning"

dropdb --if-exists "$PGDATABASE"
createdb "$PGDATABASE"

run() { psql -v ON_ERROR_STOP=1 -X -q -f "$1"; }

run supabase/tests/supabase_stub.sql
migrations=(supabase/migrations/*.sql)
# The sample data goes in after the first migration, as it did on the live
# project, so the later migrations are tested against existing rows.
run "${migrations[0]}"
run supabase/seed.sql
for migration in "${migrations[@]:1}"; do
  run "$migration"
done

python3 supabase/tests/rules_test.py
