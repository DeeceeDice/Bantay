import { FunctionsHttpError } from '@supabase/supabase-js';

import { Geo, LatLng, latLng } from '../../core/geo/latLng';
import { severityRank } from '../models/enums';
import { Barangay, HazardReport } from '../models/types';
import { ROUTE_HAZARD_THRESHOLD_METERS } from '../repositories/logic';
import { isSupabaseConfigured, supabase } from '../repositories/supabaseClient';

/**
 * Place search and street routing, for the two things Bantay cannot do well
 * alone: finding a place by name, and following real streets from A to B.
 *
 * Both go through Bantay's `geo` Edge Function (supabase/functions/geo),
 * which asks free OpenStreetMap services - Photon for places, OSRM for
 * routes. That keeps every key out of the app and the public website, keeps
 * the results lawful to draw on Bantay's own OpenStreetMap map, and lets the
 * database cap the monthly volume. The function needs a signed-in account,
 * which every screen that searches or routes already has.
 */

export const isOnlineGeoAvailable = (): boolean => isSupabaseConfigured();

/** The function refused for now: per-minute or monthly limit, or not signed in. */
export class GeoBusy extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeoBusy';
  }
}

async function invokeGeo<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const { data, error } = await supabase().functions.invoke<T>('geo', { body, signal });
  if (!error) return data as T;
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    const detail = (await res.json().catch(() => null)) as { message?: string } | null;
    const message = detail?.message ?? `Map search failed (${res.status}).`;
    if (res.status === 429 || res.status === 401) throw new GeoBusy(message);
    throw new Error(message);
  }
  throw new Error(error.message);
}

/**
 * Answers already fetched are kept for the rest of the session, so asking
 * again (the same search, re-opening the same directions) costs nothing.
 */
const CACHE_SIZE = 100;
const placeCache = new Map<string, PlaceResult[]>();
const routeCache = new Map<string, { path: LatLng[]; distanceMeters: number; durationSeconds: number }[]>();

function remember<T>(cache: Map<string, T>, key: string, value: T): void {
  if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
}

/** For tests. */
export function clearGeoCaches(): void {
  placeCache.clear();
  routeCache.clear();
}

/** Metro Manila, so "España" means the boulevard and not the country. */
const MANILA = latLng(14.5995, 120.9842);

export interface PlaceResult {
  name: string;
  address: string;
  location: LatLng;
}

/**
 * Text search in the Philippines, biased towards where the user is (or Metro
 * Manila); pass `null` for no bias, when the query already names the town and
 * province. Throws on network or service failure so the caller can fall back.
 */
export async function searchPlacesOnline(
  query: string,
  near: LatLng | null = MANILA,
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  const cacheKey = `${query.trim().toLowerCase()}|${near ? `${near.lat.toFixed(2)},${near.lng.toFixed(2)}` : '-'}`;
  const cached = placeCache.get(cacheKey);
  if (cached) return cached;
  const body = await invokeGeo<{ places?: { name: string; address: string; lat: number; lng: number }[] }>(
    { action: 'search', query: query.trim(), near, limit: 5 },
    signal,
  );
  const results = (body?.places ?? []).map((p) => ({
    name: p.name,
    address: p.address,
    location: latLng(p.lat, p.lng),
  }));
  remember(placeCache, cacheKey, results);
  return results;
}

/**
 * Where an area - a barangay - is: the best area match for `text`, ahead of
 * streets and shops that share its name. Null when nothing matches.
 */
export async function findArea(
  text: string,
  signal?: AbortSignal,
): Promise<PlaceResult | null> {
  const cacheKey = `area|${text.trim().toLowerCase()}`;
  const cached = placeCache.get(cacheKey);
  if (cached) return cached[0] ?? null;
  const body = await invokeGeo<{ places?: { name: string; address: string; lat: number; lng: number }[] }>(
    { action: 'search', query: text.trim(), near: null, limit: 1, kind: 'area' },
    signal,
  );
  const results = (body?.places ?? []).map((p) => ({
    name: p.name,
    address: p.address,
    location: latLng(p.lat, p.lng),
  }));
  remember(placeCache, cacheKey, results);
  return results[0] ?? null;
}

/**
 * How to look up a PSGC barangay, which has a name but no coordinates, in
 * OpenStreetMap: its own name and its city - "Sauyo, Quezon City",
 * "Barangay 395, Sampaloc, City of Manila". A bare number is a Manila-style
 * numbered barangay, which OpenStreetMap names "Barangay 395".
 */
export const barangaySearchText = (b: Barangay): string =>
  [/^\d+$/.test(b.name.trim()) ? `Barangay ${b.name.trim()}` : b.name.trim(), b.city]
    .filter((part) => part.length > 0)
    .join(', ');

export type TravelMode = 'DRIVE' | 'WALK';

export interface RouteOption {
  path: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  /** Verified hazards within ROUTE_HAZARD_THRESHOLD_METERS of the path. */
  hazards: HazardReport[];
}

/**
 * Real street routes, with alternatives.
 *
 * A router cannot be told "avoid this flooded corner", so Bantay does the
 * next best honest thing: it asks for every alternative and picks the one
 * that passes the fewest (and least severe) verified hazards. If all of them
 * pass one, the hazards are shown rather than hidden.
 */
export async function computeRoutes(
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode,
  hazards: readonly HazardReport[],
  signal?: AbortSignal,
): Promise<RouteOption[]> {
  // About 10 m: moving a step does not make it a new route.
  const cacheKey = [origin.lat, origin.lng, destination.lat, destination.lng]
    .map((n) => n.toFixed(4))
    .concat(mode)
    .join('|');
  const withHazards = (
    raw: { path: LatLng[]; distanceMeters: number; durationSeconds: number }[],
  ): RouteOption[] => raw.map((r) => ({ ...r, hazards: hazardsOnPath(r.path, hazards) }));
  const cached = routeCache.get(cacheKey);
  if (cached) return withHazards(cached);

  const body = await invokeGeo<{
    routes?: { polyline: string; distanceMeters: number; durationSeconds: number }[];
  }>({ action: 'route', from: origin, to: destination, mode }, signal);
  const routes = (body?.routes ?? []).filter((r) => r.polyline);
  if (routes.length === 0) throw new Error('No route found between these points.');

  const raw = routes.map((r) => {
    const path = decodePolyline(r.polyline);
    return {
      path,
      distanceMeters: r.distanceMeters || Geo.pathLengthMeters(path),
      durationSeconds: r.durationSeconds || 0,
    };
  });
  remember(routeCache, cacheKey, raw);
  return withHazards(raw);
}

export const hazardsOnPath = (
  path: readonly LatLng[],
  hazards: readonly HazardReport[],
): HazardReport[] =>
  hazards.filter((h) => Geo.distanceToPathMeters(h.location, path) <= ROUTE_HAZARD_THRESHOLD_METERS);

/** Fewest, least severe hazards first; then the quickest. */
export function pickSafestRoute(options: readonly RouteOption[]): RouteOption {
  const risk = (o: RouteOption): number =>
    o.hazards.reduce((sum, h) => sum + 10 ** severityRank[h.severity], 0);
  return [...options].sort(
    (a, b) => risk(a) - risk(b) || a.durationSeconds - b.durationSeconds,
  )[0];
}

/**
 * Hands the trip to the Google Maps app (or website) for turn-by-turn. A
 * plain link: it uses no key and is never billed.
 */
export const googleMapsDirectionsUrl = (
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode,
): string =>
  'https://www.google.com/maps/dir/?api=1' +
  `&origin=${origin.lat},${origin.lng}` +
  `&destination=${destination.lat},${destination.lng}` +
  `&travelmode=${mode === 'WALK' ? 'walking' : 'driving'}`;

/** The encoded polyline format (precision 5) that OSRM and Google share. */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const next = (): number => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += next();
    lng += next();
    points.push(latLng(lat / 1e5, lng / 1e5));
  }
  return points;
}

/**
 * Douglas-Peucker: drops points closer than `toleranceMeters` to the line
 * between their neighbours. Keeps a saved route's street shape in a few dozen
 * points instead of hundreds.
 */
export function simplifyPath(path: readonly LatLng[], toleranceMeters = 8): LatLng[] {
  if (path.length <= 2) return [...path];
  let worst = 0;
  let index = 0;
  const first = path[0];
  const last = path[path.length - 1];
  for (let i = 1; i < path.length - 1; i++) {
    const d = Geo.distanceToPathMeters(path[i], [first, last]);
    if (d > worst) {
      worst = d;
      index = i;
    }
  }
  if (worst <= toleranceMeters) return [first, last];
  const left = simplifyPath(path.slice(0, index + 1), toleranceMeters);
  const right = simplifyPath(path.slice(index), toleranceMeters);
  return [...left.slice(0, -1), ...right];
}
