import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { latLng } from '../../core/geo/latLng';
import { UserProfile } from '../models/types';
import {
  AuthResult,
  BantayAuth,
  authFail,
  authOk,
} from './backend';
import {
  StoreKeys,
  StoredAccount,
  readJsonArray,
  readJsonObject,
  writeJson,
} from './localBackend';

/** Default assigned area: the Sampaloc corridor the sample data covers. */
export const DEFAULT_AREA_CENTER = latLng(14.6096, 120.9925);
export const DEFAULT_AREA_RADIUS_METERS = 3000;

export function newProfile(input: {
  id: string;
  name: string;
  email: string;
  authProvider?: string;
}): UserProfile {
  return {
    id: input.id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    // Role is chosen on the next screen; commuter is the safe default so a
    // half-finished signup can never grant verification powers.
    role: 'commuter',
    barangay: 'Sampaloc, Manila',
    reportsSubmitted: 0,
    reportsVerified: 0,
    reportsRejected: 0,
    verificationsPerformed: 0,
    authProvider: input.authProvider ?? 'email',
    joinedAt: new Date().toISOString(),
    areaCenter: DEFAULT_AREA_CENTER,
    areaRadiusMeters: DEFAULT_AREA_RADIUS_METERS,
  };
}

export const uuid = (): string => Crypto.randomUUID();

async function hash(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}::${password}`,
  );
}

/** A short delay so every auth action shows a real loading state. */
const latency = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 600));

/**
 * On-device accounts.
 *
 * Bantay ships a self-contained account store so the app is fully usable the
 * moment it is installed. Passwords are salted and SHA-256 hashed rather than
 * kept in the clear.
 *
 * This class is the seam a real provider replaces: swap the bodies of
 * `signUp`, `logIn` and `signInWithProvider` for Supabase Auth calls and
 * nothing else in the app changes.
 */
export class LocalAuth implements BantayAuth {
  readonly kind = 'local' as const;

  async restore(): Promise<UserProfile | null> {
    const session = await readJsonObject<{ userId?: string }>(StoreKeys.session);
    if (!session?.userId) return null;
    const accounts = await readJsonArray<StoredAccount>(StoreKeys.accounts);
    return accounts.find((a) => a.profile.id === session.userId)?.profile ?? null;
  }

  async signUp(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult> {
    await latency();
    const email = input.email.trim().toLowerCase();
    const accounts = await readJsonArray<StoredAccount>(StoreKeys.accounts);

    if (accounts.some((a) => a.profile.email === email)) {
      return authFail('An account with that email already exists. Try logging in instead.');
    }

    const salt = uuid();
    const profile = newProfile({ id: uuid(), name: input.name, email });
    accounts.push({
      profile,
      salt,
      passwordHash: await hash(input.password, salt),
    });

    await writeJson(StoreKeys.accounts, accounts);
    await this.startSession(profile);
    return authOk(profile);
  }

  async logIn(input: { email: string; password: string }): Promise<AuthResult> {
    await latency();
    const email = input.email.trim().toLowerCase();
    const accounts = await readJsonArray<StoredAccount>(StoreKeys.accounts);
    const account = accounts.find((a) => a.profile.email === email);

    if (!account) return authFail('No account found for that email.');
    if (account.passwordHash !== (await hash(input.password, account.salt))) {
      return authFail('Incorrect password. Please try again.');
    }

    await this.startSession(account.profile);
    return authOk(account.profile);
  }

  /**
   * Google / Facebook sign-in, wired end to end against the local store so
   * the button is a real working action rather than a dead control.
   */
  async signInWithProvider(provider: string): Promise<AuthResult> {
    await latency();
    const email = `user.${provider}@bantay.ph`;
    const accounts = await readJsonArray<StoredAccount>(StoreKeys.accounts);
    const existing = accounts.find((a) => a.profile.email === email);

    if (existing) {
      await this.startSession(existing.profile);
      return authOk(existing.profile);
    }

    const salt = uuid();
    const profile = newProfile({
      id: uuid(),
      name: provider === 'google' ? 'Google User' : 'Facebook User',
      email,
      authProvider: provider,
    });
    accounts.push({
      profile,
      salt,
      // Provider accounts have no local password; the hash can never match.
      passwordHash: await hash(uuid(), salt),
    });

    await writeJson(StoreKeys.accounts, accounts);
    await this.startSession(profile);
    return authOk(profile);
  }

  async updateProfile(profile: UserProfile): Promise<void> {
    const accounts = await readJsonArray<StoredAccount>(StoreKeys.accounts);
    const index = accounts.findIndex((a) => a.profile.id === profile.id);
    if (index < 0) return;
    accounts[index] = { ...accounts[index], profile };
    await writeJson(StoreKeys.accounts, accounts);
  }

  async logOut(): Promise<void> {
    await AsyncStorage.removeItem(StoreKeys.session);
  }

  private async startSession(profile: UserProfile): Promise<void> {
    await writeJson(StoreKeys.session, {
      userId: profile.id,
      startedAt: new Date().toISOString(),
    });
  }
}
