import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

/**
 * Supabase configuration.
 *
 * Read from `EXPO_PUBLIC_*` variables, which Expo inlines at build time. Only
 * the anon key belongs here: it is designed to be public and is safe in a
 * shipped app *provided* Row Level Security is enabled on every table. The
 * service-role key must never appear in a client - it bypasses RLS entirely.
 *
 * When these are unset the app falls back to the on-device backend, so a
 * fresh clone still runs with no configuration at all.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = (): boolean =>
  url.length > 0 && anonKey.length > 0;

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY in .env - see docs/SUPABASE.md.',
    );
  }
  if (!client) {
    client = createClient(url, anonKey, {
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
