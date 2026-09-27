import { Platform } from 'react-native';

/**
 * Where the map fetches its raster tiles.
 *
 * IMPORTANT before you distribute this app: the default points at the
 * OpenStreetMap Foundation's volunteer-run tile servers, and their usage
 * policy forbids distributing a consumer app that uses them by default
 * without prior permission from the Operations Working Group. That is a
 * licensing rule, not a capacity one - it applies at any traffic level.
 *
 * The default exists so the app runs the moment you clone it. For any real
 * release point `urlTemplate` at a commercial provider (MapTiler, Stadia
 * Maps, Geoapify, Thunderforest) or self-host. Nothing else in the app has
 * to change. See https://operations.osmfoundation.org/policies/tiles/
 */
export interface TileSource {
  urlTemplate: string;
  attribution: string;
  minZoom: number;
  maxZoom: number;
  subdomains: string[];
  /**
   * Sent with every tile request on Android and iOS. Tile servers require a
   * User-Agent that names the app: React Native's image loader otherwise
   * sends a generic one (`okhttp/...` on Android), which OpenStreetMap
   * answers with an "Access blocked" tile instead of the map.
   */
  headers: Record<string, string>;
}

export const OPEN_STREET_MAP: TileSource = {
  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '(c) OpenStreetMap contributors',
  minZoom: 3,
  maxZoom: 19,
  subdomains: [],
  headers: {
    'User-Agent': 'Bantay/1.0 (community hazard mapping; +https://github.com/DeeceeDice/Bantay)',
  },
};

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
