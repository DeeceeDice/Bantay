import { LatLng } from '../../core/geo/latLng';
import {
  AccessRequestStatus,
  AlertKind,
  HazardSeverity,
  HazardType,
  OfficialRole,
  RejectReason,
  ReportStatus,
  SafeSpotCategory,
  UserRole,
  UserStatus,
  ZoneKind,
} from './enums';

/**
 * A hazard reported by the community.
 *
 * This is the single source of truth that the map, the alerts feed, the
 * verification panel, saved-route status and profile stats all read from, so
 * a change here propagates everywhere.
 */
export interface HazardReport {
  id: string;
  type: HazardType;
  severity: HazardSeverity;
  status: ReportStatus;
  location: LatLng;
  /** Reverse-geocoded street label shown on pins and cards. */
  addressLabel: string;
  reportedAt: string;
  reporterId: string;
  reporterName: string;
  description: string;
  /** Local file URI, remote URL, or a `seed:` key for bundled sample scenes. */
  photoUri: string | null;
  confirmCount: number;
  denyCount: number;
  flagCount: number;
  verifiedBy: string | null;
  verifiedAt: string | null;
  /** Set when the report was rejected. */
  rejectReason: RejectReason | null;
  rejectNote: string | null;
  /** Users who already voted, so the UI can stop double counting. */
  votedUserIds: string[];
  flaggedUserIds: string[];
}

/** The signed-in user. */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** A suspended account can read the map but not report, vote or flag. */
  status: UserStatus;
  /** The zone an official reviews. Assigned by a super admin. */
  zoneId: string | null;
  /** The area whose broadcasts and verified-hazard alerts this person gets. */
  homeZoneId: string | null;
  /** Assigned area. Officials only see pending reports inside their area. */
  barangay: string;
  reportsSubmitted: number;
  reportsVerified: number;
  reportsRejected: number;
  verificationsPerformed: number;
  authProvider: string;
  joinedAt: string | null;
  /**
   * Centre of an official's assigned area, and the radius that stands in for
   * a real barangay boundary. Swapping in an LGU polygon later changes only
   * `pendingForOfficial`.
   */
  areaCenter: LatLng;
  areaRadiusMeters: number;
}

/** A barangay or school zone an official is responsible for. */
export interface Zone {
  id: string;
  name: string;
  kind: ZoneKind;
  city: string;
  center: LatLng;
  radiusMeters: number;
}

/** A request to be made an official, decided by a super admin. */
export interface AccessRequest {
  id: string;
  role: OfficialRole;
  zoneId: string | null;
  organization: string;
  reason: string;
  status: AccessRequestStatus;
  submittedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
}

/** A verified place people can shelter in. */
export interface SafeSpot {
  id: string;
  name: string;
  category: SafeSpotCategory;
  location: LatLng;
  addressLabel: string;
  description: string;
  openingHours: string;
  isOpenNow: boolean;
  capacity: number | null;
  contactNumber: string | null;
  lastUpdated: string | null;
}

/**
 * A commute the user travels often.
 *
 * Stores its own polyline so the list can draw a mini preview and so hazard
 * matching measures distance to the path, not just the endpoints.
 */
export interface SavedRoute {
  id: string;
  label: string;
  startLabel: string;
  endLabel: string;
  start: LatLng;
  end: LatLng;
  waypoints: LatLng[];
  createdAt: string | null;
}

/**
 * One entry in the Alerts feed.
 *
 * Alerts are generated whenever domain state changes, so the feed is a
 * faithful log rather than a separate mock list.
 */
export interface AlertItem {
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  /** Deep-link targets. Tapping an alert opens whichever of these is set. */
  reportId: string | null;
  safeSpotId: string | null;
  routeId: string | null;
  /** Drives the "My Saved Routes" vs "Everywhere Nearby" filter. */
  onSavedRoute: boolean;
}

/** Live status of one saved route. */
export interface RouteStatus {
  hazardCount: number;
  worstSeverity: HazardSeverity | null;
  hazards: HazardReport[];
}

/** Outcome of the "Am I Safe Here?" check. */
export interface SafetyCheckResult {
  isSafe: boolean;
  hazards: HazardReport[];
  nearest: HazardReport | null;
  nearestDistanceMeters: number | null;
  worstSeverity: HazardSeverity | null;
}

/** Full route polyline including both endpoints. */
export const routePath = (route: SavedRoute): LatLng[] => [
  route.start,
  ...route.waypoints,
  route.end,
];

/**
 * Community trust score out of 100.
 *
 * Starts at a neutral 50 and moves with the user's verified-to-rejected
 * ratio, so a new account is neither trusted nor punished.
 */
export function trustScore(user: UserProfile): number {
  if (user.reportsSubmitted === 0) return 50;
  const judged = user.reportsVerified + user.reportsRejected;
  if (judged === 0) return 50;

  const ratio = user.reportsVerified / judged;
  // Volume bonus caps at +15 so a prolific reporter cannot outrank accuracy.
  const volumeBonus = Math.round(Math.min(15, Math.max(0, user.reportsVerified * 1.5)));
  return Math.round(Math.min(100, Math.max(0, 35 + ratio * 50 + volumeBonus)));
}

/** One or two letters for the avatar placeholder. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
