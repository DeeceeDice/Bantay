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
import { MapLayer } from '../data/models/enums';
import {
  AlertItem,
  HazardReport,
  SafeSpot,
  SavedRoute,
  UserProfile,
} from '../data/models/types';
import { BantayAuth, BantayBackend, Snapshot, emptySnapshot } from '../data/repositories/backend';
import { LocalAuth, uuid } from '../data/repositories/localAuth';
import { LocalBackend, StoreKeys } from '../data/repositories/localBackend';
import {
  applyFlag,
  applyVote,
  hazardTitle,
  isOnAnySavedRoute,
  routeContaining,
} from '../data/repositories/logic';
import { createSupabaseAuth, createSupabaseBackend, isSupabaseConfigured } from '../data/repositories/supabaseBackend';

export interface Settings {
  language: Language;
  pushEnabled: boolean;
  smsFallbackEnabled: boolean;
  alertRadiusKm: number;
  locationGranted: boolean;
  offlineMode: boolean;
  layers: MapLayer[];
}

const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  pushEnabled: true,
  smsFallbackEnabled: true,
  alertRadiusKm: 2,
  locationGranted: false,
  offlineMode: false,
  layers: ['verified_hazards', 'pending_reports', 'safe_spots'],
};

export interface AppState {
  ready: boolean;
  backendKind: 'local' | 'supabase';
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
  signInWithProvider(provider: string): Promise<string | null>;
  selectRole(role: UserProfile['role']): Promise<void>;
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
  rejectReport(reportId: string): Promise<void>;

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

  resetSampleData(): Promise<void>;
  refresh(): Promise<void>;
}

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
  // a ref would be a read-during-render antipattern.
  const [backend] = useState<BantayBackend>(() =>
    isSupabaseConfigured() ? createSupabaseBackend() : new LocalBackend(),
  );
  const [auth] = useState<BantayAuth>(() =>
    isSupabaseConfigured() ? createSupabaseAuth() : new LocalAuth(),
  );

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [data, setData] = useState<Snapshot>(emptySnapshot());
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const reload = useCallback(async () => {
    setData(await backend.loadAll());
  }, [backend]);

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
      await backend.seedIfEmpty().catch(() => undefined);
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

    // A backend with realtime pushes other devices' changes straight in.
    const unsubscribe = backend.subscribe?.(() => {
      void reload();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [backend, auth, reload]);

  const persistUser = useCallback(
    async (next: UserProfile) => {
      await auth.updateProfile(next);
      await backend.upsertProfile(next);
      setUser(next);
    },
    [auth, backend],
  );

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

  const signInWithProvider: AppActions['signInWithProvider'] = useCallback(
    async (provider) => {
      const result = await auth.signInWithProvider(provider);
      if (!result.ok || !result.profile) return result.error ?? 'Sign in failed.';
      setUser(result.profile);
      await reloadForUser();
      return null;
    },
    [auth, reloadForUser],
  );

  const selectRole: AppActions['selectRole'] = useCallback(
    async (role) => {
      if (!user) return;
      await persistUser({ ...user, role });
    },
    [user, persistUser],
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
      const report: HazardReport = {
        id: uuid(),
        type: input.type,
        severity: input.severity,
        status: 'pending',
        location: input.location,
        addressLabel: input.addressLabel,
        reportedAt: new Date().toISOString(),
        reporterId: user?.id ?? 'anonymous',
        reporterName: user?.name ?? 'Anonymous',
        description: input.description,
        photoUri: input.photoUri,
        confirmCount: 0,
        denyCount: 0,
        flagCount: 0,
        verifiedBy: null,
        verifiedAt: null,
        votedUserIds: [],
        flaggedUserIds: [],
      };

      await backend.upsertReport(report);
      setData((prev) => ({ ...prev, reports: [...prev.reports, report] }));

      if (user) {
        await persistUser({ ...user, reportsSubmitted: user.reportsSubmitted + 1 });
      }

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
    [backend, user, persistUser, data.routes, pushAlert],
  );

  const voteOnReport: AppActions['voteOnReport'] = useCallback(
    async (reportId, confirms) => {
      const current = data.reports.find((r) => r.id === reportId);
      if (!current || !user) return;
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
      const next = applyFlag(current, user.id);
      if (!next) return;
      await replaceReport(next);
    },
    [data.reports, user, replaceReport],
  );

  const verifyReport: AppActions['verifyReport'] = useCallback(
    async (reportId) => {
      const current = data.reports.find((r) => r.id === reportId);
      if (!current) return;

      const next: HazardReport = {
        ...current,
        status: 'verified',
        verifiedBy: user ? `${user.name} - ${user.barangay}` : 'Barangay Official',
        verifiedAt: new Date().toISOString(),
      };
      await replaceReport(next);

      await pushAlert({
        id: uuid(),
        kind: 'verified_hazard',
        title: `Verified: ${hazardTitle(current.type)} at ${current.addressLabel}`,
        body: 'This hazard has been confirmed by an official and is now visible to everyone nearby.',
        createdAt: new Date().toISOString(),
        isRead: false,
        reportId: current.id,
        safeSpotId: null,
        routeId: null,
        onSavedRoute: isOnAnySavedRoute(data.routes, current.location),
      });

      // Tell the reporter, and credit the stats on both sides.
      if (user && current.reporterId === user.id) {
        await persistUser({
          ...user,
          reportsVerified: user.reportsVerified + 1,
          verificationsPerformed: user.verificationsPerformed + 1,
        });
      } else {
        if (user) {
          await persistUser({
            ...user,
            verificationsPerformed: user.verificationsPerformed + 1,
          });
        }
        await pushAlert({
          id: uuid(),
          kind: 'report_verified',
          title: 'Your report was verified',
          body: `Your report at ${current.addressLabel} was verified and is now live on the map. Thank you for keeping the community safe.`,
          createdAt: new Date().toISOString(),
          isRead: false,
          reportId: current.id,
          safeSpotId: null,
          routeId: null,
          onSavedRoute: false,
        });
      }
    },
    [data.reports, data.routes, user, replaceReport, pushAlert, persistUser],
  );

  const rejectReport: AppActions['rejectReport'] = useCallback(
    async (reportId) => {
      const current = data.reports.find((r) => r.id === reportId);
      if (!current) return;

      await replaceReport({
        ...current,
        status: 'rejected',
        verifiedBy: user ? `${user.name} - ${user.barangay}` : 'Barangay Official',
        verifiedAt: new Date().toISOString(),
      });

      if (user && current.reporterId === user.id) {
        await persistUser({
          ...user,
          reportsRejected: user.reportsRejected + 1,
          verificationsPerformed: user.verificationsPerformed + 1,
        });
      } else {
        if (user) {
          await persistUser({
            ...user,
            verificationsPerformed: user.verificationsPerformed + 1,
          });
        }
        await pushAlert({
          id: uuid(),
          kind: 'report_rejected',
          title: 'Your report was not verified',
          body: `An official reviewed your report at ${current.addressLabel} and could not confirm it. It has been removed from the map.`,
          createdAt: new Date().toISOString(),
          isRead: false,
          reportId: null,
          safeSpotId: null,
          routeId: null,
          onSavedRoute: false,
        });
      }
    },
    [data.reports, user, replaceReport, pushAlert, persistUser],
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

  const resetSampleData: AppActions['resetSampleData'] = useCallback(async () => {
    await backend.resetToSeed();
    await reload();
  }, [backend, reload]);

  const value = useMemo<AppState & AppActions>(
    () => ({
      ready,
      backendKind: backend.kind,
      user,
      data,
      settings,
      s: translator(settings.language),
      signUp,
      logIn,
      signInWithProvider,
      selectRole,
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
      resetSampleData,
      refresh: reload,
    }),
    [
      ready, backend.kind, user, data, settings, signUp, logIn, signInWithProvider,
      selectRole, logOut, submitReport, voteOnReport, flagReport, verifyReport,
      rejectReport, addRoute, deleteRoute, restoreRoute, markAlertRead,
      markAllAlertsRead, toggleSubscription, updateSettings, toggleLayer,
      setVerifiedOnly, resetSampleData, reload,
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
    const raw = await AsyncStorage.getItem('bantay.settings');
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem('bantay.settings', JSON.stringify(settings));
  } catch {
    // A failed settings write is not worth interrupting the user over.
  }
}

export { StoreKeys, type SafeSpot, type AlertItem };
