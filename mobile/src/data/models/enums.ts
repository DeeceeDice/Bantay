/**
 * Domain enums for Bantay.
 *
 * Every value is a stable string used directly as its persisted identity, so
 * renaming a TypeScript constant never invalidates stored data - and the same
 * strings are the enum values in the Supabase schema.
 */

export const USER_ROLES = [
  'commuter',
  'barangay_official',
  'school_admin',
  'business_owner',
  'super_admin',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles anyone can pick for themselves. */
export const SELF_SERVICE_ROLES = ['commuter', 'business_owner'] as const;
export type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];

/**
 * Roles that carry verification powers. They are granted by a super admin
 * approving an access request - the database refuses a self-granted one.
 */
export const OFFICIAL_ROLES = ['barangay_official', 'school_admin'] as const;
export type OfficialRole = (typeof OFFICIAL_ROLES)[number];

export const isSelfServiceRole = (role: UserRole): role is SelfServiceRole =>
  (SELF_SERVICE_ROLES as readonly string[]).includes(role);

/** Roles allowed to verify or reject community reports. */
export const canVerify = (role: UserRole): boolean =>
  role === 'barangay_official' || role === 'school_admin' || role === 'super_admin';

export const USER_STATUSES = ['active', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const HAZARD_TYPES = [
  'flooded_road',
  'landslide',
  'fallen_tree',
  'power_line_down',
  'impassable_bridge',
  'other',
] as const;
export type HazardType = (typeof HAZARD_TYPES)[number];

export const HAZARD_SEVERITIES = [
  'passable_with_caution',
  'not_passable',
  'life_threatening',
] as const;
export type HazardSeverity = (typeof HAZARD_SEVERITIES)[number];

/** Higher means more dangerous; drives sort order and banner colour. */
export const severityRank: Record<HazardSeverity, number> = {
  passable_with_caution: 1,
  not_passable: 2,
  life_threatening: 3,
};

/**
 * `flagged` is an escalation from an official to a super admin: still
 * unconfirmed, so it reads as awaiting review everywhere in this app.
 */
export const REPORT_STATUSES = ['pending', 'verified', 'rejected', 'flagged'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Still waiting on an official's decision. */
export const isAwaitingReview = (status: ReportStatus): boolean =>
  status === 'pending' || status === 'flagged';

/** Why a report was rejected. Required by the database for every rejection. */
export const REJECT_REASONS = [
  'duplicate',
  'false_report',
  'insufficient',
  'outdated',
  'other',
] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

export const SAFE_SPOT_CATEGORIES = [
  'mall',
  'school',
  'evacuation_center',
  'terminal',
  'other',
] as const;
export type SafeSpotCategory = (typeof SAFE_SPOT_CATEGORIES)[number];

export const ALERT_KINDS = [
  'verified_hazard',
  'typhoon_warning',
  'safe_spot_update',
  'report_verified',
  'report_rejected',
  'route_status',
  /** An announcement sent by an official or super admin. */
  'broadcast',
  /** An access request was decided, or the account's role or status changed. */
  'account',
] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export const ZONE_KINDS = ['barangay', 'school'] as const;
export type ZoneKind = (typeof ZONE_KINDS)[number];

export const ACCESS_REQUEST_STATUSES = ['pending', 'approved', 'denied'] as const;
export type AccessRequestStatus = (typeof ACCESS_REQUEST_STATUSES)[number];

/** Which pin layers the map is currently showing. */
export const MAP_LAYERS = [
  'verified_hazards',
  'pending_reports',
  'safe_spots',
] as const;
export type MapLayer = (typeof MAP_LAYERS)[number];

/**
 * Narrows an unknown persisted value back to a union member, falling back
 * when storage holds something a newer or older build wrote.
 */
export function parseEnum<T extends string>(
  values: readonly T[],
  raw: unknown,
  fallback: T,
): T {
  return typeof raw === 'string' && (values as readonly string[]).includes(raw)
    ? (raw as T)
    : fallback;
}
