import { TileSource } from '../../components/map/tileSource';
import { googleMapsApiKey, isGoogleMapsConfigured } from './googleMaps';

/**
 * Google's own map imagery (Map Tiles API, 2D tiles) for the screens where
 * someone places a pin, so the spot they pick matches what Google Maps and
 * the directions show - and, in satellite view, the actual rooftops.
 *
 * A tile session is created once per map type and reused until it expires
 * (Google issues them for about two weeks). If the key is not allowed to use
 * the Map Tiles API, the session request is refused and the caller keeps the
 * CARTO basemap: there is no half-working Google map.
 */
export type GoogleMapType = 'roadmap' | 'satellite';

const SESSION_URL = 'https://tile.googleapis.com/v1/createSession';
const TILE_URL = 'https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}';

/** Renew a little before Google's expiry so a tile is never refused mid-use. */
const RENEW_MARGIN_MS = 60 * 60 * 1000;

export interface GoogleTileSession {
  session: string;
  /** Milliseconds since the epoch. */
  expiresAt: number;
}

export async function createGoogleTileSession(
  mapType: GoogleMapType,
  signal?: AbortSignal,
): Promise<GoogleTileSession> {
  if (!isGoogleMapsConfigured()) throw new Error('No Google Maps key configured.');
  const res = await fetch(`${SESSION_URL}?key=${encodeURIComponent(googleMapsApiKey())}`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mapType, language: 'en-US', region: 'PH' }),
  });
  if (!res.ok) throw new Error(`Google map tiles unavailable (${res.status}).`);
  const body = (await res.json()) as { session?: string; expiry?: string };
  if (!body.session) throw new Error('Google returned no tile session.');
  const expirySeconds = Number(body.expiry);
  return {
    session: body.session,
    expiresAt: Number.isFinite(expirySeconds) ? expirySeconds * 1000 : Date.now() + 86_400_000,
  };
}

export const googleTileSource = (session: string, mapType: GoogleMapType): TileSource => ({
  urlTemplate:
    `${TILE_URL}?session=${encodeURIComponent(session)}` +
    `&key=${encodeURIComponent(googleMapsApiKey())}`,
  attribution: mapType === 'satellite' ? 'Imagery (c) Google' : 'Map data (c) Google',
  minZoom: 3,
  maxZoom: mapType === 'satellite' ? 21 : 22,
  subdomains: [],
  headers: {
    'User-Agent': 'Bantay/1.0 (community hazard mapping; +https://github.com/DeeceeDice/Bantay)',
  },
});

const cache = new Map<GoogleMapType, { expiresAt: number; source: Promise<TileSource | null> }>();

/**
 * The Google tile source for `mapType`, or null when Google will not serve
 * tiles to this key (or there is no key or no connection). Shared by every
 * screen for the life of the app, so the session is requested once.
 */
export function loadGoogleTiles(mapType: GoogleMapType): Promise<TileSource | null> {
  const cached = cache.get(mapType);
  if (cached && cached.expiresAt - RENEW_MARGIN_MS > Date.now()) return cached.source;

  const entry = { expiresAt: Number.POSITIVE_INFINITY, source: Promise.resolve<TileSource | null>(null) };
  entry.source = createGoogleTileSession(mapType).then(
    (s) => {
      entry.expiresAt = s.expiresAt;
      return googleTileSource(s.session, mapType);
    },
    () => {
      // Refused: try again in a few minutes rather than on every screen.
      entry.expiresAt = Date.now() + RENEW_MARGIN_MS + 5 * 60 * 1000;
      return null;
    },
  );
  cache.set(mapType, entry);
  return entry.source;
}

/** For tests. */
export const clearGoogleTileCache = (): void => cache.clear();
