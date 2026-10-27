import { HazardReport } from '../models/types';
import { DataChange } from './backend';

/**
 * Past this many reports in one burst of events, one full reload is cheaper
 * than that many single-row reads.
 */
export const MAX_ROW_READS = 25;

/** What a burst of realtime events asks the store to read again. */
export interface ChangePlan {
  /** Reports to read again, row by row. */
  reportIds: string[];
  /** Reports that were deleted. */
  deletedReportIds: string[];
  safeSpots: boolean;
  /** Alerts arrived: they are also how the database says a review, an approval or a role change happened. */
  personal: boolean;
  /** Too much changed at once: reload everything instead. */
  reloadAll: boolean;
}

/** Folds a burst of events into the least reading that brings the app up to date. */
export function planChanges(changes: readonly DataChange[]): ChangePlan {
  const reportIds = new Set<string>();
  const deleted = new Set<string>();
  let safeSpots = false;
  let personal = false;

  for (const change of changes) {
    switch (change.table) {
      case 'reports':
        if (change.deleted) deleted.add(change.reportId);
        else reportIds.add(change.reportId);
        break;
      case 'report_votes':
        reportIds.add(change.reportId);
        break;
      case 'safe_spots':
        safeSpots = true;
        break;
      case 'alerts':
        personal = true;
        break;
    }
  }
  deleted.forEach((id) => reportIds.delete(id));

  return {
    reportIds: [...reportIds],
    deletedReportIds: [...deleted],
    safeSpots,
    personal,
    reloadAll: reportIds.size > MAX_ROW_READS,
  };
}

/**
 * Puts re-read reports into the list: replaced in place, appended when new,
 * removed when deleted or no longer visible (a null read). A photo this
 * device already holds - one it just took - is kept rather than fetched back.
 */
export function mergeReports(
  current: readonly HazardReport[],
  fresh: ReadonlyMap<string, HazardReport | null>,
  deletedIds: readonly string[],
): HazardReport[] {
  const gone = new Set(deletedIds);
  fresh.forEach((report, id) => {
    if (report === null) gone.add(id);
  });

  const seen = new Set<string>();
  const merged: HazardReport[] = [];
  for (const report of current) {
    if (gone.has(report.id)) continue;
    const next = fresh.get(report.id);
    seen.add(report.id);
    merged.push(next ? { ...next, photoUri: next.photoUri ?? report.photoUri } : report);
  }
  fresh.forEach((report, id) => {
    if (report && !seen.has(id)) merged.push(report);
  });
  return merged;
}
