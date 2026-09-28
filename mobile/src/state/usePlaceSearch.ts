import { useEffect, useState } from 'react';

import { LatLng, latLng } from '../core/geo/latLng';
import {
  PlaceResult,
  isGoogleMapsConfigured,
  searchPlacesOnline,
} from '../data/google/googleMaps';

/** Wait this long after the last keystroke before asking Google. */
const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

/**
 * Google place search for the map's search bar, debounced.
 *
 * Returns nothing (rather than an error) when there is no key, no
 * connection or no match, so the caller's offline gazetteer carries on alone.
 */
export function usePlaceSearch(
  query: string,
  near: LatLng,
): { results: PlaceResult[]; searching: boolean } {
  const trimmed = query.trim();
  const enabled = isGoogleMapsConfigured() && trimmed.length >= MIN_QUERY_LENGTH;
  const [found, setFound] = useState<{ query: string; results: PlaceResult[] } | null>(null);

  // Rounded to about a kilometre so walking around does not re-run the search.
  const nearLat = Math.round(near.lat * 100) / 100;
  const nearLng = Math.round(near.lng * 100) / 100;

  useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      searchPlacesOnline(trimmed, latLng(nearLat, nearLng), abort.signal).then(
        (results) => setFound({ query: trimmed, results }),
        () => {
          if (!abort.signal.aborted) setFound({ query: trimmed, results: [] });
        },
      );
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [enabled, trimmed, nearLat, nearLng]);

  if (!enabled) return { results: [], searching: false };
  const current = found?.query === trimmed ? found.results : null;
  return { results: current ?? [], searching: current === null };
}
