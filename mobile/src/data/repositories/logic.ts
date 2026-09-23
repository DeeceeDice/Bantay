import { Geo, LatLng } from '../../core/geo/latLng';
import { HazardSeverity, severityRank } from '../models/enums';
import {
  AlertItem,
  HazardReport,
  RouteStatus,
  SafeSpot,
  SafetyCheckResult,
  SavedRoute,
  UserProfile,
  routePath,
} from '../models/types';

/** How close a hazard must be to a saved route to count against it. */
export const ROUTE_HAZARD_THRESHOLD_METERS = 120;

/**
 * Pure domain rules.
 *
 * Kept free of React and of storage so both backends inherit identical
 * behaviour and so every rule here is directly unit-testable.
 */

/** Hazards everyone can see: verified only. */
export const verifiedHazards = (reports: readonly HazardReport[]): HazardReport[] =>
  reports.filter((r) => r.status === 'verified');

/** Reports awaiting an official's decision. */
export const pendingReports = (reports: readonly HazardReport[]): HazardReport[] =>
  reports.filter((r) => r.status === 'pending');

/** Reports filed by one user, newest first. */
export const reportsByUser = (
  reports: readonly HazardReport[],
  userId: string,
): HazardReport[] =>
  reports
    .filter((r) => r.reporterId === userId)
    .sort((a, b) => Date.parse(b.reportedAt) - Date.parse(a.reportedAt));

/** Alerts newest first. Sorts a copy so reading never mutates state. */
export const sortedAlerts = (alerts: readonly AlertItem[]): AlertItem[] =>
  [...alerts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

export const unreadCount = (alerts: readonly AlertItem[]): number =>
  alerts.filter((a) => !a.isRead).length;

/** Verified hazards within `radiusMeters` of `origin`, nearest first. */
export function hazardsNear(
  reports: readonly HazardReport[],
  origin: LatLng,
  radiusMeters: number,
): HazardReport[] {
  return verifiedHazards(reports)
    .filter((h) => Geo.distanceMeters(origin, h.location) <= radiusMeters)
    .sort(
      (a, b) =>
        Geo.distanceMeters(origin, a.location) - Geo.distanceMeters(origin, b.location),
    );
}

const worstOf = (hazards: readonly HazardReport[]): HazardSeverity | null =>
  hazards.length === 0
    ? null
    : hazards
        .map((h) => h.severity)
        .reduce((a, b) => (severityRank[a] >= severityRank[b] ? a : b));

/** Backs the "Am I Safe Here?" button. */
export function checkSafety(
  reports: readonly HazardReport[],
  origin: LatLng,
  radiusMeters: number,
): SafetyCheckResult {
  const hazards = hazardsNear(reports, origin, radiusMeters);
  if (hazards.length === 0) {
    return {
      isSafe: true,
      hazards: [],
      nearest: null,
      nearestDistanceMeters: null,
      worstSeverity: null,
    };
  }
  const nearest = hazards[0];
  return {
    isSafe: false,
    hazards,
    nearest,
    nearestDistanceMeters: Geo.distanceMeters(origin, nearest.location),
    worstSeverity: worstOf(hazards),
  };
}

/** Live status badge for a saved route. */
export function statusForRoute(
  reports: readonly HazardReport[],
  route: SavedRoute,
): RouteStatus {
  const path = routePath(route);
  const onRoute = verifiedHazards(reports).filter(
    (h) => Geo.distanceToPathMeters(h.location, path) <= ROUTE_HAZARD_THRESHOLD_METERS,
  );
  return {
    hazardCount: onRoute.length,
    worstSeverity: worstOf(onRoute),
    hazards: onRoute,
  };
}

export const isOnAnySavedRoute = (
  routes: readonly SavedRoute[],
  point: LatLng,
): boolean =>
  routes.some(
    (r) => Geo.distanceToPathMeters(point, routePath(r)) <= ROUTE_HAZARD_THRESHOLD_METERS,
  );

export const routeContaining = (
  routes: readonly SavedRoute[],
  point: LatLng,
): SavedRoute | null =>
  routes.find(
    (r) => Geo.distanceToPathMeters(point, routePath(r)) <= ROUTE_HAZARD_THRESHOLD_METERS,
  ) ?? null;

/**
 * Pending reports an official is responsible for.
 *
 * Officials only see their assigned area, so one barangay cannot moderate
 * another's reports. Most dangerous first, then most recent, so the worst
 * hazard is never buried below a queue of minor ones.
 */
export function pendingForOfficial(
  reports: readonly HazardReport[],
  official: UserProfile,
): HazardReport[] {
  return reports
    .filter(
      (r) =>
        r.status === 'pending' &&
        Geo.distanceMeters(official.areaCenter, r.location) <= official.areaRadiusMeters,
    )
    .sort((a, b) => {
      const bySeverity = severityRank[b.severity] - severityRank[a.severity];
      return bySeverity !== 0
        ? bySeverity
        : Date.parse(b.reportedAt) - Date.parse(a.reportedAt);
    });
}

/** Safe spots sorted by distance from a point, optionally filtered. */
export function safeSpotsNear(
  spots: readonly SafeSpot[],
  origin: LatLng,
  category?: SafeSpot['category'] | null,
): SafeSpot[] {
  return spots
    .filter((s) => !category || s.category === category)
    .sort(
      (a, b) =>
        Geo.distanceMeters(origin, a.location) - Geo.distanceMeters(origin, b.location),
    );
}

/**
 * Applies one community vote, refusing a second from the same user so the
 * counter cannot be inflated by tapping repeatedly.
 */
export function applyVote(
  report: HazardReport,
  userId: string,
  confirms: boolean,
): HazardReport | null {
  if (report.votedUserIds.includes(userId)) return null;
  return {
    ...report,
    confirmCount: confirms ? report.confirmCount + 1 : report.confirmCount,
    denyCount: confirms ? report.denyCount : report.denyCount + 1,
    votedUserIds: [...report.votedUserIds, userId],
  };
}

/** Applies one inaccuracy flag, also one per user. */
export function applyFlag(report: HazardReport, userId: string): HazardReport | null {
  if (report.flaggedUserIds.includes(userId)) return null;
  return {
    ...report,
    flagCount: report.flagCount + 1,
    flaggedUserIds: [...report.flaggedUserIds, userId],
  };
}

export const hazardTitle = (type: HazardReport['type']): string => {
  switch (type) {
    case 'flooded_road':
      return 'Flooding';
    case 'landslide':
      return 'Landslide';
    case 'fallen_tree':
      return 'Fallen tree/debris';
    case 'power_line_down':
      return 'Power line down';
    case 'impassable_bridge':
      return 'Impassable bridge';
    default:
      return 'Hazard';
  }
};
