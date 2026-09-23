import { AlertItem, HazardReport, SafeSpot, SavedRoute, UserProfile } from '../models/types';

/** Everything the app reads on startup, in one round trip. */
export interface Snapshot {
  reports: HazardReport[];
  safeSpots: SafeSpot[];
  routes: SavedRoute[];
  alerts: AlertItem[];
  subscribedSpotIds: string[];
}

export const emptySnapshot = (): Snapshot => ({
  reports: [],
  safeSpots: [],
  routes: [],
  alerts: [],
  subscribedSpotIds: [],
});

/**
 * The persistence seam.
 *
 * Deliberately storage-level rather than operation-level: all of Bantay's
 * rules - one vote per user, what verification does to stats and alerts, how
 * a route picks up hazards - live once in `bantayStore`, and a backend only
 * has to store and return rows. That means the local and Supabase backends
 * can never disagree about behaviour, because neither one implements it.
 *
 * `subscribe` is optional: the local backend has nobody to hear from, while
 * Supabase pushes realtime changes so two devices stay in step.
 */
export interface BantayBackend {
  readonly kind: 'local' | 'supabase';

  /** Writes the bundled sample content, but only on a genuinely empty store. */
  seedIfEmpty(): Promise<void>;

  loadAll(): Promise<Snapshot>;

  upsertReport(report: HazardReport): Promise<void>;
  upsertRoute(route: SavedRoute): Promise<void>;
  removeRoute(routeId: string): Promise<void>;
  replaceAlerts(alerts: AlertItem[]): Promise<void>;
  addAlert(alert: AlertItem): Promise<void>;
  setSubscribedSpots(spotIds: string[]): Promise<void>;
  upsertProfile(profile: UserProfile): Promise<void>;

  /** Restores the bundled sample content, discarding current rows. */
  resetToSeed(): Promise<void>;

  /**
   * Notifies when another device changes shared data. Returns an unsubscribe
   * function. Backends without realtime simply omit this.
   */
  subscribe?(onChange: () => void): () => void;
}

/** Auth is a separate seam, because a real backend replaces it first. */
export interface AuthResult {
  ok: boolean;
  profile: UserProfile | null;
  error: string | null;
}

export const authOk = (profile: UserProfile): AuthResult => ({
  ok: true,
  profile,
  error: null,
});

export const authFail = (error: string): AuthResult => ({
  ok: false,
  profile: null,
  error,
});

export interface BantayAuth {
  readonly kind: 'local' | 'supabase';

  /** Restores a previous session, or null when signed out. */
  restore(): Promise<UserProfile | null>;

  signUp(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult>;

  logIn(input: { email: string; password: string }): Promise<AuthResult>;

  signInWithProvider(provider: string): Promise<AuthResult>;

  updateProfile(profile: UserProfile): Promise<void>;

  logOut(): Promise<void>;
}
