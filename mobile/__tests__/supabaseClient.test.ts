/**
 * The app has exactly one place its data can live. These pin down where the
 * project comes from, and that a build without one refuses to run rather than
 * falling back to accounts kept on the phone.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const APP_JSON_URL = 'https://from-app-json.supabase.co';

type ClientModule = typeof import('../src/data/repositories/supabaseClient');

function loadClient(
  extra: Record<string, unknown> | undefined,
  env: { url?: string; key?: string } = {},
): ClientModule {
  const saved = { ...process.env };
  if (env.url === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  else process.env.EXPO_PUBLIC_SUPABASE_URL = env.url;
  if (env.key === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = env.key;

  let mod: ClientModule | undefined;
  jest.isolateModules(() => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { expoConfig: extra === undefined ? null : { extra } },
    }));
    mod = jest.requireActual('../src/data/repositories/supabaseClient') as ClientModule;
  });

  process.env = saved;
  return mod as ClientModule;
}

describe('supabase client configuration', () => {
  it('refuses to run with no project configured', () => {
    const client = loadClient(undefined);
    expect(client.isSupabaseConfigured()).toBe(false);
    expect(() => client.supabase()).toThrow(/not connected to a database/);
  });

  it('uses the project committed in app.json', () => {
    const client = loadClient({ supabase: { url: APP_JSON_URL, anonKey: 'anon-from-app-json' } });
    expect(client.isSupabaseConfigured()).toBe(true);
    expect(() => client.supabase()).not.toThrow();
  });

  it('lets .env override app.json', () => {
    const client = loadClient(
      { supabase: { url: '', anonKey: '' } },
      { url: 'https://from-env.supabase.co', key: 'anon-from-env' },
    );
    expect(client.isSupabaseConfigured()).toBe(true);
  });

  it('treats a half-configured project as not configured', () => {
    const client = loadClient({ supabase: { url: APP_JSON_URL, anonKey: '  ' } });
    expect(client.isSupabaseConfigured()).toBe(false);
  });

  it('ships the real project in app.json, with the anon key and never the service key', () => {
    const appJson = require('../app.json') as {
      expo: { extra?: { supabase?: { url?: string; anonKey?: string } } };
    };
    const cfg = appJson.expo.extra?.supabase;
    expect(cfg?.url).toMatch(/^https:\/\/[a-z]{20}\.supabase\.co$/);

    const payload = JSON.parse(
      Buffer.from(String(cfg?.anonKey).split('.')[1], 'base64').toString('utf8'),
    ) as { role?: string; ref?: string };
    expect(payload.role).toBe('anon');
    expect(cfg?.url).toContain(String(payload.ref));
  });
});
