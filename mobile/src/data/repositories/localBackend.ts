import AsyncStorage from '@react-native-async-storage/async-storage';

import { AlertItem, HazardReport, SafeSpot, SavedRoute, UserProfile } from '../models/types';
import { seedAlerts, seedReports, seedRoutes, seedSafeSpots } from '../seed/seedData';
import { BantayBackend, Snapshot } from './backend';

/**
 * Every persisted key in one place, so nothing collides silently.
 */
export const StoreKeys = {
  prefix: 'bantay.',
  seeded: 'bantay.seeded.v1',
  onboardingSeen: 'bantay.onboarding_seen',
  session: 'bantay.session',
  accounts: 'bantay.accounts',
  reports: 'bantay.reports',
  safeSpots: 'bantay.safe_spots',
  routes: 'bantay.routes',
  alerts: 'bantay.alerts',
  subscribedSpots: 'bantay.subscribed_spots',
  language: 'bantay.language',
  pushEnabled: 'bantay.push_enabled',
  smsFallback: 'bantay.sms_fallback',
  alertRadiusKm: 'bantay.alert_radius_km',
  locationGranted: 'bantay.location_granted',
  mapLayers: 'bantay.map_layers',
  offlineMode: 'bantay.offline_mode',
} as const;

/** Reads and parses a JSON array, tolerating corrupt or absent payloads. */
export async function readJsonArray<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    // Corrupt payload: drop it rather than trapping the user on a crash loop
    // they cannot clear without reinstalling.
    return [];
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function readJsonObject<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as T) : null;
  } catch {
    return null;
  }
}

/**
 * On-device persistence.
 *
 * This is what makes Bantay fully usable the moment it is installed, with no
 * backend to stand up and no API key to configure. Every feature is real
 * against it; the only thing it cannot do is share data between devices.
 */
export class LocalBackend implements BantayBackend {
  readonly kind = 'local' as const;

  async seedIfEmpty(): Promise<void> {
    const seeded = await AsyncStorage.getItem(StoreKeys.seeded);
    if (seeded === 'true') return;
    await this.writeSeed();
    await AsyncStorage.setItem(StoreKeys.seeded, 'true');
  }

  async resetToSeed(): Promise<void> {
    await this.writeSeed();
    await writeJson(StoreKeys.subscribedSpots, []);
  }

  private async writeSeed(): Promise<void> {
    const now = new Date();
    await writeJson(StoreKeys.reports, seedReports(now));
    await writeJson(StoreKeys.safeSpots, seedSafeSpots(now));
    await writeJson(StoreKeys.routes, seedRoutes(now));
    await writeJson(StoreKeys.alerts, seedAlerts(now));
  }

  async loadAll(): Promise<Snapshot> {
    const [reports, safeSpots, routes, alerts, subscribedSpotIds] = await Promise.all([
      readJsonArray<HazardReport>(StoreKeys.reports),
      readJsonArray<SafeSpot>(StoreKeys.safeSpots),
      readJsonArray<SavedRoute>(StoreKeys.routes),
      readJsonArray<AlertItem>(StoreKeys.alerts),
      readJsonArray<string>(StoreKeys.subscribedSpots),
    ]);
    return { reports, safeSpots, routes, alerts, subscribedSpotIds };
  }

  async upsertReport(report: HazardReport): Promise<void> {
    const reports = await readJsonArray<HazardReport>(StoreKeys.reports);
    const index = reports.findIndex((r) => r.id === report.id);
    if (index >= 0) reports[index] = report;
    else reports.push(report);
    await writeJson(StoreKeys.reports, reports);
  }

  async upsertRoute(route: SavedRoute): Promise<void> {
    const routes = await readJsonArray<SavedRoute>(StoreKeys.routes);
    const index = routes.findIndex((r) => r.id === route.id);
    if (index >= 0) routes[index] = route;
    else routes.push(route);
    await writeJson(StoreKeys.routes, routes);
  }

  async removeRoute(routeId: string): Promise<void> {
    const routes = await readJsonArray<SavedRoute>(StoreKeys.routes);
    await writeJson(
      StoreKeys.routes,
      routes.filter((r) => r.id !== routeId),
    );
  }

  async replaceAlerts(alerts: AlertItem[]): Promise<void> {
    await writeJson(StoreKeys.alerts, alerts);
  }

  async addAlert(alert: AlertItem): Promise<void> {
    const alerts = await readJsonArray<AlertItem>(StoreKeys.alerts);
    await writeJson(StoreKeys.alerts, [alert, ...alerts]);
  }

  async setSubscribedSpots(spotIds: string[]): Promise<void> {
    await writeJson(StoreKeys.subscribedSpots, spotIds);
  }

  async upsertProfile(profile: UserProfile): Promise<void> {
    const accounts = await readJsonArray<StoredAccount>(StoreKeys.accounts);
    const index = accounts.findIndex((a) => a.profile.id === profile.id);
    if (index >= 0) {
      accounts[index] = { ...accounts[index], profile };
      await writeJson(StoreKeys.accounts, accounts);
    }
  }
}

/** An account row in the local store: profile plus salted password hash. */
export interface StoredAccount {
  profile: UserProfile;
  salt: string;
  passwordHash: string;
}
