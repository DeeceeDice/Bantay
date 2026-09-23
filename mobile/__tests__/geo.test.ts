import { Geo, latLng } from '../src/core/geo/latLng';

describe('Geo.distanceMeters', () => {
  it('is zero for the same point', () => {
    expect(Geo.distanceMeters(latLng(14.6, 121), latLng(14.6, 121))).toBeCloseTo(0, 3);
  });

  it('one degree of latitude is about 111 km', () => {
    expect(Geo.distanceMeters(latLng(0, 0), latLng(1, 0))).toBeCloseTo(111319, -2);
  });

  it('is symmetric', () => {
    const a = latLng(14.6096, 120.9925);
    const b = latLng(14.596, 121.001);
    expect(Geo.distanceMeters(a, b)).toBeCloseTo(Geo.distanceMeters(b, a), 6);
  });

  it('matches a known Manila distance', () => {
    // Espana Blvd to Nagtahan Bridge is roughly 1.8 km as the crow flies.
    const d = Geo.distanceMeters(latLng(14.6096, 120.9925), latLng(14.596, 121.001));
    expect(d).toBeGreaterThan(1500);
    expect(d).toBeLessThan(2200);
  });
});

describe('Geo.bearingDegrees', () => {
  it('due north is 0 and due east is 90', () => {
    expect(Geo.bearingDegrees(latLng(0, 0), latLng(1, 0))).toBeCloseTo(0, 2);
    expect(Geo.bearingDegrees(latLng(0, 0), latLng(0, 1))).toBeCloseTo(90, 2);
  });
});

describe('Geo.distanceToPathMeters', () => {
  const path = [latLng(14.6, 121), latLng(14.61, 121)];

  it('a point on the path measures zero', () => {
    expect(Geo.distanceToPathMeters(latLng(14.605, 121), path)).toBeCloseTo(0, 0);
  });

  it('measures perpendicular distance, not endpoint distance', () => {
    // Beside the middle of the segment: far from both ends, close to the line.
    const beside = latLng(14.605, 121.0009);
    const toPath = Geo.distanceToPathMeters(beside, path);
    const toNearestEnd = Math.min(
      Geo.distanceMeters(beside, path[0]),
      Geo.distanceMeters(beside, path[1]),
    );
    expect(toPath).toBeLessThan(toNearestEnd);
    expect(toPath).toBeGreaterThan(80);
    expect(toPath).toBeLessThan(115);
  });

  it('an empty path is infinitely far', () => {
    expect(Geo.distanceToPathMeters(latLng(14.6, 121), [])).toBe(Infinity);
  });
});

describe('Geo.interpolateAlongPath', () => {
  const path = [latLng(14.6, 121), latLng(14.61, 121)];

  it('t=0 and t=1 return the endpoints', () => {
    expect(Geo.interpolateAlongPath(path, 0).lat).toBeCloseTo(14.6, 6);
    expect(Geo.interpolateAlongPath(path, 1).lat).toBeCloseTo(14.61, 6);
  });

  it('t=0.5 lands halfway', () => {
    expect(Geo.interpolateAlongPath(path, 0.5).lat).toBeCloseTo(14.605, 4);
  });

  it('clamps out-of-range values instead of extrapolating', () => {
    expect(Geo.interpolateAlongPath(path, 2.5).lat).toBeCloseTo(14.61, 6);
    expect(Geo.interpolateAlongPath(path, -1).lat).toBeCloseTo(14.6, 6);
  });
});

describe('Geo.offsetMeters', () => {
  it('moves the requested distance north and east', () => {
    const origin = latLng(14.6, 121);
    const north = Geo.offsetMeters(origin, 0, 500);
    const east = Geo.offsetMeters(origin, 500, 0);

    expect(Geo.distanceMeters(origin, north)).toBeCloseTo(500, 0);
    expect(north.lat).toBeGreaterThan(origin.lat);
    expect(Geo.distanceMeters(origin, east)).toBeCloseTo(500, 0);
    expect(east.lng).toBeGreaterThan(origin.lng);
  });
});

describe('Geo.formatDistance', () => {
  it('uses metres below 1 km and kilometres above', () => {
    expect(Geo.formatDistance(480)).toBe('480 m');
    expect(Geo.formatDistance(2400)).toBe('2.4 km');
    expect(Geo.formatDistance(24000)).toBe('24 km');
  });

  it('handles non-finite input without throwing', () => {
    expect(Geo.formatDistance(Infinity)).toBe('--');
    expect(Geo.formatDistance(NaN)).toBe('--');
  });
});
