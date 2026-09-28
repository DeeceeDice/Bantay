import Constants from 'expo-constants';

import { Geo, LatLng, latLng } from '../../core/geo/latLng';
import { severityRank } from '../models/enums';
import { Barangay, HazardReport } from '../models/types';
import { ROUTE_HAZARD_THRESHOLD_METERS } from '../repositories/logic';

/**
 * Google Maps Platform, used for the two things Bantay cannot do well alone:
 * finding a place by name (Places API) and following real streets from A to
 * B (Routes API). The map itself is still drawn by Bantay's own engine.
 *
 * The key comes from `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, else `app.json`
 * (`expo.extra.googleMaps.apiKey`). Without one, search falls back to the
 * built-in gazetteer and directions say plainly that routing is unavailable -
 * there is no made-up route in its place.
 */
function readKey(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { googleMaps?: { apiKey?: unknown } };
  const fromApp = extra.googleMaps?.apiKey;
  return (
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    (typeof fromApp === 'string' ? fromApp.trim() : '')
  );
}

const API_KEY = readKey();

export const isGoogleMapsConfigured = (): boolean => API_KEY.length > 0;

/** The key itself, for URLs that must carry it (map tiles). */
export const googleMapsApiKey = (): string => API_KEY;

/** Metro Manila, so "España" means the boulevard and not the country. */
const MANILA = latLng(14.5995, 120.9842);

export interface PlaceResult {
  name: string;
  address: string;
  location: LatLng;
}

/**
 * Text search, biased towards where the user is (or Metro Manila); pass
 * `null` for no bias, when the query already names the town and province.
 * Throws on network or API failure so the caller can fall back.
 */
export async function searchPlacesOnline(
  query: string,
  near: LatLng | null = MANILA,
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  if (!isGoogleMapsConfigured()) throw new Error('No Google Maps key configured.');
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify({
      textQuery: query,
      regionCode: 'PH',
      maxResultCount: 5,
      ...(near && {
        locationBias: {
          circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 20000 },
        },
      }),
    }),
  });
  if (!res.ok) throw new Error(`Places search failed (${res.status}).`);
  const body = (await res.json()) as {
    places?: {
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
    }[];
  };
  return (body.places ?? [])
    .filter((p) => p.location && p.displayName?.text)
    .map((p) => ({
      name: p.displayName!.text!,
      address: p.formattedAddress ?? '',
      location: latLng(p.location!.latitude, p.location!.longitude),
    }));
}

/**
 * How to ask Places for a PSGC barangay, which has a name but no
 * coordinates: "Barangay Sauyo, Quezon City, National Capital Region (NCR)".
 */
export const barangaySearchText = (b: Barangay): string =>
  [/^barangay\b/i.test(b.name) ? b.name : `Barangay ${b.name}`, b.city, b.province]
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
 * Real street routes from the Routes API, with alternatives.
 *
 * Google cannot be told "avoid this flooded corner", so Bantay does the next
 * best honest thing: it asks for every alternative Google offers and picks
 * the one that passes the fewest (and least severe) verified hazards. If all
 * of them pass one, the hazards are shown rather than hidden.
 */
export async function computeRoutes(
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode,
  hazards: readonly HazardReport[],
  signal?: AbortSignal,
): Promise<RouteOption[]> {
  if (!isGoogleMapsConfigured()) throw new Error('No Google Maps key configured.');
  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: {
        location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
      },
      travelMode: mode,
      computeAlternativeRoutes: true,
      languageCode: 'en-US',
      regionCode: 'PH',
    }),
  });
  if (!res.ok) throw new Error(`Routing failed (${res.status}).`);
  const body = (await res.json()) as {
    routes?: { distanceMeters?: number; duration?: string; polyline?: { encodedPolyline?: string } }[];
  };
  const routes = (body.routes ?? []).filter((r) => r.polyline?.encodedPolyline);
  if (routes.length === 0) throw new Error('No route found between these points.');

  return routes.map((r) => {
    const path = decodePolyline(r.polyline!.encodedPolyline!);
    return {
      path,
      distanceMeters: r.distanceMeters ?? Geo.pathLengthMeters(path),
      durationSeconds: Number.parseInt(String(r.duration ?? '0').replace('s', ''), 10) || 0,
      hazards: hazardsOnPath(path, hazards),
    };
  });
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

/** Hands the trip to the Google Maps app (or website) for turn-by-turn. */
export const googleMapsDirectionsUrl = (
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode,
): string =>
  'https://www.google.com/maps/dir/?api=1' +
  `&origin=${origin.lat},${origin.lng}` +
  `&destination=${destination.lat},${destination.lng}` +
  `&travelmode=${mode === 'WALK' ? 'walking' : 'driving'}`;

/** Google's encoded polyline format (precision 5). */
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
