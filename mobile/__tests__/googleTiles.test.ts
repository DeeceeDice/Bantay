/**
 * Google map tiles for the placement maps: a session is asked for once, and
 * a refusal (the key not allowed to use the Map Tiles API) means the caller
 * keeps CARTO rather than showing a blank Google map.
 */
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { googleMaps: { apiKey: 'test-key' } } } },
}));

// eslint-disable-next-line import/first
import { tileUrl } from '../src/components/map/tileSource';
// eslint-disable-next-line import/first
import {
  clearGoogleTileCache,
  createGoogleTileSession,
  googleTileSource,
  loadGoogleTiles,
} from '../src/data/google/googleTiles';

function stubFetch(status: number, body: unknown): jest.Mock {
  const mock = jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

beforeEach(() => clearGoogleTileCache());

describe('Google map tiles', () => {
  it('opens a session for the chosen map type', async () => {
    const fetchMock = stubFetch(200, { session: 'abc', expiry: '1800000000' });
    const s = await createGoogleTileSession('satellite');
    expect(s).toEqual({ session: 'abc', expiresAt: 1800000000 * 1000 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://tile.googleapis.com/v1/createSession?key=test-key');
    expect(JSON.parse(init.body)).toMatchObject({ mapType: 'satellite', region: 'PH' });
  });

  it('builds 2D tile URLs carrying the session and key', () => {
    const source = googleTileSource('abc', 'roadmap');
    expect(tileUrl(source, 27440, 15197, 15)).toBe(
      'https://tile.googleapis.com/v1/2dtiles/15/27440/15197?session=abc&key=test-key',
    );
    expect(source.attribution).toMatch(/Google/);
  });

  it('gives null when Google refuses, so the map keeps CARTO', async () => {
    stubFetch(403, { error: { status: 'PERMISSION_DENIED' } });
    await expect(loadGoogleTiles('roadmap')).resolves.toBeNull();
  });

  it('asks for a session once and shares it', async () => {
    const fetchMock = stubFetch(200, { session: 'abc', expiry: String(Date.now() / 1000 + 86400 * 14) });
    const [a, b] = await Promise.all([loadGoogleTiles('roadmap'), loadGoogleTiles('roadmap')]);
    expect(a).not.toBeNull();
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a refusal on every screen', async () => {
    const fetchMock = stubFetch(403, {});
    await loadGoogleTiles('roadmap');
    await loadGoogleTiles('roadmap');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
