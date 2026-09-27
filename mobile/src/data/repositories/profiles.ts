import { latLng } from '../../core/geo/latLng';
import { UserProfile } from '../models/types';

/** Default assigned area: the Sampaloc corridor the sample data covers. */
export const DEFAULT_AREA_CENTER = latLng(14.6096, 120.9925);
export const DEFAULT_AREA_RADIUS_METERS = 3000;

/**
 * The profile row for a freshly created account.
 *
 * The database trigger normally writes this row at sign-up; the app only
 * builds one itself for an account that predates the trigger, so both paths
 * have to agree on the defaults.
 */
export function newProfile(input: { id: string; name: string; email: string }): UserProfile {
  return {
    id: input.id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    // Role is chosen on the next screen; commuter is the safe default so a
    // half-finished signup can never grant verification powers.
    role: 'commuter',
    status: 'active',
    zoneId: null,
    homeZoneId: null,
    barangay: 'Sampaloc, Manila',
    reportsSubmitted: 0,
    reportsVerified: 0,
    reportsRejected: 0,
    verificationsPerformed: 0,
    authProvider: 'email',
    joinedAt: new Date().toISOString(),
    areaCenter: DEFAULT_AREA_CENTER,
    areaRadiusMeters: DEFAULT_AREA_RADIUS_METERS,
  };
}
