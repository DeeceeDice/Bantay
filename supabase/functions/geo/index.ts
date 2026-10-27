// =============================================================================
// Bantay geo - place search and street routing, from free OpenStreetMap
// services, for signed-in Bantay users.
//
// Why a function instead of calling the services from the app:
//   - No key ships in the app or the public website. (Search and routing used
//     to be Google's, with a billable key readable by anyone.)
//   - The services' fair-use policies ask callers to identify themselves; a
//     browser cannot set a User-Agent, this can.
//   - One place caches answers, rate-limits each account, and keeps a monthly
//     cap through the same `claim_api_call` counter the database already has
//     (api_limits rows 'osm_search' and 'osm_route'), so Bantay stays a polite
//     user of servers run by volunteers.
//   - Swapping a provider (a paid plan, a self-hosted OSRM) changes this file
//     only; no app release.
//
// Providers (OpenStreetMap data; the map already shows its attribution):
//   search  - Photon (photon.komoot.io), Nominatim as the fallback
//   routing - FOSSGIS OSRM (routing.openstreetmap.de: car and foot), with the
//             OSRM demo server as the fallback for car
//
// Deploy: supabase functions deploy geo   (JWT verification on, the default)
// =============================================================================

const USER_AGENT = 'Bantay/1.0 (community hazard mapping; +https://github.com/DeeceeDice/Bantay)';
/** The Philippines, as minLon,minLat,maxLon,maxLat. */
const PH_BBOX = [116.9, 4.5, 126.7, 21.2] as const;
const MANILA = { lat: 14.5995, lng: 120.9842 };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type LatLng = { lat: number; lng: number };
type Mode = 'DRIVE' | 'WALK';

export interface Place {
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** An area (a barangay, district, town) rather than a street or a business. */
  area: boolean;
}

/** OpenStreetMap tags that mark an area: barangays are admin boundaries or places. */
const isAreaTag = (key: string | undefined, value: string | undefined): boolean =>
  key === 'place' || (key === 'boundary' && value === 'administrative');

export interface Route {
  /** Encoded polyline, precision 5 (the format Google also uses). */
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// --- Caching and limits ------------------------------------------------------

const cache = new Map<string, { until: number; value: unknown }>();
const CACHE_LIMIT = 500;

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.value as T;
  const value = await load();
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  cache.set(key, { until: Date.now() + ttlMs, value });
  return value;
}

/** Requests per account per minute, per function instance. */
const PER_MINUTE = 30;
const recent = new Map<string, number[]>();

function rateLimit(caller: string): void {
  const now = Date.now();
  const times = (recent.get(caller) ?? []).filter((t) => now - t < 60_000);
  if (times.length >= PER_MINUTE) {
    throw new HttpError(429, 'busy', 'Too many map requests. Try again in a minute.');
  }
  times.push(now);
  recent.set(caller, times);
}

/**
 * Who is calling. The platform has already verified the token's signature
 * (JWT verification is on), so its claims can be read as they are.
 */
function caller(req: Request): { role: string; sub: string | null } {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(payload)) as { role?: string; sub?: string };
    return { role: claims.role ?? 'anon', sub: claims.sub ?? null };
  } catch {
    return { role: 'anon', sub: null };
  }
}

/** One ticket from the shared monthly counter, as the caller. Fails closed. */
async function claim(req: Request, api: 'osm_search' | 'osm_route'): Promise<void> {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  let granted = false;
  if (url && anonKey) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/claim_api_call`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: req.headers.get('Authorization') ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ api }),
      });
      granted = res.ok && (await res.json()) === true;
    } catch {
      granted = false;
    }
  }
  if (!granted) {
    throw new HttpError(429, 'busy', "This month's map searches are used up. Try again later.");
  }
}

// --- Providers ---------------------------------------------------------------

async function getJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return res.json();
}

const inPhilippines = (p: LatLng): boolean =>
  p.lng >= PH_BBOX[0] && p.lat >= PH_BBOX[1] && p.lng <= PH_BBOX[2] && p.lat <= PH_BBOX[3];

const joinParts = (parts: (string | undefined)[]): string =>
  parts.filter((part, i, all): part is string => !!part && all.indexOf(part) === i).join(', ');

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | undefined>;
}

export function photonPlaces(body: unknown): Place[] {
  const features = ((body as { features?: PhotonFeature[] })?.features ?? []) as PhotonFeature[];
  return features.flatMap((f) => {
    const [lng, lat] = f.geometry?.coordinates ?? [];
    const p = f.properties ?? {};
    const street = p.street ? (p.housenumber ? `${p.housenumber} ${p.street}` : p.street) : undefined;
    const name = p.name ?? street;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !name) return [];
    const address = joinParts([
      street !== name ? street : undefined,
      p.locality,
      p.district,
      p.city,
      p.state,
    ]);
    return [{ name, address, lat, lng, area: isAreaTag(p.osm_key, p.osm_value) }];
  });
}

interface NominatimResult {
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  category?: string;
  type?: string;
}

export function nominatimPlaces(body: unknown): Place[] {
  return ((body as NominatimResult[]) ?? []).flatMap((r) => {
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    const name = r.name || r.display_name?.split(',')[0];
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !name) return [];
    const address = (r.display_name ?? '').split(', ').slice(1, 4).join(', ');
    return [{ name, address, lat, lng, area: isAreaTag(r.category, r.type) }];
  });
}

/** Areas first, keeping each group's own order (the provider's relevance). */
const areasFirst = (places: Place[]): Place[] => [
  ...places.filter((p) => p.area),
  ...places.filter((p) => !p.area),
];

async function searchPlaces(query: string, near: LatLng | null, limit: number): Promise<Place[]> {
  const photon = new URL('https://photon.komoot.io/api/');
  photon.searchParams.set('q', query);
  photon.searchParams.set('limit', String(limit));
  photon.searchParams.set('lang', 'en');
  photon.searchParams.set('bbox', PH_BBOX.join(','));
  if (near) {
    photon.searchParams.set('lat', String(near.lat));
    photon.searchParams.set('lon', String(near.lng));
  }
  try {
    return photonPlaces(await getJson(photon.toString()));
  } catch {
    const nominatim = new URL('https://nominatim.openstreetmap.org/search');
    nominatim.searchParams.set('q', query);
    nominatim.searchParams.set('format', 'jsonv2');
    nominatim.searchParams.set('countrycodes', 'ph');
    nominatim.searchParams.set('limit', String(limit));
    return nominatimPlaces(await getJson(nominatim.toString()));
  }
}

interface OsrmBody {
  code?: string;
  routes?: { geometry?: string; distance?: number; duration?: number }[];
}

export function osrmRoutes(body: unknown): Route[] {
  const b = body as OsrmBody;
  if (b?.code !== 'Ok') return [];
  return (b.routes ?? []).flatMap((r) =>
    typeof r.geometry === 'string' && r.geometry.length > 0
      ? [{
          polyline: r.geometry,
          distanceMeters: Math.round(r.distance ?? 0),
          durationSeconds: Math.round(r.duration ?? 0),
        }]
      : [],
  );
}

const ROUTERS: Record<Mode, string[]> = {
  DRIVE: ['https://routing.openstreetmap.de/routed-car', 'https://router.project-osrm.org'],
  WALK: ['https://routing.openstreetmap.de/routed-foot'],
};

async function computeRoutes(from: LatLng, to: LatLng, mode: Mode): Promise<Route[]> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  let lastError: unknown = null;
  for (const base of ROUTERS[mode]) {
    try {
      const routes = osrmRoutes(
        await getJson(
          `${base}/route/v1/driving/${coords}?overview=full&geometries=polyline&alternatives=3&steps=false`,
        ),
      );
      if (routes.length > 0) return routes;
      lastError = new Error('No route found between these points.');
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('No route found.');
}

// --- Input -------------------------------------------------------------------

function point(value: unknown, field: string): LatLng {
  const p = value as Partial<LatLng> | null;
  if (
    !p || typeof p.lat !== 'number' || typeof p.lng !== 'number' ||
    !Number.isFinite(p.lat) || !Number.isFinite(p.lng) || !inPhilippines(p as LatLng)
  ) {
    throw new HttpError(400, 'bad_request', `${field} must be a point in the Philippines.`);
  }
  return { lat: p.lat, lng: p.lng };
}

const round = (n: number, places: number): string => n.toFixed(places);

// --- Handler -----------------------------------------------------------------

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') throw new HttpError(405, 'method', 'Use POST.');

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const who = caller(req);

  // A fixed check that both providers answer and parse - no user input, so it
  // is safe to allow without signing in. Used to test a deploy.
  if (body.action === 'health') {
    const report = await cached('health', 10 * 60_000, async () => {
      const outcome = async <T>(run: () => Promise<T>) => {
        try {
          return { ok: true, value: await run() };
        } catch (error) {
          return { ok: false, error: String(error) };
        }
      };
      const [search, barangay, drive, walk] = await Promise.all([
        outcome(() => searchPlaces('España Boulevard, Manila', MANILA, 3)),
        outcome(async () => areasFirst(await searchPlaces('Sauyo, Quezon City', null, 10)).slice(0, 2)),
        outcome(() => computeRoutes({ lat: 14.6096, lng: 120.9925 }, { lat: 14.6025, lng: 120.9845 }, 'DRIVE')),
        outcome(() => computeRoutes({ lat: 14.6096, lng: 120.9925 }, { lat: 14.6025, lng: 120.9845 }, 'WALK')),
      ]);
      return { checkedAt: new Date().toISOString(), search, barangay, drive, walk };
    });
    return json(report);
  }

  if (who.role !== 'authenticated' || !who.sub) {
    throw new HttpError(401, 'sign_in', 'Sign in to search the map.');
  }

  if (body.action === 'search') {
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (query.length < 2 || query.length > 160) {
      throw new HttpError(400, 'bad_request', 'Search for 2 to 160 characters.');
    }
    const near = body.near == null ? null : point(body.near, 'near');
    const limit = Math.min(10, Math.max(1, Number(body.limit) || 5));
    // Looking up a barangay: ask for more and put areas ahead of the streets
    // and shops that share its name.
    const areas = body.kind === 'area';
    const key = `s|${query.toLowerCase()}|${near ? `${round(near.lat, 2)},${round(near.lng, 2)}` : '-'}|${limit}|${areas}`;
    rateLimit(who.sub);
    const places = await cached(key, 24 * 60 * 60_000, async () => {
      await claim(req, 'osm_search');
      return areas
        ? areasFirst(await searchPlaces(query, near, 10)).slice(0, limit)
        : searchPlaces(query, near, limit);
    });
    return json({ places });
  }

  if (body.action === 'route') {
    const from = point(body.from, 'from');
    const to = point(body.to, 'to');
    const mode: Mode = body.mode === 'WALK' ? 'WALK' : 'DRIVE';
    // About 10 m: moving a step is not a new route.
    const key = `r|${[from.lat, from.lng, to.lat, to.lng].map((n) => round(n, 4)).join(',')}|${mode}`;
    rateLimit(who.sub);
    const routes = await cached(key, 10 * 60_000, async () => {
      await claim(req, 'osm_route');
      return computeRoutes(from, to, mode);
    });
    return json({ routes });
  }

  throw new HttpError(400, 'bad_request', 'Unknown action.');
}

Deno.serve(async (req: Request) => {
  try {
    return await handle(req);
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.code, message: error.message }, error.status);
    }
    return json({ error: 'unavailable', message: 'Map search is unavailable right now.' }, 502);
  }
});
