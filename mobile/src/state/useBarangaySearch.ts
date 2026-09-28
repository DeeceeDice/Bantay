import { useEffect, useState } from 'react';

import { LatLng } from '../core/geo/latLng';
import {
  barangaySearchText,
  isGoogleMapsConfigured,
  searchPlacesOnline,
} from '../data/google/googleMaps';
import { Barangay } from '../data/models/types';
import { useApp } from './appStore';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

/**
 * Searches the PSGC barangay list in the shared database as the user types.
 * `error` is set when the database could not be reached, so the screen can
 * say so instead of showing "no match".
 */
export function useBarangaySearch(query: string): {
  results: Barangay[];
  searching: boolean;
  error: string | null;
} {
  const { searchBarangays } = useApp();
  const trimmed = query.trim();
  const enabled = trimmed.length >= MIN_QUERY_LENGTH;
  const [found, setFound] = useState<{
    query: string;
    results: Barangay[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const timer = setTimeout(() => {
      searchBarangays(trimmed).then(
        (results) => live && setFound({ query: trimmed, results, error: null }),
        (e: unknown) =>
          live &&
          setFound({
            query: trimmed,
            results: [],
            error: e instanceof Error ? e.message : String(e),
          }),
      );
    }, DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [enabled, trimmed, searchBarangays]);

  if (!enabled) return { results: [], searching: false, error: null };
  if (found?.query !== trimmed) return { results: [], searching: true, error: null };
  return { results: found.results, searching: false, error: found.error };
}

/**
 * Where a barangay is on the map, from Google Places. PSGC has names and
 * codes but no coordinates; a new zone needs a centre.
 *
 * `center` is null when there is no key, no connection or no match - the
 * request can still be filed, and the super admin picks the zone instead.
 */
export function useBarangayCentre(barangay: Barangay | null): {
  center: LatLng | null;
  address: string | null;
  locating: boolean;
} {
  const code = barangay?.code ?? null;
  const enabled = code !== null && isGoogleMapsConfigured();
  const [found, setFound] = useState<{
    code: string;
    center: LatLng | null;
    address: string | null;
  } | null>(null);
  const text = barangay ? barangaySearchText(barangay) : '';

  useEffect(() => {
    if (!enabled || code === null) return;
    const abort = new AbortController();
    searchPlacesOnline(text, null, abort.signal).then(
      (places) =>
        setFound({
          code,
          center: places[0]?.location ?? null,
          address: places[0]?.address ?? null,
        }),
      () => {
        if (!abort.signal.aborted) setFound({ code, center: null, address: null });
      },
    );
    return () => abort.abort();
  }, [enabled, code, text]);

  if (!enabled || found?.code !== code) {
    return { center: null, address: null, locating: enabled };
  }
  return { center: found.center, address: found.address, locating: false };
}
