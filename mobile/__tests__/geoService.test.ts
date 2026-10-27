/**
 * The geo client: polyline decoding, path simplification, picking the safest
 * alternative, and the calls to the `geo` Edge Function against a stub.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';

import { Geo, latLng } from '../src/core/geo/latLng';
import { HazardReport } from '../src/data/models/types';
import { verifiedHazards } from '../src/data/repositories/logic';
import { seedReports } from '../src/data/seed/seedData';

const mockInvoke = jest.fn();
jest.mock('../src/data/repositories/supabaseClient', () => ({
  isSupabaseConfigured: () => true,
  supabase: () => ({ functions: { invoke: mockInvoke } }),
}));

// eslint-disable-next-line import/first
import {
  GeoBusy,
  RouteOption,
  barangaySearchText,
  clearGeoCaches,
  computeRoutes,
  decodePolyline,
  findArea,
  googleMapsDirectionsUrl,
  hazardsOnPath,
  pickSafestRoute,
  searchPlacesOnline,
  simplifyPath,
} from '../src/data/geo/geoService';

const NOW = new Date('2026-09-23T12:00:00Z');
const hazards = verifiedHazards(seedReports(NOW));

/** The encoded-polyline format's documented example. */
const EXAMPLE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

/**
 * A real car route the deployed function returned, from España Blvd cor.
 * Lacson Ave to Sampaloc (2026-10-27).
 */
const ESPANA_ROUTE =
  'uldxAmjnaVz@bAn@t@~@fAHHHHPTFD@BZ\\PV|@`AlD|DVXZXJLHJj@n@l@p@p@v@RTZ^\\Ll@t@NPPBtB\\PDF?HBt@LZDD@vCf@tDl@JBEJ{AhEa@hAi@tA]|@IVKh@]lDAFR@@GRcCHm@Po@DABADAB?B?D@TB`CZ?DAN';

const ok = (data: unknown) => ({ data, error: null });
const httpError = (status: number, message: string) => ({
  data: null,
  error: new FunctionsHttpError({
    status,
    json: async () => ({ error: 'x', message }),
  } as unknown as Response),
});

beforeEach(() => {
  clearGeoCaches();
  mockInvoke.mockReset();
});

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

  it('decodes a real OSRM route into the streets between its two ends', () => {
    const path = decodePolyline(ESPANA_ROUTE);
    expect(Geo.distanceMeters(path[0], latLng(14.6096, 120.9925))).toBeLessThan(60);
    expect(Geo.distanceMeters(path[path.length - 1], latLng(14.6025, 120.9845))).toBeLessThan(60);
    // The router said 1,690 m; the decoded line is the same road.
    expect(Geo.pathLengthMeters(path)).toBeGreaterThan(1500);
    expect(Geo.pathLengthMeters(path)).toBeLessThan(1800);
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
    const path = decodePolyline(ESPANA_ROUTE);
    const simple = simplifyPath(path, 8);
    expect(simple.length).toBeLessThan(path.length);
    for (const p of path) {
      expect(Geo.distanceToPathMeters(p, simple)).toBeLessThanOrEqual(8);
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

describe('barangaySearchText', () => {
  const b = { code: '1381300060', name: 'Sauyo', city: 'Quezon City', province: 'National Capital Region (NCR)' };

  it('names a PSGC barangay the way OpenStreetMap does', () => {
    expect(barangaySearchText(b)).toBe('Sauyo, Quezon City');
    expect(barangaySearchText({ ...b, name: 'Barangay 659', city: 'Ermita, City of Manila' })).toBe(
      'Barangay 659, Ermita, City of Manila',
    );
  });

  it('turns a bare number into a numbered barangay', () => {
    expect(barangaySearchText({ ...b, name: '395', city: 'Sampaloc, City of Manila' })).toBe(
      'Barangay 395, Sampaloc, City of Manila',
    );
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

describe('the geo function', () => {
  const a = latLng(14.6096, 120.9925);
  const b = latLng(14.6025, 120.9845);

  it('computes routes, decodes them and marks the hazards on each', async () => {
    const h = { ...hazards[0], location: decodePolyline(ESPANA_ROUTE)[10] };
    mockInvoke.mockResolvedValue(
      ok({
        routes: [
          { polyline: ESPANA_ROUTE, distanceMeters: 1690, durationSeconds: 176 },
          { polyline: EXAMPLE, distanceMeters: 9000, durationSeconds: 900 },
        ],
      }),
    );
    const options = await computeRoutes(a, b, 'DRIVE', [h]);
    expect(mockInvoke).toHaveBeenCalledWith('geo', {
      body: { action: 'route', from: a, to: b, mode: 'DRIVE' },
      signal: undefined,
    });
    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({ distanceMeters: 1690, durationSeconds: 176 });
    expect(options[0].hazards).toEqual([h]);
    expect(options[1].hazards).toEqual([]);
  });

  it('asks once for the same route, then answers from memory', async () => {
    mockInvoke.mockResolvedValue(ok({ routes: [{ polyline: ESPANA_ROUTE, distanceMeters: 1690, durationSeconds: 176 }] }));
    await computeRoutes(a, b, 'WALK', []);
    await computeRoutes(a, b, 'WALK', []);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('throws when there is no route, rather than inventing one', async () => {
    mockInvoke.mockResolvedValue(ok({ routes: [] }));
    await expect(computeRoutes(a, b, 'DRIVE', [])).rejects.toThrow(/No route/);
  });

  it('says the service is busy when it is rate-limited or capped', async () => {
    mockInvoke.mockResolvedValue(httpError(429, 'Too many map requests.'));
    await expect(computeRoutes(a, b, 'DRIVE', [])).rejects.toBeInstanceOf(GeoBusy);
  });

  it('passes on the reason for any other failure', async () => {
    mockInvoke.mockResolvedValue(httpError(502, 'Map search is unavailable right now.'));
    await expect(computeRoutes(a, b, 'DRIVE', [])).rejects.toThrow('Map search is unavailable right now.');
  });

  it('maps place search results, biased to where the user is', async () => {
    mockInvoke.mockResolvedValue(
      ok({ places: [{ name: 'España Boulevard', address: 'Sampaloc, Manila', lat: 14.6054, lng: 120.9882, area: false }] }),
    );
    const found = await searchPlacesOnline(' España ', latLng(14.6, 120.99));
    expect(mockInvoke).toHaveBeenCalledWith('geo', {
      body: { action: 'search', query: 'España', near: latLng(14.6, 120.99), limit: 5 },
      signal: undefined,
    });
    expect(found).toEqual([
      { name: 'España Boulevard', address: 'Sampaloc, Manila', location: latLng(14.6054, 120.9882) },
    ]);
  });

  it('looks a barangay up as an area', async () => {
    mockInvoke.mockResolvedValue(
      ok({ places: [{ name: 'Sauyo', address: 'Quezon City', lat: 14.6896, lng: 121.0337, area: true }] }),
    );
    const place = await findArea('Sauyo, Quezon City');
    expect(mockInvoke.mock.calls[0][1].body).toMatchObject({ kind: 'area', near: null, limit: 1 });
    expect(place?.location).toEqual(latLng(14.6896, 121.0337));
  });

  it('finds nothing rather than a wrong place', async () => {
    mockInvoke.mockResolvedValue(ok({ places: [] }));
    expect(await findArea('Nowhere, Nowhere')).toBeNull();
  });
});
