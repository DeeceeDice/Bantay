import { RealtimeChannel } from '@supabase/supabase-js';

import { latLng } from '../../core/geo/latLng';
import {
  ALERT_KINDS,
  HAZARD_SEVERITIES,
  HAZARD_TYPES,
  REPORT_STATUSES,
  SAFE_SPOT_CATEGORIES,
  USER_ROLES,
  parseEnum,
} from '../models/enums';
import {
  AlertItem,
  HazardReport,
  SafeSpot,
  SavedRoute,
  UserProfile,
} from '../models/types';
import {
  AuthResult,
  BantayAuth,
  BantayBackend,
  Snapshot,
  authFail,
  authOk,
} from './backend';
import { DEFAULT_AREA_CENTER, DEFAULT_AREA_RADIUS_METERS } from './localAuth';
import { isSupabaseConfigured, supabase } from './supabaseClient';

export { isSupabaseConfigured };

/* -------------------------------------------------------------------------
 * Row mappers
 *
 * Postgres columns are snake_case and the app is camelCase, so every table
 * gets an explicit mapper. Being explicit here means a schema change fails
 * loudly in one place rather than producing `undefined` three screens away.
 * ---------------------------------------------------------------------- */

interface ReportRow {
  id: string;
  type: string;
  severity: string;
  status: string;
  lat: number;
  lng: number;
  address_label: string;
  reported_at: string;
  reporter_id: string | null;
  reporter_name: string;
  description: string | null;
  photo_uri: string | null;
  verified_by: string | null;
  verified_at: string | null;
}

interface VoteRow {
  report_id: string;
  user_id: string;
  confirms: boolean;
}

interface FlagRow {
  report_id: string;
  user_id: string;
}

function toReport(
  row: ReportRow,
  votes: readonly VoteRow[],
  flags: readonly FlagRow[],
): HazardReport {
  const mine = votes.filter((v) => v.report_id === row.id);
  const myFlags = flags.filter((f) => f.report_id === row.id);
  return {
    id: row.id,
    type: parseEnum(HAZARD_TYPES, row.type, 'other'),
    severity: parseEnum(HAZARD_SEVERITIES, row.severity, 'passable_with_caution'),
    status: parseEnum(REPORT_STATUSES, row.status, 'pending'),
    location: latLng(row.lat, row.lng),
    addressLabel: row.address_label,
    reportedAt: row.reported_at,
    reporterId: row.reporter_id ?? '',
    reporterName: row.reporter_name,
    description: row.description ?? '',
    photoUri: row.photo_uri,
    confirmCount: mine.filter((v) => v.confirms).length,
    denyCount: mine.filter((v) => !v.confirms).length,
    flagCount: myFlags.length,
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at,
    votedUserIds: mine.map((v) => v.user_id),
    flaggedUserIds: myFlags.map((f) => f.user_id),
  };
}

const fromReport = (r: HazardReport): ReportRow => ({
  id: r.id,
  type: r.type,
  severity: r.severity,
  status: r.status,
  lat: r.location.lat,
  lng: r.location.lng,
  address_label: r.addressLabel,
  reported_at: r.reportedAt,
  reporter_id: r.reporterId === '' ? null : r.reporterId,
  reporter_name: r.reporterName,
  description: r.description,
  photo_uri: r.photoUri,
  verified_by: r.verifiedBy,
  verified_at: r.verifiedAt,
});

interface SafeSpotRow {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address_label: string;
  description: string | null;
  opening_hours: string | null;
  is_open_now: boolean;
  capacity: number | null;
  contact_number: string | null;
  last_updated: string | null;
}

const toSafeSpot = (row: SafeSpotRow): SafeSpot => ({
  id: row.id,
  name: row.name,
  category: parseEnum(SAFE_SPOT_CATEGORIES, row.category, 'evacuation_center'),
  location: latLng(row.lat, row.lng),
  addressLabel: row.address_label,
  description: row.description ?? '',
  openingHours: row.opening_hours ?? 'Open 24 hours',
  isOpenNow: row.is_open_now,
  capacity: row.capacity,
  contactNumber: row.contact_number,
  lastUpdated: row.last_updated,
});

interface RouteRow {
  id: string;
  user_id: string;
  label: string;
  start_label: string;
  end_label: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  waypoints: { lat: number; lng: number }[] | null;
  created_at: string | null;
}

const toRoute = (row: RouteRow): SavedRoute => ({
  id: row.id,
  label: row.label,
  startLabel: row.start_label,
  endLabel: row.end_label,
  start: latLng(row.start_lat, row.start_lng),
  end: latLng(row.end_lat, row.end_lng),
  waypoints: (row.waypoints ?? []).map((w) => latLng(w.lat, w.lng)),
  createdAt: row.created_at,
});

interface AlertRow {
  id: string;
  user_id: string | null;
  kind: string;
  title: string;
  body: string;
  created_at: string;
  is_read: boolean;
  report_id: string | null;
  safe_spot_id: string | null;
  route_id: string | null;
  on_saved_route: boolean;
}

const toAlert = (row: AlertRow): AlertItem => ({
  id: row.id,
  kind: parseEnum(ALERT_KINDS, row.kind, 'verified_hazard'),
  title: row.title,
  body: row.body,
  createdAt: row.created_at,
  isRead: row.is_read,
  reportId: row.report_id,
  safeSpotId: row.safe_spot_id,
  routeId: row.route_id,
  onSavedRoute: row.on_saved_route,
});

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: string;
  barangay: string;
  reports_submitted: number;
  reports_verified: number;
  reports_rejected: number;
  verifications_performed: number;
  auth_provider: string | null;
  joined_at: string | null;
  area_center_lat: number;
  area_center_lng: number;
  area_radius_meters: number;
}

const toProfile = (row: ProfileRow): UserProfile => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: parseEnum(USER_ROLES, row.role, 'commuter'),
  barangay: row.barangay,
  reportsSubmitted: row.reports_submitted,
  reportsVerified: row.reports_verified,
  reportsRejected: row.reports_rejected,
  verificationsPerformed: row.verifications_performed,
  authProvider: row.auth_provider ?? 'email',
  joinedAt: row.joined_at,
  areaCenter: latLng(row.area_center_lat, row.area_center_lng),
  areaRadiusMeters: row.area_radius_meters,
});

const fromProfile = (p: UserProfile): ProfileRow => ({
  id: p.id,
  name: p.name,
  email: p.email,
  role: p.role,
  barangay: p.barangay,
  reports_submitted: p.reportsSubmitted,
  reports_verified: p.reportsVerified,
  reports_rejected: p.reportsRejected,
  verifications_performed: p.verificationsPerformed,
  auth_provider: p.authProvider,
  joined_at: p.joinedAt,
  area_center_lat: p.areaCenter.lat,
  area_center_lng: p.areaCenter.lng,
  area_radius_meters: p.areaRadiusMeters,
});

/* ---------------------------------------------------------------------- */

/**
 * Supabase-backed storage.
 *
 * Reports, safe spots and votes are shared across every device; routes,
 * alerts and subscriptions are scoped to the signed-in user by Row Level
 * Security, so the policies in the initial migration are what actually
 * enforce privacy - not this class.
 */
class SupabaseBackend implements BantayBackend {
  readonly kind = 'supabase' as const;
  private channel: RealtimeChannel | null = null;

  /**
   * Seeding is a server-side concern here: the SQL migration inserts the
   * sample safe spots and hazards once, for everyone. Doing it per-client
   * would race between devices and duplicate rows.
   */
  async seedIfEmpty(): Promise<void> {
    // Intentionally a no-op; see supabase/migrations/.
  }

  async resetToSeed(): Promise<void> {
    // Destructive shared-data resets belong in the dashboard or a migration,
    // not behind a button any demo viewer can press.
    throw new Error(
      'Resetting sample data is disabled on the Supabase backend. Re-run supabase/seed.sql instead.',
    );
  }

  async loadAll(): Promise<Snapshot> {
    const db = supabase();
    const [reports, votes, flags, safeSpots, routes, alerts, subs] = await Promise.all([
      db.from('reports').select('*'),
      db.from('report_votes').select('*'),
      db.from('report_flags').select('*'),
      db.from('safe_spots').select('*'),
      db.from('routes').select('*'),
      db.from('alerts').select('*'),
      db.from('spot_subscriptions').select('spot_id'),
    ]);

    const firstError = [reports, votes, flags, safeSpots, routes, alerts, subs].find(
      (r) => r.error,
    )?.error;
    if (firstError) throw new Error(firstError.message);

    const voteRows = (votes.data ?? []) as VoteRow[];
    const flagRows = (flags.data ?? []) as FlagRow[];

    return {
      reports: ((reports.data ?? []) as ReportRow[]).map((r) =>
        toReport(r, voteRows, flagRows),
      ),
      safeSpots: ((safeSpots.data ?? []) as SafeSpotRow[]).map(toSafeSpot),
      routes: ((routes.data ?? []) as RouteRow[]).map(toRoute),
      alerts: ((alerts.data ?? []) as AlertRow[]).map(toAlert),
      subscribedSpotIds: ((subs.data ?? []) as { spot_id: string }[]).map((s) => s.spot_id),
    };
  }

  async upsertReport(report: HazardReport): Promise<void> {
    const db = supabase();
    const { error } = await db.from('reports').upsert(fromReport(report));
    if (error) throw new Error(error.message);

    // Votes and flags live in their own tables so the database, not the
    // client, enforces one per user. Writes are idempotent on the composite
    // primary key.
    const userId = (await db.auth.getUser()).data.user?.id;
    if (!userId) return;

    if (report.votedUserIds.includes(userId)) {
      await db.from('report_votes').upsert({
        report_id: report.id,
        user_id: userId,
        confirms: report.confirmCount > 0,
      });
    }
    if (report.flaggedUserIds.includes(userId)) {
      await db.from('report_flags').upsert({ report_id: report.id, user_id: userId });
    }
  }

  async upsertRoute(route: SavedRoute): Promise<void> {
    const db = supabase();
    const userId = (await db.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Not signed in.');

    const { error } = await db.from('routes').upsert({
      id: route.id,
      user_id: userId,
      label: route.label,
      start_label: route.startLabel,
      end_label: route.endLabel,
      start_lat: route.start.lat,
      start_lng: route.start.lng,
      end_lat: route.end.lat,
      end_lng: route.end.lng,
      waypoints: route.waypoints,
      created_at: route.createdAt,
    });
    if (error) throw new Error(error.message);
  }

  async removeRoute(routeId: string): Promise<void> {
    const { error } = await supabase().from('routes').delete().eq('id', routeId);
    if (error) throw new Error(error.message);
  }

  async replaceAlerts(alerts: AlertItem[]): Promise<void> {
    const db = supabase();
    const userId = (await db.auth.getUser()).data.user?.id;
    if (!userId) return;
    const readIds = alerts.filter((a) => a.isRead).map((a) => a.id);
    if (readIds.length === 0) return;

    const { error } = await db
      .from('alerts')
      .update({ is_read: true })
      .in('id', readIds)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  }

  async addAlert(alert: AlertItem): Promise<void> {
    const db = supabase();
    const userId = (await db.auth.getUser()).data.user?.id;
    const { error } = await db.from('alerts').insert({
      id: alert.id,
      user_id: userId ?? null,
      kind: alert.kind,
      title: alert.title,
      body: alert.body,
      created_at: alert.createdAt,
      is_read: alert.isRead,
      report_id: alert.reportId,
      safe_spot_id: alert.safeSpotId,
      route_id: alert.routeId,
      on_saved_route: alert.onSavedRoute,
    });
    if (error) throw new Error(error.message);
  }

  async setSubscribedSpots(spotIds: string[]): Promise<void> {
    const db = supabase();
    const userId = (await db.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Not signed in.');

    await db.from('spot_subscriptions').delete().eq('user_id', userId);
    if (spotIds.length > 0) {
      const { error } = await db
        .from('spot_subscriptions')
        .insert(spotIds.map((spot_id) => ({ user_id: userId, spot_id })));
      if (error) throw new Error(error.message);
    }
  }

  async upsertProfile(profile: UserProfile): Promise<void> {
    const { error } = await supabase().from('profiles').upsert(fromProfile(profile));
    if (error) throw new Error(error.message);
  }

  /**
   * Realtime. This is what makes the two-phone demo work: one device
   * verifies a report and the other sees the pin turn red without a refresh.
   */
  subscribe(onChange: () => void): () => void {
    const db = supabase();
    this.channel = db
      .channel('bantay-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'report_votes' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safe_spots' }, onChange)
      .subscribe();

    return () => {
      if (this.channel) {
        void db.removeChannel(this.channel);
        this.channel = null;
      }
    };
  }
}

/**
 * Supabase Auth.
 *
 * The profile row is created by a database trigger on signup (see
 * the initial migration), so a user can never exist without one.
 */
class SupabaseAuth implements BantayAuth {
  readonly kind = 'supabase' as const;

  async restore(): Promise<UserProfile | null> {
    const db = supabase();
    const { data } = await db.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return null;
    return this.fetchProfile(userId);
  }

  async signUp(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult> {
    const db = supabase();
    const { data, error } = await db.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: { data: { name: input.name.trim() } },
    });
    if (error) return authFail(error.message);
    if (!data.user) {
      return authFail('Check your inbox to confirm your email, then log in.');
    }

    const profile = await this.fetchProfile(data.user.id);
    return profile
      ? authOk(profile)
      : authFail('Account created but the profile row is missing. Re-apply the migrations.');
  }

  async logIn(input: { email: string; password: string }): Promise<AuthResult> {
    const db = supabase();
    const { data, error } = await db.auth.signInWithPassword({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    if (error) return authFail(error.message);
    if (!data.user) return authFail('Log in failed.');

    const profile = await this.fetchProfile(data.user.id);
    return profile ? authOk(profile) : authFail('Profile not found for this account.');
  }

  /**
   * OAuth needs a redirect flow that only makes sense once the app has a real
   * scheme registered and a provider configured in the Supabase dashboard,
   * so it fails loudly here rather than pretending to work.
   */
  async signInWithProvider(provider: string): Promise<AuthResult> {
    return authFail(
      `${provider} sign-in needs an OAuth provider configured in your Supabase dashboard. See docs/SUPABASE.md, step 8.`,
    );
  }

  async updateProfile(profile: UserProfile): Promise<void> {
    const { error } = await supabase().from('profiles').upsert(fromProfile(profile));
    if (error) throw new Error(error.message);
  }

  async logOut(): Promise<void> {
    await supabase().auth.signOut();
  }

  private async fetchProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) return null;

    const row = data as Partial<ProfileRow>;
    // Tolerate an older schema that predates the assigned-area columns.
    return toProfile({
      ...(row as ProfileRow),
      area_center_lat: row.area_center_lat ?? DEFAULT_AREA_CENTER.lat,
      area_center_lng: row.area_center_lng ?? DEFAULT_AREA_CENTER.lng,
      area_radius_meters: row.area_radius_meters ?? DEFAULT_AREA_RADIUS_METERS,
    });
  }
}

export const createSupabaseBackend = (): BantayBackend => new SupabaseBackend();
export const createSupabaseAuth = (): BantayAuth => new SupabaseAuth();
