/**
 * Bantay - Supabase connection check.
 *
 *   npm run check:supabase
 *
 * Answers the question "is this app actually talking to a database, and is
 * that database set up correctly?" without launching the app. It runs against
 * the same two variables the app reads, so a pass here means the app will
 * connect too.
 *
 * It checks, in order:
 *   1. a project is configured - .env first, then app.json, as the app reads
 *      it - and its key is the anon key
 *   2. the project answers on both its auth and REST endpoints
 *  2b. the thing answering is really PostgREST and not a proxy in front of it
 *   3. all 8 tables from supabase/migrations/ exist
 *   4. Row Level Security actually denies an anonymous reader
 *   5. (optional) signed in as a real user: the profile trigger fired and the
 *      seed data is visible
 *
 * Step 4 is the one worth running twice. The anon key is public by design and
 * ships inside the app, so RLS is the only thing standing between a stranger
 * with a decompiler and every row in the database. A check that only proves
 * "the database answered" would pass just as happily on a wide open project.
 *
 * Step 5 needs an account, which this script will not create for you:
 *
 *   BANTAY_CHECK_EMAIL=you@example.com BANTAY_CHECK_PASSWORD=... npm run check:supabase
 *
 * Exits non-zero if any check fails, so CI can use it as a gate.
 */

import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Tables created by supabase/schema.sql, with how the app reads each one. */
const TABLES = [
  'profiles',
  'reports',
  'report_votes',
  'report_flags',
  'safe_spots',
  'routes',
  'alerts',
  'spot_subscriptions',
];

/**
 * Every policy in the initial migration is granted `to authenticated`, so a caller
 * holding only the anon key must see nothing in these. Rows coming back here
 * mean a policy is wrong or RLS was turned off on the table.
 */
const MUST_BE_EMPTY_FOR_ANON = ['profiles', 'reports', 'safe_spots', 'alerts'];

let failures = 0;
let warnings = 0;

const pass = (msg) => console.log(`  ok    ${msg}`);
const fail = (msg, hint) => {
  failures += 1;
  console.log(`  FAIL  ${msg}`);
  if (hint) console.log(`        ${hint}`);
};
const warn = (msg, hint) => {
  warnings += 1;
  console.log(`  warn  ${msg}`);
  if (hint) console.log(`        ${hint}`);
};
const section = (title) => console.log(`\n${title}`);

/**
 * Minimal .env reader. Expo loads .env itself when it bundles, but this script
 * runs under plain node, so it has to do that part on its own. Real process
 * environment wins, which is how CI would supply the values.
 */
function loadEnv() {
  const out = {};
  try {
    const text = readFileSync(resolve(projectRoot, '.env'), 'utf8');
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }
  } catch {
    // No .env file. Not an error in itself - the values may come from the
    // environment, and the config check below reports it either way.
  }
  return { ...out, ...process.env };
}

/** The project committed in app.json (`expo.extra.supabase`), if any. */
function loadAppJsonProject() {
  try {
    const appJson = JSON.parse(readFileSync(resolve(projectRoot, 'app.json'), 'utf8'));
    const cfg = appJson?.expo?.extra?.supabase ?? {};
    return {
      url: typeof cfg.url === 'string' ? cfg.url.trim() : '',
      anonKey: typeof cfg.anonKey === 'string' ? cfg.anonKey.trim() : '',
    };
  } catch {
    return { url: '', anonKey: '' };
  }
}

/**
 * A missing table reads very differently from a table RLS is hiding, but only
 * if the probe asks for a body.
 *
 * postgrest-js turns "404 with an empty body" into "204, no error" on purpose
 * (its workaround for supabase/postgrest-js#295). A HEAD response never has a
 * body, so a `head: true` probe reports a table that does not exist as a
 * perfectly healthy empty one. Every probe below therefore uses GET, where
 * PostgREST's PGRST205 JSON actually arrives and can be recognised.
 */
function isMissingTable(error) {
  if (!error) return false;
  const code = error.code ?? '';
  const message = error.message ?? '';
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    /could not find the table/i.test(message) ||
    /does not exist/i.test(message)
  );
}

async function main() {
  console.log('Bantay - Supabase connection check');

  // ---------------------------------------------------------------- 1. config
  section('1. Configuration');

  // Same precedence as the app: .env / environment first, then app.json.
  const env = loadEnv();
  const fromApp = loadAppJsonProject();
  const url = (env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim() || fromApp.url;
  const anonKey = (env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim() || fromApp.anonKey;
  const source = (env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim() ? '.env' : 'app.json';

  if (!url || !anonKey) {
    fail(
      'no Supabase project configured',
      'Set expo.extra.supabase in app.json, or EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY in .env. See docs/SUPABASE.md.',
    );
    console.log(
      '\nNothing else can be checked without a project. The app treats this ' +
        'state the same way:\nit shows "not connected to a database" and ' +
        'lets no one sign up or log in.',
    );
    process.exit(1);
  }
  pass(`project configured (from ${source})`);

  let host;
  try {
    host = new URL(url).host;
    pass(`project URL parses (${host})`);
  } catch {
    fail(`EXPO_PUBLIC_SUPABASE_URL is not a valid URL: ${url}`);
    process.exit(1);
  }

  if (!url.startsWith('https://')) {
    warn('project URL is not https', 'Supabase projects are served over https.');
  }

  // A service_role key here would be a serious mistake: it bypasses RLS, and
  // EXPO_PUBLIC_* values are inlined into the shipped bundle.
  const segments = anonKey.split('.');
  if (segments.length === 3) {
    try {
      const claims = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
      if (claims.role === 'service_role') {
        fail(
          'the key in EXPO_PUBLIC_SUPABASE_ANON_KEY is a service_role key',
          'It bypasses RLS and would be shipped inside the app. Replace it with the anon key and rotate it.',
        );
      } else if (claims.role === 'anon') {
        pass('key is an anon key (safe to ship)');
      } else {
        warn(`key has an unexpected role claim: ${claims.role}`);
      }
    } catch {
      warn('could not decode the key to confirm it is the anon key');
    }
  } else if (anonKey.startsWith('sb_secret_')) {
    fail(
      'the key in EXPO_PUBLIC_SUPABASE_ANON_KEY is a secret key',
      'Use the publishable key instead. A secret key bypasses RLS and must never reach a client.',
    );
  } else if (anonKey.startsWith('sb_publishable_')) {
    pass('key is a publishable key (safe to ship)');
  } else {
    warn('key is in an unrecognised format', 'Expected a JWT or an sb_publishable_ key.');
  }

  // ------------------------------------------------------------ 2. reachable
  section('2. Reachability');

  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey } });
    if (res.ok) {
      pass('auth endpoint reachable');
    } else {
      if (res.status === 401) {
        fail(
          'auth endpoint rejected the key (401)',
          'The URL and the key are probably from different projects.',
        );
      } else if (res.status === 403) {
        fail(
          'auth endpoint returned 403',
          'Often a proxy, firewall or corporate network policy refusing the host rather than Supabase itself.',
        );
      } else {
        fail(`auth endpoint returned ${res.status}`);
      }
      // Anything below this point would be reading a middlebox's replies as
      // if they came from the database, so stop here.
      console.log('\nStopping: the project did not answer, so nothing below can be tested.');
      process.exit(1);
    }
  } catch (error) {
    fail(
      `cannot reach ${host}`,
      `${error.message}. Check the URL, your network, and that the project is not paused.`,
    );
    console.log('\nStopping: without a reachable project nothing below can be tested.');
    process.exit(1);
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ------------------------------------------------------ 2b. endpoint sanity
  section('2b. Endpoint sanity');

  // Everything below infers "this table exists" from the *absence* of a
  // missing-table error, which only means anything if the endpoint actually
  // tells the two apart. Anything that answers uniformly - a proxy denying the
  // host, a WAF, a paused project, a parked domain - would otherwise be
  // reported as a healthy database with all 8 tables present and RLS working,
  // which is the most misleading output this script could produce.
  //
  // So: ask for a table that cannot exist, and require a refusal.
  const canary = '__bantay_connectivity_canary__';
  const { error: canaryError } = await client.from(canary).select('*').limit(1);

  if (!isMissingTable(canaryError)) {
    fail(
      'the endpoint does not answer like PostgREST',
      canaryError
        ? `Asking for a table that cannot exist returned: ${canaryError.message || JSON.stringify(canaryError)}`
        : 'Asking for a table that cannot exist succeeded, which is impossible.',
    );
    console.log(
      '\nSomething between here and the database is answering on its behalf - a\n' +
        'proxy, a firewall, or a project that is paused or deleted. Every check\n' +
        'below would report success against it, so they are skipped rather than\n' +
        'printed as passes.',
    );
    process.exit(1);
  }
  pass('endpoint tells missing tables apart from empty ones');

  // --------------------------------------------------------------- 3. schema
  section('3. Schema (from supabase/migrations/)');

  const missing = [];
  // One probe per table, reused by the RLS section below. `limit(1)` keeps the
  // payload to a single row while `count: 'exact'` still reports the true
  // total, so this answers "does it exist" and "what can anon see" at once.
  const probes = new Map();

  for (const table of TABLES) {
    const probe = await client.from(table).select('*', { count: 'exact' }).limit(1);
    probes.set(table, probe);

    if (isMissingTable(probe.error)) {
      missing.push(table);
      fail(`table "${table}" not found`);
    } else if (probe.error) {
      // An RLS denial is a normal answer here: it proves the table exists.
      pass(`table "${table}" exists (read denied, which RLS is supposed to do)`);
    } else {
      pass(`table "${table}" exists`);
    }
  }

  if (missing.length === TABLES.length) {
    console.log(
      '\nNo Bantay tables at all. Apply supabase/migrations/ first, then\n' +
        'supabase/seed.sql. See docs/SUPABASE.md.',
    );
  } else if (missing.length > 0) {
    console.log(
      `\n${missing.length} table(s) missing. Re-apply supabase/migrations/ - it is\n` +
        'idempotent, so running it again only creates what is absent.',
    );
  }

  // ------------------------------------------------------------------ 4. RLS
  section('4. Row Level Security (anonymous caller)');

  for (const table of MUST_BE_EMPTY_FOR_ANON) {
    if (missing.includes(table)) continue;
    const { count, error } = probes.get(table);

    if (error) {
      pass(`"${table}" denies anonymous reads`);
    } else if ((count ?? 0) > 0) {
      fail(
        `"${table}" returned ${count} row(s) to an anonymous caller`,
        'The anon key ships inside the app, so this data is public. Re-apply the migration and confirm RLS is enabled.',
      );
    } else {
      pass(`"${table}" returns nothing to an anonymous caller`);
    }
  }

  // ------------------------------------------------------------ 5. signed in
  section('5. Signed-in checks');

  const email = process.env.BANTAY_CHECK_EMAIL;
  const password = process.env.BANTAY_CHECK_PASSWORD;

  if (!email || !password) {
    console.log('  skip  no BANTAY_CHECK_EMAIL / BANTAY_CHECK_PASSWORD set');
    console.log(
      '        Sign up in the app, then re-run with those two variables to verify\n' +
        '        the profile trigger and the seed data.',
    );
  } else {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      fail(`sign-in failed: ${error.message}`);
    } else {
      pass(`signed in as ${email}`);
      const userId = data.user?.id;

      // The on_auth_user_created trigger should have made this row at signup.
      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('id, name, role')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        fail(`could not read own profile: ${profileError.message}`);
      } else if (!profile) {
        fail(
          'no profile row for this user',
          'The handle_new_user trigger did not fire. Re-apply section 6 of the initial migration.',
        );
      } else {
        pass(`profile row present (role: ${profile.role})`);
      }

      const { count: spots } = await client
        .from('safe_spots')
        .select('*', { count: 'exact' })
        .limit(1);
      if ((spots ?? 0) >= 8) {
        pass(`safe_spots readable (${spots} rows)`);
      } else {
        warn(
          `safe_spots has ${spots ?? 0} row(s), expected at least 8`,
          'Run supabase/seed.sql to load the sample spots.',
        );
      }

      const { count: reports } = await client
        .from('reports')
        .select('*', { count: 'exact' })
        .limit(1);
      pass(`reports readable (${reports ?? 0} rows)`);

      await client.auth.signOut();
    }
  }

  // --------------------------------------------------------------- verdict
  section('Result');
  if (failures > 0) {
    console.log(
      `  ${failures} failed, ${warnings} warning(s). The app will not work ` +
        'correctly against this project yet.',
    );
    process.exit(1);
  }
  console.log(
    warnings > 0
      ? `  Connection good, with ${warnings} warning(s) above.`
      : '  Connection good.',
  );
}

main().catch((error) => {
  console.error('\nCheck aborted:', error.message);
  process.exit(1);
});
