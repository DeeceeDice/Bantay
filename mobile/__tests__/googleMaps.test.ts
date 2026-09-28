/**
 * The Google Maps helpers: polyline decoding, path simplification, picking
 * the safest alternative, and the calls themselves against a stubbed fetch.
 */
import { Geo, latLng } from '../src/core/geo/latLng';
import { HazardReport } from '../src/data/models/types';
import { verifiedHazards } from '../src/data/repositories/logic';
import { seedReports } from '../src/data/seed/seedData';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { googleMaps: { apiKey: 'test-key' } } } },
}));

// Imported after the mock so the module reads the stubbed key.
// eslint-disable-next-line import/first
import {
  RouteOption,
  computeRoutes,
  decodePolyline,
  googleMapsDirectionsUrl,
  hazardsOnPath,
  isGoogleMapsConfigured,
  pickSafestRoute,
  searchPlacesOnline,
  simplifyPath,
} from '../src/data/google/googleMaps';

const NOW = new Date('2026-09-23T12:00:00Z');
const hazards = verifiedHazards(seedReports(NOW));

/** Google's own documented example. */
const EXAMPLE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

function stubFetch(status: number, body: unknown): jest.Mock {
  const mock = jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

describe('decodePolyline', () => {
  it('decodes the reference polyline', () => {
    const points = decodePolyline(EXAMPLE);
    expect(points).toHaveLength(3);
    expect(points[0].lat).toBeCloseTo(38.5, 5);
    expect(points[0].lng).toBeCloseTo(-120.2, 5);
    expect(points[1].lat).toBeCloseTo(40.7, 5);
    expect(points[1].lng).toBeCloseTo(-120.95, 5);
    expect(points[2].lat).toBeCloseTo(43.252, 5);
    expect(points[2].lng).toBeCloseTo(-126.453, 5);
  });

  it('returns nothing for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});

describe('simplifyPath', () => {
  it('drops points that lie on the line and keeps the corners', () => {
    const a = latLng(14.6, 120.98);
    const corner = latLng(14.6, 120.99);
    const b = latLng(14.61, 120.99);
    const straight = Array.from({ length: 9 }, (_, i) =>
      latLng(14.6, 120.98 + (0.01 * (i + 1)) / 10),
    );
    const path = [a, ...straight, corner, b];
    const simple = simplifyPath(path);
    expect(simple[0]).toEqual(a);
    expect(simple[simple.length - 1]).toEqual(b);
    expect(simple).toContainEqual(corner);
    expect(simple.length).toBeLessThanOrEqual(4);
  });

  it('never moves the path by more than the tolerance', () => {
    const path = decodePolyline(EXAMPLE);
    for (const p of path) {
      expect(Geo.distanceToPathMeters(p, simplifyPath(path, 8))).toBeLessThanOrEqual(8);
    }
  });
});

describe('pickSafestRoute', () => {
  const option = (duration: number, on: HazardReport[]): RouteOption => ({
    path: [],
    distanceMeters: 1000,
    durationSeconds: duration,
    hazards: on,
  });

  it('prefers fewer hazards over a faster trip', () => {
    const clear = option(900, []);
    const risky = option(300, [hazards[0]]);
    expect(pickSafestRoute([risky, clear])).toBe(clear);
  });

  it('prefers the quicker route when both are equally clear', () => {
    const slow = option(900, []);
    const fast = option(600, []);
    expect(pickSafestRoute([slow, fast])).toBe(fast);
  });

  it('weighs a life-threatening hazard above several minor ones', () => {
    const base = hazards[0];
    const as = (id: string, severity: HazardReport['severity']): HazardReport => ({
      ...base,
      id,
      severity,
    });
    const minor = [as('m1', 'passable_with_caution'), as('m2', 'passable_with_caution')];
    const severe = [as('s1', 'life_threatening')];
    expect(pickSafestRoute([option(300, severe), option(300, minor)]).hazards).toBe(minor);
  });
});

describe('hazardsOnPath', () => {
  it('finds a hazard sitting on the path and ignores a far one', () => {
    const h = hazards[0];
    const through = [Geo.offsetMeters(h.location, 0, 300), Geo.offsetMeters(h.location, 0, -300)];
    const far = [Geo.offsetMeters(h.location, 2000, 0), Geo.offsetMeters(h.location, 2500, 0)];
    expect(hazardsOnPath(through, [h])).toEqual([h]);
    expect(hazardsOnPath(far, [h])).toEqual([]);
  });
});

describe('googleMapsDirectionsUrl', () => {
  it('builds a universal directions link for the chosen mode', () => {
    const url = googleMapsDirectionsUrl(latLng(14.6, 120.98), latLng(14.61, 120.99), 'WALK');
    expect(url).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=14.6,120.98&destination=14.61,120.99&travelmode=walking',
    );
  });
});

describe('Google APIs', () => {
  it('reads the key from app.json', () => {
    expect(isGoogleMapsConfigured()).toBe(true);
  });

  it('computes routes, decodes them and marks the hazards on each', async () => {
    const h = hazards[0];
    const onIt = [Geo.offsetMeters(h.location, 0, 200), Geo.offsetMeters(h.location, 0, -200)];
    const encode = (points: typeof onIt): string => {
      // Tiny encoder for the test only.
      let out = '';
      let pLat = 0;
      let pLng = 0;
      const enc = (v: number): void => {
        let n = v < 0 ? ~(v << 1) : v << 1;
        while (n >= 0x20) {
          out += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
          n >>= 5;
        }
        out += String.fromCharCode(n + 63);
      };
      for (const p of points) {
        const lat = Math.round(p.lat * 1e5);
        const lng = Math.round(p.lng * 1e5);
        enc(lat - pLat);
        enc(lng - pLng);
        pLat = lat;
        pLng = lng;
      }
      return out;
    };
    const fetchMock = stubFetch(200, {
      routes: [
        { distanceMeters: 400, duration: '120s', polyline: { encodedPolyline: encode(onIt) } },
      ],
    });

    const [route] = await computeRoutes(onIt[0], onIt[1], 'DRIVE', [h]);
    expect(route.durationSeconds).toBe(120);
    expect(route.distanceMeters).toBe(400);
    expect(route.path).toHaveLength(2);
    expect(route.hazards).toEqual([h]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://routes.googleapis.com/directions/v2:computeRoutes');
    expect(init.headers['X-Goog-Api-Key']).toBe('test-key');
    expect(JSON.parse(init.body)).toMatchObject({ travelMode: 'DRIVE', computeAlternativeRoutes: true });
  });

  it('throws when Google finds no route, so the screen can say so', async () => {
    stubFetch(200, {});
    await expect(
      computeRoutes(latLng(14.6, 120.98), latLng(14.61, 120.99), 'WALK', []),
    ).rejects.toThrow('No route');
  });

  it('throws on an API error rather than returning a made-up route', async () => {
    stubFetch(403, { error: { message: 'denied' } });
    await expect(
      computeRoutes(latLng(14.6, 120.98), latLng(14.61, 120.99), 'DRIVE', []),
    ).rejects.toThrow('403');
  });

  it('maps place search results', async () => {
    stubFetch(200, {
      places: [
        {
          displayName: { text: 'University of Santo Tomas' },
          formattedAddress: 'España Blvd, Sampaloc, Manila',
          location: { latitude: 14.6099, longitude: 120.9895 },
        },
        { displayName: { text: 'No location' } },
      ],
    });
    const results = await searchPlacesOnline('UST');
    expect(results).toEqual([
      {
        name: 'University of Santo Tomas',
        address: 'España Blvd, Sampaloc, Manila',
        location: latLng(14.6099, 120.9895),
      },
    ]);
  });
});
