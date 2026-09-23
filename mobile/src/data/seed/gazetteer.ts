import { Geo, LatLng, latLng } from '../../core/geo/latLng';

export interface Place {
  readonly name: string;
  readonly area: string;
  readonly location: LatLng;
}

/**
 * A small built-in gazetteer of Manila landmarks.
 *
 * Search resolves against this list plus the user's own safe spots, saved
 * routes and reported hazards, which means the search bar and the address
 * labels keep working with no connection at all. Bantay is needed most
 * exactly when the network is worst, so the offline path has to exist first.
 */
export const PLACES: readonly Place[] = [
  { name: 'España Boulevard', area: 'Sampaloc, Manila', location: latLng(14.6096, 120.9925) },
  { name: 'University of Santo Tomas', area: 'Sampaloc, Manila', location: latLng(14.6091, 120.9892) },
  { name: 'Dapitan Street', area: 'Sampaloc, Manila', location: latLng(14.6138, 120.9895) },
  { name: 'Lacson Avenue', area: 'Sampaloc, Manila', location: latLng(14.615, 120.991) },
  { name: 'Morayta (Nicanor Reyes St)', area: 'Sampaloc, Manila', location: latLng(14.6042, 120.9866) },
  { name: 'Far Eastern University', area: 'Sampaloc, Manila', location: latLng(14.6042, 120.988) },
  { name: 'Vicente Cruz Street', area: 'Sampaloc, Manila', location: latLng(14.612, 120.986) },
  { name: 'Bustillos', area: 'Sampaloc, Manila', location: latLng(14.607, 120.993) },
  { name: 'Legarda Street', area: 'Sampaloc, Manila', location: latLng(14.6005, 120.9905) },
  { name: 'Mendiola', area: 'San Miguel, Manila', location: latLng(14.5992, 120.9905) },
  { name: 'Nagtahan Bridge', area: 'Santa Mesa, Manila', location: latLng(14.596, 121.001) },
  { name: 'Quiapo Church', area: 'Quiapo, Manila', location: latLng(14.5985, 120.9836) },
  { name: 'Quezon Boulevard', area: 'Quiapo, Manila', location: latLng(14.601, 120.984) },
  { name: 'Blumentritt', area: 'Santa Cruz, Manila', location: latLng(14.6248, 120.9836) },
  { name: 'Divisoria', area: 'Tondo, Manila', location: latLng(14.602, 120.972) },
  { name: 'Binondo', area: 'Manila', location: latLng(14.6, 120.975) },
  { name: 'Manila City Hall', area: 'Ermita, Manila', location: latLng(14.5915, 120.9812) },
  { name: 'SM City Manila', area: 'Ermita, Manila', location: latLng(14.5896, 120.9817) },
  { name: 'Robinsons Place Manila', area: 'Ermita, Manila', location: latLng(14.5776, 120.9847) },
  { name: 'Rizal Park', area: 'Ermita, Manila', location: latLng(14.5826, 120.9787) },
  { name: 'Pedro Gil Street', area: 'Ermita, Manila', location: latLng(14.579, 120.986) },
  { name: 'Taft Avenue', area: 'Malate, Manila', location: latLng(14.572, 120.993) },
  { name: 'Pandacan', area: 'Manila', location: latLng(14.592, 121.006) },
  { name: 'Santa Mesa', area: 'Manila', location: latLng(14.601, 121.013) },
  { name: 'Tayuman Street', area: 'Tondo, Manila', location: latLng(14.619, 120.978) },
];

export const fullLabel = (place: Place): string => `${place.name}, ${place.area}`;

/**
 * Lowercases and strips the accents Philippine place names carry, so
 * "espana" finds "España".
 */
function normalize(input: string): string {
  const folds: Record<string, string> = {
    á: 'a', à: 'a', ä: 'a', â: 'a',
    é: 'e', è: 'e', ë: 'e', ê: 'e',
    í: 'i', ì: 'i', ï: 'i', î: 'i',
    ó: 'o', ò: 'o', ö: 'o', ô: 'o',
    ú: 'u', ù: 'u', ü: 'u', û: 'u',
    ñ: 'n',
  };
  return input
    .toLowerCase()
    .split('')
    .map((c) => folds[c] ?? c)
    .join('')
    .trim();
}

/** Case- and accent-tolerant prefix/substring search. */
export function searchPlaces(query: string, limit = 6): Place[] {
  const q = normalize(query);
  if (q.length === 0) return [];

  const starts: Place[] = [];
  const contains: Place[] = [];

  for (const place of PLACES) {
    const name = normalize(place.name);
    const area = normalize(place.area);
    if (name.startsWith(q)) starts.push(place);
    else if (name.includes(q) || area.includes(q)) contains.push(place);
  }
  // Prefix matches first: typing "esp" should surface España before a street
  // that merely mentions it further along.
  return [...starts, ...contains].slice(0, limit);
}

/**
 * Best-effort reverse geocode against the built-in gazetteer.
 *
 * A production build can layer a geocoding API over this and fall back to it
 * when the network is down.
 */
export function describePoint(point: LatLng): string {
  let nearest: Place | null = null;
  let best = Number.POSITIVE_INFINITY;

  for (const place of PLACES) {
    const distance = Geo.distanceMeters(point, place.location);
    if (distance < best) {
      best = distance;
      nearest = place;
    }
  }

  if (!nearest) {
    return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
  }
  if (best < 140) return fullLabel(nearest);
  return `Near ${nearest.name}, ${nearest.area}`;
}
