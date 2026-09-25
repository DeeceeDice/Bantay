import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';

/**
 * Which Supabase project the app talks to.
 *
 * `EXPO_PUBLIC_*` variables win, so a developer can point a build at another
 * project from `.env`. Otherwise the project in `app.json` (`expo.extra.
 * supabase`) is used, which is what makes a fresh clone and every build
 * connect to the real database with no setup.
 *
 * Only the anon key belongs in either place. It is public by design - every
 * build ships it - and is safe precisely because Row Level Security is on for
 * every table. The service-role key bypasses RLS and must never appear in a
 * client.
 *
 * There is deliberately no fallback. If neither source is set the app shows a
 * "not connected" screen rather than quietly keeping accounts on the phone.
 */
interface SupabaseConfig {
  url: string;
  anonKey: string;
}

function readConfig(): SupabaseConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    supabase?: { url?: unknown; anonKey?: unknown };
  };
  const fromApp = extra.supabase ?? {};
  const pick = (env: string | undefined, app: unknown): string =>
    (env && env.trim()) || (typeof app === 'string' ? app.trim() : '');

  return {
    url: pick(process.env.EXPO_PUBLIC_SUPABASE_URL, fromApp.url),
    anonKey: pick(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, fromApp.anonKey),
  };
}

const config = readConfig();

export const isSupabaseConfigured = (): boolean =>
  config.url.length > 0 && config.anonKey.length > 0;

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Bantay is not connected to a database. Set expo.extra.supabase in app.json, ' +
        'or EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.',
    );
  }
  if (!client) {
    client = createClient(config.url, config.anonKey, {
      auth: {
        // React Native has no localStorage, so the session is persisted in
        // AsyncStorage instead.
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // There is no URL bar to parse a session out of on mobile.
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
