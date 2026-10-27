import { useEffect, useState } from 'react';

import { HazardReport } from '../data/models/types';
import { useApp } from './appStore';

/**
 * Photos already fetched this session, newest last. A photo is about 100 KB,
 * so the cache is bounded; anything evicted is simply fetched again.
 */
const CACHE_SIZE = 40;
const cache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

function remember(reportId: string, uri: string | null): void {
  cache.delete(reportId);
  cache.set(reportId, uri);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
}

/**
 * A report's photo, fetched from the database the first time it is shown.
 *
 * Reports are read without their photos (see REPORT_COLUMNS in
 * supabaseBackend.ts), so opening the map does not download every photo on
 * it. A report this device just filed already carries its photo and is shown
 * straight away.
 */
export function useReportPhoto(
  report: Pick<HazardReport, 'id' | 'photoUri' | 'hasPhoto'>,
): { uri: string | null; loading: boolean } {
  const { loadReportPhoto } = useApp();
  const needsFetch = report.photoUri === null && report.hasPhoto;
  const [loaded, setLoaded] = useState<{ id: string; uri: string | null } | null>(null);

  useEffect(() => {
    if (!needsFetch || cache.has(report.id)) return;
    let cancelled = false;
    let request = inFlight.get(report.id);
    if (!request) {
      request = loadReportPhoto(report.id).finally(() => inFlight.delete(report.id));
      inFlight.set(report.id, request);
    }
    request.then(
      (uri) => {
        remember(report.id, uri);
        if (!cancelled) setLoaded({ id: report.id, uri });
      },
      () => {
        // Offline: show the "no photo" illustration rather than spin forever.
        if (!cancelled) setLoaded({ id: report.id, uri: null });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [needsFetch, report.id, loadReportPhoto]);

  if (!needsFetch) return { uri: report.photoUri, loading: false };
  if (cache.has(report.id)) return { uri: cache.get(report.id) ?? null, loading: false };
  if (loaded?.id === report.id) return { uri: loaded.uri, loading: false };
  return { uri: null, loading: true };
}
