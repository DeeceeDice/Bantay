import { AuthError, RealtimeChannel, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

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
  authConfirmEmail,
  authFail,
  authOk,
} from './backend';
import { DEFAULT_AREA_CENTER, DEFAULT_AREA_RADIUS_METERS, newProfile } from './profiles';
import { supabase } from './supabaseClient';

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

/** Postgres' unique-violation code: the row is already there. */
const UNIQUE_VIOLATION = '23505';

/**
 * Inserts a vote or flag. A duplicate means this user already voted, which the
 * composite primary key exists to catch, so it is not an error. Upserting
 * instead would need an UPDATE policy these tables deliberately do not have.
 */
async function insertIgnoringDuplicate(
  table: ReturnType<ReturnType<typeof supabase>['from']>,
  row: Record<string, unknown>,
): Promise<void> {
  const { error } = await table.insert(row);
  if (error && error.code !== UNIQUE_VIOLATION) throw new Error(error.message);
}

/**
 * Supabase-backed storage.
 *
 * Reports, safe spots and votes are shared across every device; routes,
 * alerts and subscriptions are scoped to the signed-in user by Row Level
 * Security, so the policies in the initial migration are what actually
 * enforce privacy - not this class.
 */
class SupabaseBackend implements BantayBackend {
  private channel: RealtimeChannel | null = null;

  /*
   * There is no seeding or "reset sample data" here. Shared rows are written
   * once, server-side, by supabase/seed.sql - never by a client, where it
   * would race between devices and the read-only safe_spots policy would
   * refuse it anyway. Supabase runs seed.sql only for local development and
   * preview branches, so production is seeded by hand. See docs/SUPABASE.md.
   */

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

  /**
   * Stores a report change. The store hands over the whole report, but under
   * Row Level Security only some of it is this user's to write, so the change
   * is split by what actually moved:
   *
   * - a report that does not exist yet is inserted (as its reporter);
   * - a change of status is a verification, written only by an official;
   * - a new vote or flag goes into its own table, never the report row.
   *
   * Writing the whole row every time, as an upsert, turned every vote by a
   * commuter into an UPDATE on `reports`, which the verifier-only policy
   * rejects - so voting failed for everyone who could not verify.
   */
  async upsertReport(report: HazardReport): Promise<void> {
    const db = supabase();
    const userId = (await db.auth.getUser()).data.user?.id;

    const existing = await db
      .from('reports')
      .select('status, verified_by')
      .eq('id', report.id)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);

    if (!existing.data) {
      const { error } = await db.from('reports').insert(fromReport(report));
      if (error) throw new Error(error.message);
      return;
    }

    const row = existing.data as Pick<ReportRow, 'status' | 'verified_by'>;
    if (row.status !== report.status || row.verified_by !== report.verifiedBy) {
      const { data, error } = await db
        .from('reports')
        .update({
          status: report.status,
          verified_by: report.verifiedBy,
          verified_at: report.verifiedAt,
        })
        .eq('id', report.id)
        .select('id');
      if (error) throw new Error(error.message);
      // An update that RLS filters out is not an error, just zero rows. Left
      // unchecked, the verification would appear to work and never happen.
      if (!data || data.length === 0) {
        throw new Error('Only barangay officials and school admins can verify reports.');
      }
    }

    if (!userId) return;

    if (report.votedUserIds.includes(userId)) {
      const votes = await db
        .from('report_votes')
        .select('user_id, confirms')
        .eq('report_id', report.id);
      if (votes.error) throw new Error(votes.error.message);
      const rows = (votes.data ?? []) as Pick<VoteRow, 'user_id' | 'confirms'>[];

      if (!rows.some((v) => v.user_id === userId)) {
        // The report carries counts, not who voted which way. The store adds
        // exactly one vote on top of what was stored, so if its confirm count
        // is ahead of the database's, this user's vote was a confirmation.
        const storedConfirms = rows.filter((v) => v.confirms).length;
        await insertIgnoringDuplicate(db.from('report_votes'), {
          report_id: report.id,
          user_id: userId,
          confirms: report.confirmCount > storedConfirms,
        });
      }
    }

    if (report.flaggedUserIds.includes(userId)) {
      await insertIgnoringDuplicate(db.from('report_flags'), {
        report_id: report.id,
        user_id: userId,
      });
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
 * Turns Supabase Auth's error codes into something a person can act on. The
 * raw messages ("Email address not authorized", "Invalid login credentials")
 * are written for developers.
 */
function authMessage(error: AuthError, email: string): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Incorrect email or password. Please try again.';
    case 'email_not_confirmed':
      return `Confirm your email first: open the link we sent to ${email}, then log in.`;
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with that email already exists. Try logging in instead.';
    case 'weak_password':
      return 'That password is too weak. Use at least 8 characters.';
    case 'signup_disabled':
      return 'New sign-ups are turned off for this project.';
    case 'email_address_not_authorized':
    case 'over_email_send_rate_limit':
      // Both come from Supabase's built-in mailer, which only delivers to the
      // project's own team and only a couple of times an hour.
      return 'The confirmation email could not be sent. Ask the project owner to turn off "Confirm email" or set up SMTP - see docs/SUPABASE.md.';
    default:
      return error.message;
  }
}

/**
 * Supabase Auth.
 *
 * The profile row is created by a database trigger on signup (see the initial
 * migration). An account made before that trigger existed has no row, so
 * every sign-in path goes through `ensureProfile`, which creates the missing
 * row rather than locking the person out of an account that is otherwise
 * fine.
 */
class SupabaseAuth implements BantayAuth {
  async restore(): Promise<UserProfile | null> {
    const db = supabase();
    const { data } = await db.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    try {
      return await this.ensureProfile(user);
    } catch {
      // Offline or the project is unreachable: show the log-in screen rather
      // than hanging on the splash.
      return null;
    }
  }

  async signUp(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult> {
    const db = supabase();
    const email = input.email.trim().toLowerCase();
    const { data, error } = await db.auth.signUp({
      email,
      password: input.password,
      options: {
        data: { name: input.name.trim() },
        // Where the confirmation link sends people. Supabase ignores it and
        // falls back to the Site URL unless it is on the redirect allow-list.
        emailRedirectTo: Linking.createURL('/login'),
      },
    });
    if (error) return authFail(authMessage(error, email));
    if (!data.user) return authFail('Sign up failed.');

    // With "Confirm email" on, signing up an address that is already
    // registered does not error - Supabase returns a stand-in user with no
    // identities, so the response cannot be used to discover who has an
    // account. Say so plainly rather than asking them to confirm again.
    if (data.user.identities?.length === 0) {
      return authFail('An account with that email already exists. Try logging in instead.');
    }

    // No session means the project requires email confirmation. The account
    // exists; it just cannot sign in yet, and until it can, every read is
    // anonymous and Row Level Security hides the profile row.
    if (!data.session) {
      return authConfirmEmail(
        `We sent a confirmation link to ${email}. Open it, then log in.`,
      );
    }

    try {
      return authOk(await this.ensureProfile(data.user, input.name));
    } catch (e) {
      return authFail(e instanceof Error ? e.message : 'Could not load your profile.');
    }
  }

  async logIn(input: { email: string; password: string }): Promise<AuthResult> {
    const db = supabase();
    const email = input.email.trim().toLowerCase();
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password: input.password,
    });
    if (error) return authFail(authMessage(error, email));
    if (!data.user) return authFail('Log in failed.');

    try {
      return authOk(await this.ensureProfile(data.user));
    } catch (e) {
      return authFail(e instanceof Error ? e.message : 'Could not load your profile.');
    }
  }

  async updateProfile(profile: UserProfile): Promise<void> {
    const { error } = await supabase().from('profiles').upsert(fromProfile(profile));
    if (error) throw new Error(error.message);
  }

  async logOut(): Promise<void> {
    // `local` ends this device's session only. Signing out every device is
    // not what a phone's log-out button means, and it also needs the network,
    // so a person offline could not log out at all.
    await supabase().auth.signOut({ scope: 'local' });
  }

  /**
   * A session can end without anyone pressing "log out": the refresh token is
   * revoked, expires, or the account is deleted. Without this the app would
   * keep showing a signed-in screen whose every write Row Level Security then
   * refuses.
   */
  onSignedOut(callback: () => void): () => void {
    const { data } = supabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') callback();
    });
    return () => data.subscription.unsubscribe();
  }

  /** The signed-in user's profile, creating the row if it is missing. */
  private async ensureProfile(user: User, name?: string): Promise<UserProfile> {
    const existing = await this.fetchProfile(user.id);
    if (existing) return existing;

    const email = user.email ?? '';
    const metaName = (user.user_metadata as { name?: unknown } | null)?.name;
    const profile = newProfile({
      id: user.id,
      name:
        name?.trim() ||
        (typeof metaName === 'string' && metaName.trim()) ||
        email.split('@')[0] ||
        'Bantay user',
      email,
    });
    // ON CONFLICT DO NOTHING: if the trigger won a race and the row now
    // exists, it is left alone and the trigger's row is what gets read back.
    const { error } = await supabase()
      .from('profiles')
      .upsert(fromProfile(profile), { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error(`Could not create your profile: ${error.message}`);

    return (await this.fetchProfile(user.id)) ?? profile;
  }

  private async fetchProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw new Error(`Could not load your profile: ${error.message}`);
    if (!data) return null;

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
