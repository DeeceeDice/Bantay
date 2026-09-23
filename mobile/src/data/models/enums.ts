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
] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles allowed to verify or reject community reports. */
export const canVerify = (role: UserRole): boolean =>
  role === 'barangay_official' || role === 'school_admin';

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

export const REPORT_STATUSES = ['pending', 'verified', 'rejected'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const SAFE_SPOT_CATEGORIES = [
  'mall',
  'school',
  'evacuation_center',
  'terminal',
] as const;
export type SafeSpotCategory = (typeof SAFE_SPOT_CATEGORIES)[number];

export const ALERT_KINDS = [
  'verified_hazard',
  'typhoon_warning',
  'safe_spot_update',
  'report_verified',
  'report_rejected',
  'route_status',
] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

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
