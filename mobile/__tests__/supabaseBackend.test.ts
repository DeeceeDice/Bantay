import { latLng } from '../src/core/geo/latLng';
import { HazardReport } from '../src/data/models/types';
import {
  createSupabaseAuth,
  createSupabaseBackend,
} from '../src/data/repositories/supabaseBackend';

/**
 * A stand-in for the Supabase client, just deep enough to exercise the auth
 * and report paths. Tables are arrays of rows; `reports` updates are allowed
 * only while `canVerify` is true, which is what the verifier-only RLS policy
 * does to everyone else - zero rows, no error.
 */
type Row = Record<string, unknown>;

interface FakeState {
  tables: Record<string, Row[]>;
  userId: string | null;
  canVerify: boolean;
  signUpResponse: { data: unknown; error: unknown };
  signInResponse: { data: unknown; error: unknown };
  writes: { table: string; op: string; row: Row }[];
}

const state: FakeState = {
  tables: {},
  userId: null,
  canVerify: false,
  signUpResponse: { data: null, error: null },
  signInResponse: { data: null, error: null },
  writes: [],
};

function query(table: string) {
  const filters: [string, unknown][] = [];
  let op: 'select' | 'insert' | 'update' | 'upsert' = 'select';
  let payload: Row = {};
  let ignoreDuplicates = false;

  const rows = (): Row[] => (state.tables[table] ??= []);
  const matching = (): Row[] => rows().filter((r) => filters.every(([k, v]) => r[k] === v));
  const key = (r: Row): string =>
    table === 'report_votes' || table === 'report_flags'
      ? `${r.report_id}:${r.user_id}`
      : String(r.id);

  const run = (): { data: unknown; error: unknown } => {
    if (op === 'select') return { data: matching(), error: null };
    if (op === 'update') {
      if (table === 'reports' && !state.canVerify) return { data: [], error: null };
      const hit = matching();
      hit.forEach((r) => Object.assign(r, payload));
      state.writes.push({ table, op, row: payload });
      return { data: hit.map((r) => ({ id: r.id })), error: null };
    }
    const exists = rows().some((r) => key(r) === key(payload));
    if (exists) {
      if (op === 'upsert' && ignoreDuplicates) return { data: null, error: null };
      return { data: null, error: { code: '23505', message: 'duplicate key' } };
    }
    rows().push({ ...payload });
    state.writes.push({ table, op, row: payload });
    return { data: null, error: null };
  };

  const builder = {
    select: () => builder,
    insert: (row: Row) => ((op = 'insert'), (payload = row), builder),
    update: (row: Row) => ((op = 'update'), (payload = row), builder),
    upsert: (row: Row, opts?: { ignoreDuplicates?: boolean }) => (
      (op = 'upsert'), (payload = row), (ignoreDuplicates = !!opts?.ignoreDuplicates), builder
    ),
    eq: (k: string, v: unknown) => (filters.push([k, v]), builder),
    maybeSingle: async () => {
      const { data, error } = run();
      return { data: (data as Row[] | null)?.[0] ?? null, error };
    },
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(run()).then(resolve, reject),
  };
  return builder;
}

type AuthListener = (event: string) => void;
const authListeners = new Set<AuthListener>();

const mockClient = {
  from: query,
  auth: {
    getUser: async () => ({ data: { user: state.userId ? { id: state.userId } : null } }),
    getSession: async () => ({
      data: { session: state.userId ? { user: { id: state.userId, email: 'a@b.ph' } } : null },
    }),
    signUp: async () => state.signUpResponse,
    signInWithPassword: async () => state.signInResponse,
    signOut: async () => ({ error: null }),
    onAuthStateChange: (listener: AuthListener) => {
      authListeners.add(listener);
      return { data: { subscription: { unsubscribe: () => authListeners.delete(listener) } } };
    },
  },
};

const emitAuthEvent = (event: string): void => authListeners.forEach((l) => l(event));

jest.mock('../src/data/repositories/supabaseClient', () => ({
  isSupabaseConfigured: () => true,
  supabase: () => mockClient,
}));
jest.mock('expo-linking', () => ({ createURL: (path: string) => `bantay://${path}` }));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const USER = 'user-1';

const profileRow = (id: string, name = 'Juan'): Row => ({
  id,
  name,
  email: 'juan@example.ph',
  role: 'commuter',
  barangay: 'Sampaloc, Manila',
  reports_submitted: 0,
  reports_verified: 0,
  reports_rejected: 0,
  verifications_performed: 0,
  auth_provider: 'email',
  joined_at: null,
  area_center_lat: 14.6,
  area_center_lng: 120.99,
  area_radius_meters: 3000,
});

const report = (overrides: Partial<HazardReport> = {}): HazardReport => ({
  id: 'report-1',
  type: 'flooded_road',
  severity: 'not_passable',
  status: 'pending',
  location: latLng(14.6, 120.99),
  addressLabel: 'España Blvd',
  reportedAt: '2026-09-23T10:00:00Z',
  reporterId: 'someone-else',
  reporterName: 'Maria',
  description: '',
  photoUri: null,
  confirmCount: 0,
  denyCount: 0,
  flagCount: 0,
  verifiedBy: null,
  verifiedAt: null,
  votedUserIds: [],
  flaggedUserIds: [],
  ...overrides,
});

const storedReport = (): Row => ({
  id: 'report-1',
  status: 'pending',
  verified_by: null,
  reporter_id: 'someone-else',
});

beforeEach(() => {
  state.tables = {};
  state.userId = null;
  state.canVerify = false;
  state.writes = [];
});

describe('SupabaseAuth.signUp', () => {
  const input = { name: 'Juan', email: 'Juan@Example.ph', password: 'password123' };

  it('asks for email confirmation when the project returns no session', async () => {
    state.signUpResponse = {
      data: { user: { id: USER, identities: [{}] }, session: null },
      error: null,
    };
    const result = await createSupabaseAuth().signUp(input);
    expect(result.ok).toBe(false);
    expect(result.needsEmailConfirmation).toBe(true);
    expect(result.error).toContain('juan@example.ph');
  });

  it('reports an existing account instead of asking to confirm again', async () => {
    state.signUpResponse = {
      data: { user: { id: USER, identities: [] }, session: null },
      error: null,
    };
    const result = await createSupabaseAuth().signUp(input);
    expect(result.needsEmailConfirmation).toBe(false);
    expect(result.error).toMatch(/already exists/);
  });

  it('signs straight in when confirmation is off', async () => {
    state.userId = USER;
    state.tables.profiles = [profileRow(USER)];
    state.signUpResponse = {
      data: { user: { id: USER, email: 'juan@example.ph', identities: [{}] }, session: {} },
      error: null,
    };
    const result = await createSupabaseAuth().signUp(input);
    expect(result.ok).toBe(true);
    expect(result.profile?.id).toBe(USER);
  });

  it('turns developer-facing errors into ones a person can act on', async () => {
    state.signUpResponse = {
      data: { user: null, session: null },
      error: { code: 'email_address_not_authorized', message: 'Email address not authorized' },
    };
    const result = await createSupabaseAuth().signUp(input);
    expect(result.error).toMatch(/Confirm email/);
  });
});

describe('SupabaseAuth.logIn', () => {
  it('creates the profile row for an account that predates the trigger', async () => {
    state.userId = USER;
    state.signInResponse = {
      data: {
        user: { id: USER, email: 'juan@example.ph', user_metadata: { name: 'Juan dela Cruz' } },
      },
      error: null,
    };
    const result = await createSupabaseAuth().logIn({ email: 'juan@example.ph', password: 'x' });
    expect(result.ok).toBe(true);
    expect(result.profile?.name).toBe('Juan dela Cruz');
    expect(result.profile?.role).toBe('commuter');
    expect(state.tables.profiles).toHaveLength(1);
  });

  it('explains wrong credentials plainly', async () => {
    state.signInResponse = {
      data: { user: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    };
    const result = await createSupabaseAuth().logIn({ email: 'a@b.ph', password: 'x' });
    expect(result.error).toBe('Incorrect email or password. Please try again.');
  });
});

describe('SupabaseAuth has no way in but a Supabase account', () => {
  it('offers only email and password - no provider or guest sign-in', () => {
    const auth = createSupabaseAuth() as unknown as Record<string, unknown>;
    expect(typeof auth.signUp).toBe('function');
    expect(typeof auth.logIn).toBe('function');
    expect(auth.signInWithProvider).toBeUndefined();
    expect(auth.signInAnonymously).toBeUndefined();
  });

  it('has no session to restore when Supabase has none', async () => {
    expect(await createSupabaseAuth().restore()).toBeNull();
  });
});

describe('SupabaseAuth.onSignedOut', () => {
  it('fires when Supabase ends the session, and only then', () => {
    const callback = jest.fn();
    const stop = createSupabaseAuth().onSignedOut(callback);

    emitAuthEvent('TOKEN_REFRESHED');
    emitAuthEvent('SIGNED_IN');
    expect(callback).not.toHaveBeenCalled();

    emitAuthEvent('SIGNED_OUT');
    expect(callback).toHaveBeenCalledTimes(1);

    stop();
    emitAuthEvent('SIGNED_OUT');
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe('SupabaseBackend.upsertReport', () => {
  it('inserts a new report', async () => {
    state.userId = USER;
    await createSupabaseBackend().upsertReport(report({ reporterId: USER }));
    expect(state.writes).toEqual([
      expect.objectContaining({ table: 'reports', op: 'insert' }),
    ]);
  });

  it('records a commuter vote without touching the report row', async () => {
    state.userId = USER;
    state.tables.reports = [storedReport()];
    state.tables.report_votes = [{ report_id: 'report-1', user_id: 'other', confirms: true }];

    // One confirmation stored, the store says two: this user confirmed.
    await createSupabaseBackend().upsertReport(
      report({ confirmCount: 2, votedUserIds: ['other', USER] }),
    );
    expect(state.writes).toEqual([
      {
        table: 'report_votes',
        op: 'insert',
        row: { report_id: 'report-1', user_id: USER, confirms: true },
      },
    ]);
  });

  it('records a denial as a denial even when others confirmed', async () => {
    state.userId = USER;
    state.tables.reports = [storedReport()];
    state.tables.report_votes = [{ report_id: 'report-1', user_id: 'other', confirms: true }];

    await createSupabaseBackend().upsertReport(
      report({ confirmCount: 1, denyCount: 1, votedUserIds: ['other', USER] }),
    );
    expect(state.writes[0].row).toMatchObject({ confirms: false });
  });

  it('records a flag', async () => {
    state.userId = USER;
    state.tables.reports = [storedReport()];
    await createSupabaseBackend().upsertReport(report({ flagCount: 1, flaggedUserIds: [USER] }));
    expect(state.writes).toEqual([
      { table: 'report_flags', op: 'insert', row: { report_id: 'report-1', user_id: USER } },
    ]);
  });

  it('lets an official verify', async () => {
    state.userId = USER;
    state.canVerify = true;
    state.tables.reports = [storedReport()];
    await createSupabaseBackend().upsertReport(
      report({ status: 'verified', verifiedBy: 'Official', verifiedAt: '2026-09-23T11:00:00Z' }),
    );
    expect(state.tables.reports[0].status).toBe('verified');
  });

  it('fails loudly when RLS silently refuses a verification', async () => {
    state.userId = USER;
    state.tables.reports = [storedReport()];
    await expect(
      createSupabaseBackend().upsertReport(report({ status: 'verified', verifiedBy: 'Me' })),
    ).rejects.toThrow(/officials/);
    expect(state.tables.reports[0].status).toBe('pending');
  });
});
