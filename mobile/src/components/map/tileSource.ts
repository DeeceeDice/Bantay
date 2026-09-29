import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Where the map fetches its raster tiles.
 *
 * CARTO's Voyager basemap: OpenStreetMap data, served from a CDN, with no API
 * key and no account. The OpenStreetMap Foundation's own tile servers, used
 * before, still left the map blank on phones even with a User-Agent naming the
 * app, and their usage policy forbids apps from defaulting to them.
 *
 * CARTO requires the attribution below to stay visible. Its free basemaps are
 * meant for non-commercial use at moderate volume; for a large public release,
 * take a CARTO plan or point `urlTemplate` at another provider (MapTiler,
 * Stadia Maps, Thunderforest) - nothing else in the app has to change.
 *
 * Requests carry the project's CARTO key (`EXPO_PUBLIC_CARTO_API_KEY`, else
 * `app.json` -> `expo.extra.carto.apiKey`), which CARTO answers with its
 * fuller Voyager render and counts against the key's own allowance. With no
 * key the tiles still load, as the public basemap.
 */
export interface TileSource {
  urlTemplate: string;
  attribution: string;
  minZoom: number;
  maxZoom: number;
  subdomains: string[];
  /**
   * Sent with every tile request on Android and iOS. Tile servers expect a
   * User-Agent that names the app: React Native's image loader otherwise
   * sends a generic one (`okhttp/...` on Android), which some servers block.
   */
  headers: Record<string, string>;
}

function readCartoKey(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { carto?: { apiKey?: unknown } };
  const fromApp = extra.carto?.apiKey;
  return (
    process.env.EXPO_PUBLIC_CARTO_API_KEY?.trim() ||
    (typeof fromApp === 'string' ? fromApp.trim() : '')
  );
}

/** CARTO Voyager, with `key` on every tile request when there is one. */
export const cartoVoyager = (key: string): TileSource => ({
  urlTemplate:
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png' +
    (key ? `?key=${encodeURIComponent(key)}` : ''),
  attribution: '(c) OpenStreetMap contributors (c) CARTO',
  minZoom: 3,
  // Voyager has real tiles to zoom 19; zoom 20 comes back blank, so deeper
  // zooms enlarge the zoom-19 tiles instead.
  maxZoom: 19,
  subdomains: ['a', 'b', 'c', 'd'],
  headers: {
    'User-Agent': 'Bantay/1.0 (community hazard mapping; +https://github.com/DeeceeDice/Bantay)',
  },
});

export const CARTO_VOYAGER: TileSource = cartoVoyager(readCartoKey());

export function tileUrl(source: TileSource, x: number, y: number, z: number): string {
  let url = source.urlTemplate
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
  if (source.subdomains.length > 0) {
    url = url.replace('{s}', source.subdomains[(x + y) % source.subdomains.length]);
  }
  return url;
}

/**
 * The image source for one tile. Browsers identify themselves and forbid
 * overriding the User-Agent (a custom header would also force a CORS
 * preflight the tile server may refuse), so headers are native-only.
 */
export function tileImageSource(
  source: TileSource,
  x: number,
  y: number,
  z: number,
  os: string = Platform.OS,
): { uri: string; headers?: Record<string, string> } {
  const uri = tileUrl(source, x, y, z);
  return os === 'web' ? { uri } : { uri, headers: source.headers };
}
