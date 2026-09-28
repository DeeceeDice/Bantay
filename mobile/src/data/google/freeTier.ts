import { supabase } from '../repositories/supabaseClient';

/**
 * Tickets for Google calls, handed out by the shared database so that all
 * phones together stay inside Google's free monthly allowance
 * (supabase/migrations/20260928140000_free_tier_guard.sql).
 *
 * Fails closed: if the database says no, or cannot be asked, the call is not
 * made and the caller uses its free fallback. Free beats clever.
 */
export type GoogleApi = 'places_text_search' | 'routes_compute' | 'map_tiles_view';

export class FreeTierExhausted extends Error {
  constructor() {
    super("This month's free Google allowance is used up.");
    this.name = 'FreeTierExhausted';
  }
}

export async function claimGoogleCall(api: GoogleApi): Promise<boolean> {
  try {
    const { data, error } = await supabase().rpc('claim_api_call', { api });
    return !error && data === true;
  } catch {
    return false;
  }
}
