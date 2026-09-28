import { LatLng } from '../../core/geo/latLng';
import { OfficialRole, SelfServiceRole } from '../models/enums';
import {
  AccessRequest,
  AlertItem,
  Barangay,
  HazardReport,
  SafeSpot,
  SavedRoute,
  UserProfile,
  Zone,
} from '../models/types';

/** Everything the app reads on startup, in one round trip. */
export interface Snapshot {
  reports: HazardReport[];
  safeSpots: SafeSpot[];
  routes: SavedRoute[];
  alerts: AlertItem[];
  subscribedSpotIds: string[];
  zones: Zone[];
  /** The signed-in user's own access requests, newest first. */
  accessRequests: AccessRequest[];
}

export const emptySnapshot = (): Snapshot => ({
  reports: [],
  safeSpots: [],
  routes: [],
  alerts: [],
  subscribedSpotIds: [],
  zones: [],
  accessRequests: [],
});

/**
 * The parts of a profile its owner may change. Role here is only ever a
 * self-service role; everything else on the profile - official roles, zone,
 * status, statistics - is written by the database or a super admin, and the
 * database refuses a client that tries.
 */
export interface OwnProfilePatch {
  name?: string;
  role?: SelfServiceRole;
  homeZoneId?: string | null;
}

export interface AccessRequestInput {
  role: OfficialRole;
  /** An existing zone, or null when a PSGC barangay is named instead. */
  zoneId: string | null;
  /**
   * The official barangay, with the map centre found for it (null if none
   * could be found). Approval turns it into a zone if there is none yet.
   */
  psgc?: { code: string; center: LatLng | null };
  organization: string;
  reason: string;
}

/**
 * The persistence seam.
 *
 * Deliberately storage-level rather than operation-level: all of Bantay's
 * rules - one vote per user, what verification does to stats and alerts, how
 * a route picks up hazards - live once in `appStore` and `logic.ts`, and the
 * backend only stores and returns rows. Supabase is the only implementation;
 * the interface exists so the store can be tested against a fake client.
 */
export interface BantayBackend {
  loadAll(): Promise<Snapshot>;

  upsertReport(report: HazardReport): Promise<void>;
  upsertRoute(route: SavedRoute): Promise<void>;
  removeRoute(routeId: string): Promise<void>;
  replaceAlerts(alerts: AlertItem[]): Promise<void>;
  addAlert(alert: AlertItem): Promise<void>;
  setSubscribedSpots(spotIds: string[]): Promise<void>;
  updateOwnProfile(userId: string, patch: OwnProfilePatch): Promise<void>;
  submitAccessRequest(userId: string, input: AccessRequestInput): Promise<void>;
  /** Barangays from PSGC whose name, city or province match every word. */
  searchBarangays(query: string): Promise<Barangay[]>;

  /**
   * Notifies when another device changes shared data. Returns an unsubscribe
   * function.
   */
  subscribe(onChange: () => void): () => void;
}

export interface AuthResult {
  ok: boolean;
  profile: UserProfile | null;
  error: string | null;
  /**
   * The account was created but cannot be used until its email address is
   * confirmed. Not a failure: the screen should say "check your inbox", not
   * "something went wrong". Only happens if the project owner turns "Confirm
   * email" back on.
   */
  needsEmailConfirmation: boolean;
}

export const authOk = (profile: UserProfile): AuthResult => ({
  ok: true,
  profile,
  error: null,
  needsEmailConfirmation: false,
});

export const authFail = (error: string): AuthResult => ({
  ok: false,
  profile: null,
  error,
  needsEmailConfirmation: false,
});

export const authConfirmEmail = (message: string): AuthResult => ({
  ok: false,
  profile: null,
  error: message,
  needsEmailConfirmation: true,
});

/**
 * Accounts. Every method goes to Supabase Auth: an account exists only if it
 * exists in the project's `auth.users` table, and a session is only ever one
 * that Supabase issued.
 */
export interface BantayAuth {
  /** Restores a previous session, or null when signed out. */
  restore(): Promise<UserProfile | null>;

  signUp(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult>;

  logIn(input: { email: string; password: string }): Promise<AuthResult>;

  logOut(): Promise<void>;

  /**
   * Calls back when the session ends without the user pressing "log out" -
   * a refresh token that was revoked or expired, or the account deleted.
   * Returns an unsubscribe function.
   */
  onSignedOut(callback: () => void): () => void;
}
