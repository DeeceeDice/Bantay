import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { LatLng } from '../core/geo/latLng';
import { Language, Translate, translator } from '../core/i18n/strings';
import { MapLayer, RejectReason, SelfServiceRole } from '../data/models/enums';
import {
  AlertItem,
  HazardReport,
  SafeSpot,
  SavedRoute,
  UserProfile,
} from '../data/models/types';
import { uuid } from '../core/utils/uuid';
import {
  AccessRequestInput,
  BantayAuth,
  BantayBackend,
  Snapshot,
  emptySnapshot,
} from '../data/repositories/backend';
import { applyFlag, applyVote, routeContaining } from '../data/repositories/logic';
import { StoreKeys } from '../data/repositories/storeKeys';
import { createSupabaseAuth, createSupabaseBackend } from '../data/repositories/supabaseBackend';

/*
 * Only settings that change something. There is no push-notification or SMS
 * delivery behind Bantay, so there are no switches pretending to control
 * them: alerts arrive in the app, live, while it is open.
 */
export interface Settings {
  language: Language;
  alertRadiusKm: number;
  locationGranted: boolean;
  layers: MapLayer[];
}

const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  alertRadiusKm: 2,
  locationGranted: false,
  layers: ['verified_hazards', 'pending_reports', 'safe_spots'],
};

export interface AppState {
  ready: boolean;
  user: UserProfile | null;
  data: Snapshot;
  settings: Settings;
  s: Translate;
}

export interface AppActions {
  // Auth
  /**
   * `error` is null on success. `confirmEmail` means the account was created
   * but must be confirmed from the inbox before it can log in; `error` then
   * holds the message to show.
   */
  signUp(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ error: string | null; confirmEmail: boolean }>;
  logIn(input: { email: string; password: string }): Promise<string | null>;
  /** Commuter or business owner: yours to choose. */
  selectRole(role: SelfServiceRole): Promise<void>;
  /**
   * Official roles are requested, not chosen. The request is stored in the
   * database and decided by a super admin in Bantay Admin; approval changes
   * the role of this same account.
   */
  requestAccess(input: AccessRequestInput): Promise<void>;
  /** The area whose broadcasts and verified-hazard alerts you receive. */
  setHomeZone(zoneId: string | null): Promise<void>;
  logOut(): Promise<void>;

  // Reports
  submitReport(input: {
    type: HazardReport['type'];
    severity: HazardReport['severity'];
    location: LatLng;
    addressLabel: string;
    description: string;
    photoUri: string | null;
  }): Promise<HazardReport>;
  voteOnReport(reportId: string, confirms: boolean): Promise<void>;
  flagReport(reportId: string): Promise<void>;
  verifyReport(reportId: string): Promise<void>;
  rejectReport(reportId: string, reason: RejectReason, note: string): Promise<void>;

  // Routes
  addRoute(input: {
    label: string;
    start: LatLng;
    startLabel: string;
    end: LatLng;
    endLabel: string;
  }): Promise<SavedRoute>;
  deleteRoute(routeId: string): Promise<void>;
  restoreRoute(route: SavedRoute): Promise<void>;

  // Alerts and subscriptions
  markAlertRead(alertId: string): Promise<void>;
  markAllAlertsRead(): Promise<void>;
  toggleSubscription(spotId: string): Promise<void>;

  // Settings
  updateSettings(patch: Partial<Settings>): Promise<void>;
  toggleLayer(layer: MapLayer): Promise<void>;
  setVerifiedOnly(value: boolean): Promise<void>;

  refresh(): Promise<void>;
}

const SUSPENDED_MESSAGE =
  'Your account is suspended. You can still see the map, but you cannot report, confirm or flag hazards until a super admin reinstates it.';

const AppContext = createContext<(AppState & AppActions) | null>(null);

/**
 * The single source of domain truth for the whole app.
 *
 * Every screen reads from here, so a report submitted in the report flow is
 * immediately visible on the map, in the verification panel, in the alerts
 * feed and in the profile stats without any manual plumbing. All mutations
 * persist through the backend before the new state is published.
 */
export function AppProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  // Lazy state, not a ref: these are created once and read during render, so
  // a ref would be a read-during-render antipattern. There is one backend -
  // Supabase - and no on-device fallback: an account that is not in the
  // database does not exist.
  const [backend] = useState<BantayBackend>(createSupabaseBackend);
  const [auth] = useState<BantayAuth>(createSupabaseAuth);

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [data, setData] = useState<Snapshot>(emptySnapshot());
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  /**
   * The profile is re-read rather than updated in place: its role, zone,
   * status and statistics are written by the database (a review, an approval,
   * a suspension), often from the admin console, so the server's copy is the
   * only true one.
   */
  const refreshUser = useCallback(async () => {
    const fresh = await auth.restore().catch(() => null);
    if (fresh) setUser(fresh);
  }, [auth]);

  const reload = useCallback(async () => {
    setData(await backend.loadAll());
    await refreshUser();
  }, [backend, refreshUser]);

  /**
   * What a user can see depends on who they are - on Supabase, Row Level
   * Security returns nothing to a signed-out client and only your own routes
   * and alerts to a signed-in one - so data is fetched again whenever the
   * signed-in user changes. A failed fetch leaves the previous data in place
   * rather than failing the sign-in that triggered it.
   */
  const reloadForUser = useCallback(async () => {
    try {
      await reload();
    } catch {
      // The next realtime event or pull-to-refresh will try again.
    }
  }, [reload]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [snapshot, restored, loadedSettings] = await Promise.all([
        // An unreachable backend must not strand the app on the splash
        // screen: start empty and let the user reach the log-in screen.
        backend.loadAll().catch(() => emptySnapshot()),
        auth.restore().catch(() => null),
        loadSettings(),
      ]);
      if (cancelled) return;
      setData(snapshot);
      setUser(restored);
      setSettings(loadedSettings);
      setReady(true);
    })();

    // Realtime pushes other devices' changes straight in.
    const unsubscribe = backend.subscribe(() => {
      void reload();
    });

    // A session that ends on its own - revoked, expired, account deleted -
    // signs the app out too, which the route guard turns into the log-in
    // screen. Otherwise every screen would keep showing a user whose writes
    // the database then refuses.
    const stopWatchingSession = auth.onSignedOut(() => {
      setUser(null);
      setData((prev) => ({ ...emptySnapshot(), reports: prev.reports, safeSpots: prev.safeSpots }));
    });

    return () => {
      cancelled = true;
      unsubscribe();
      stopWatchingSession();
    };
  }, [backend, auth, reload]);

  const pushAlert = useCallback(
    async (alert: AlertItem) => {
      await backend.addAlert(alert);
      setData((prev) => ({ ...prev, alerts: [alert, ...prev.alerts] }));
    },
    [backend],
  );

  const replaceReport = useCallback(
    async (next: HazardReport) => {
      await backend.upsertReport(next);
      setData((prev) => ({
        ...prev,
        reports: prev.reports.map((r) => (r.id === next.id ? next : r)),
      }));
    },
    [backend],
  );

  // --- Auth -------------------------------------------------------------

  const signUp: AppActions['signUp'] = useCallback(
    async (input) => {
      const result = await auth.signUp(input);
      if (!result.ok || !result.profile) {
        return {
          error: result.error ?? 'Sign up failed.',
          confirmEmail: result.needsEmailConfirmation,
        };
      }
      setUser(result.profile);
      await reloadForUser();
      return { error: null, confirmEmail: false };
    },
    [auth, reloadForUser],
  );

  const logIn: AppActions['logIn'] = useCallback(
    async (input) => {
      const result = await auth.logIn(input);
      if (!result.ok || !result.profile) return result.error ?? 'Log in failed.';
      setUser(result.profile);
      await reloadForUser();
      return null;
    },
    [auth, reloadForUser],
  );

  const selectRole: AppActions['selectRole'] = useCallback(
    async (role) => {
      if (!user) throw new Error('Log in first.');
      await backend.updateOwnProfile(user.id, { role });
      setUser({ ...user, role });
    },
    [backend, user],
  );

  const requestAccess: AppActions['requestAccess'] = useCallback(
    async (input) => {
      if (!user) throw new Error('Log in first.');
      await backend.submitAccessRequest(user.id, input);
      await reloadForUser();
    },
    [backend, user, reloadForUser],
  );

  const setHomeZone: AppActions['setHomeZone'] = useCallback(
    async (zoneId) => {
      if (!user) throw new Error('Log in first.');
      await backend.updateOwnProfile(user.id, { homeZoneId: zoneId });
      setUser({ ...user, homeZoneId: zoneId });
    },
    [backend, user],
  );

  const logOut: AppActions['logOut'] = useCallback(async () => {
    await auth.logOut();
    setUser(null);
    // Drop the previous user's routes, alerts and subscriptions before the
    // next person signs in on this phone, rather than showing them until the
    // reload lands.
    setData((prev) => ({ ...emptySnapshot(), reports: prev.reports, safeSpots: prev.safeSpots }));
    await reloadForUser();
  }, [auth, reloadForUser]);

  // --- Reports ----------------------------------------------------------

  const submitReport: AppActions['submitReport'] = useCallback(
    async (input) => {
      // Every report is filed by a real account. The insert policy requires
      // reporter_id to be the caller's own id, so an anonymous report would be
      // refused by the database anyway - this just says so before trying.
      if (!user) throw new Error('Log in to report a hazard.');
      if (user.status === 'suspended') throw new Error(SUSPENDED_MESSAGE);

      const report: HazardReport = {
        id: uuid(),
        type: input.type,
        severity: input.severity,
        status: 'pending',
        location: input.location,
        addressLabel: input.addressLabel,
        reportedAt: new Date().toISOString(),
        reporterId: user.id,
        reporterName: user.name,
        description: input.description,
        photoUri: input.photoUri,
        confirmCount: 0,
        denyCount: 0,
        flagCount: 0,
        verifiedBy: null,
        verifiedAt: null,
        rejectReason: null,
        rejectNote: null,
        votedUserIds: [],
        flaggedUserIds: [],
      };

      await backend.upsertReport(report);
      setData((prev) => ({ ...prev, reports: [...prev.reports, report] }));
      // The database counted it; show its count.
      await refreshUser();

      // A hazard on a saved route is worth flagging right away, even before
      // it is verified.
      const route = routeContaining(data.routes, input.location);
      if (route) {
        await pushAlert({
          id: uuid(),
          kind: 'route_status',
          title: `New report on "${route.label}"`,
          body: `A hazard was reported near ${input.addressLabel}, on your saved route. It is pending verification.`,
          createdAt: new Date().toISOString(),
          isRead: false,
          reportId: report.id,
          safeSpotId: null,
          routeId: route.id,
          onSavedRoute: true,
        });
      }

      return report;
    },
    [backend, user, refreshUser, data.routes, pushAlert],
  );

  const voteOnReport: AppActions['voteOnReport'] = useCallback(
    async (reportId, confirms) => {
      const current = data.reports.find((r) => r.id === reportId);
      if (!current || !user) return;
      if (user.status === 'suspended') throw new Error(SUSPENDED_MESSAGE);
      const next = applyVote(current, user.id, confirms);
      if (!next) return;
      await replaceReport(next);
    },
    [data.reports, user, replaceReport],
  );

  const flagReport: AppActions['flagReport'] = useCallback(
    async (reportId) => {
      const current = data.reports.find((r) => r.id === reportId);
      if (!current || !user) return;
      if (user.status === 'suspended') throw new Error(SUSPENDED_MESSAGE);
      const next = applyFlag(current, user.id);
      if (!next) return;
      await replaceReport(next);
    },
    [data.reports, user, replaceReport],
  );

  /*
   * Reviews. The app sends only the outcome (and, for a rejection, the
   * reason). The database checks the report is inside this official's zone,
   * records who reviewed it and when, alerts the reporter, updates both
   * people's statistics and writes the audit log - the same way whether the
   * review came from here or from Bantay Admin. Doing any of that here too
   * would double it, or be refused: the reporter's alerts are not ours to
   * write.
   */
  const verifyReport: AppActions['verifyReport'] = useCallback(
    async (reportId) => {
      if (!user) throw new Error('Log in to verify reports.');
      const current = data.reports.find((r) => r.id === reportId);
      if (!current) return;

      await replaceReport({ ...current, status: 'verified', rejectReason: null, rejectNote: null });
      await reloadForUser();
    },
    [data.reports, user, replaceReport, reloadForUser],
  );

  const rejectReport: AppActions['rejectReport'] = useCallback(
    async (reportId, reason, note) => {
      if (!user) throw new Error('Log in to review reports.');
      const current = data.reports.find((r) => r.id === reportId);
      if (!current) return;

      await replaceReport({
        ...current,
        status: 'rejected',
        rejectReason: reason,
        rejectNote: note.trim() || null,
      });
      await reloadForUser();
    },
    [data.reports, user, replaceReport, reloadForUser],
  );

  // --- Routes -----------------------------------------------------------

  const addRoute: AppActions['addRoute'] = useCallback(
    async (input) => {
      const route: SavedRoute = {
        id: uuid(),
        label: input.label,
        startLabel: input.startLabel,
        endLabel: input.endLabel,
        start: input.start,
        end: input.end,
        // A single midpoint keeps the preview line from cutting a perfect
        // diagonal through blocks it would never actually follow.
        waypoints: [
          {
            lat: (input.start.lat + input.end.lat) / 2,
            lng: (input.start.lng + input.end.lng) / 2,
          },
        ],
        createdAt: new Date().toISOString(),
      };
      await backend.upsertRoute(route);
      setData((prev) => ({ ...prev, routes: [...prev.routes, route] }));
      return route;
    },
    [backend],
  );

  const deleteRoute: AppActions['deleteRoute'] = useCallback(
    async (routeId) => {
      await backend.removeRoute(routeId);
      setData((prev) => ({ ...prev, routes: prev.routes.filter((r) => r.id !== routeId) }));
    },
    [backend],
  );

  const restoreRoute: AppActions['restoreRoute'] = useCallback(
    async (route) => {
      await backend.upsertRoute(route);
      setData((prev) => ({ ...prev, routes: [...prev.routes, route] }));
    },
    [backend],
  );

  // --- Alerts and subscriptions ----------------------------------------

  const markAlertRead: AppActions['markAlertRead'] = useCallback(
    async (alertId) => {
      const next = data.alerts.map((a) => (a.id === alertId ? { ...a, isRead: true } : a));
      await backend.replaceAlerts(next);
      setData((prev) => ({ ...prev, alerts: next }));
    },
    [backend, data.alerts],
  );

  const markAllAlertsRead: AppActions['markAllAlertsRead'] = useCallback(async () => {
    const next = data.alerts.map((a) => ({ ...a, isRead: true }));
    await backend.replaceAlerts(next);
    setData((prev) => ({ ...prev, alerts: next }));
  }, [backend, data.alerts]);

  const toggleSubscription: AppActions['toggleSubscription'] = useCallback(
    async (spotId) => {
      const has = data.subscribedSpotIds.includes(spotId);
      const next = has
        ? data.subscribedSpotIds.filter((id) => id !== spotId)
        : [...data.subscribedSpotIds, spotId];
      await backend.setSubscribedSpots(next);
      setData((prev) => ({ ...prev, subscribedSpotIds: next }));
    },
    [backend, data.subscribedSpotIds],
  );

  // --- Settings ---------------------------------------------------------

  const updateSettings: AppActions['updateSettings'] = useCallback(
    async (patch) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        void saveSettings(next);
        return next;
      });
    },
    [],
  );

  const toggleLayer: AppActions['toggleLayer'] = useCallback(
    async (layer) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          layers: prev.layers.includes(layer)
            ? prev.layers.filter((l) => l !== layer)
            : [...prev.layers, layer],
        };
        void saveSettings(next);
        return next;
      });
    },
    [],
  );

  /** Backs the "Show verified only" switch, the inverse of the pending layer. */
  const setVerifiedOnly: AppActions['setVerifiedOnly'] = useCallback(
    async (value) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          layers: value
            ? prev.layers.filter((l) => l !== 'pending_reports')
            : Array.from(new Set<MapLayer>([...prev.layers, 'pending_reports'])),
        };
        void saveSettings(next);
        return next;
      });
    },
    [],
  );

  const value = useMemo<AppState & AppActions>(
    () => ({
      ready,
      user,
      data,
      settings,
      s: translator(settings.language),
      signUp,
      logIn,
      selectRole,
      requestAccess,
      setHomeZone,
      logOut,
      submitReport,
      voteOnReport,
      flagReport,
      verifyReport,
      rejectReport,
      addRoute,
      deleteRoute,
      restoreRoute,
      markAlertRead,
      markAllAlertsRead,
      toggleSubscription,
      updateSettings,
      toggleLayer,
      setVerifiedOnly,
      refresh: reload,
    }),
    [
      ready, user, data, settings, signUp, logIn, selectRole, requestAccess, setHomeZone, logOut,
      submitReport, voteOnReport, flagReport, verifyReport, rejectReport,
      addRoute, deleteRoute, restoreRoute, markAlertRead, markAllAlertsRead,
      toggleSubscription, updateSettings, toggleLayer, setVerifiedOnly, reload,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState & AppActions {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// --- Settings persistence ------------------------------------------------

async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(StoreKeys.settings);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    // Keep only settings that still exist, so switches removed in an update
    // do not linger in storage.
    return {
      language: parsed.language ?? DEFAULT_SETTINGS.language,
      alertRadiusKm: parsed.alertRadiusKm ?? DEFAULT_SETTINGS.alertRadiusKm,
      locationGranted: parsed.locationGranted ?? DEFAULT_SETTINGS.locationGranted,
      layers: parsed.layers ?? DEFAULT_SETTINGS.layers,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(StoreKeys.settings, JSON.stringify(settings));
  } catch {
    // A failed settings write is not worth interrupting the user over.
  }
}

export { type SafeSpot, type AlertItem };
