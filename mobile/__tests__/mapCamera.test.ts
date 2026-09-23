import { latLng } from '../src/core/geo/latLng';
import {
  MAX_LATITUDE,
  MAX_ZOOM,
  MIN_ZOOM,
  MapCamera,
  anchored,
  fitting,
  isVisible,
  panned,
  projectWorld,
  toLatLng,
  toScreen,
  unprojectWorld,
  worldSize,
} from '../src/core/map/mapCamera';

const viewport = { width: 400, height: 800 };
const camera = (lat: number, lng: number, zoom: number): MapCamera => ({
  center: latLng(lat, lng),
  zoom,
  size: viewport,
});

describe('projection', () => {
  it('null island sits at the centre of the world at zoom 0', () => {
    const world = projectWorld(latLng(0, 0), 0);
    expect(world.x).toBeCloseTo(128, 3);
    expect(world.y).toBeCloseTo(128, 3);
  });

  it('longitude maps across the full world width', () => {
    expect(projectWorld(latLng(0, -180), 0).x).toBeCloseTo(0, 3);
    expect(projectWorld(latLng(0, 180), 0).x).toBeCloseTo(256, 3);
  });

  it('the Mercator latitude limit maps to the top of the world', () => {
    expect(projectWorld(latLng(MAX_LATITUDE, 0), 0).y).toBeCloseTo(0, 2);
  });

  it('world size doubles with each zoom level', () => {
    expect(worldSize(camera(0, 0, 3))).toBe(256 * 8);
  });

  it('project and unproject round-trip', () => {
    const point = latLng(14.6096, 120.9925);
    for (const zoom of [3, 8, 12.5, 16, 19]) {
      const back = unprojectWorld(projectWorld(point, zoom), zoom);
      expect(back.lat).toBeCloseTo(point.lat, 6);
      expect(back.lng).toBeCloseTo(point.lng, 6);
    }
  });
});

describe('viewport', () => {
  const c = camera(14.6096, 120.9925, 15);

  it('the centre coordinate lands in the middle of the viewport', () => {
    const screen = toScreen(c, c.center);
    expect(screen.x).toBeCloseTo(200, 3);
    expect(screen.y).toBeCloseTo(400, 3);
  });

  it('toScreen and toLatLng round-trip', () => {
    const probe = { x: 310, y: 145 };
    const back = toScreen(c, toLatLng(c, probe));
    expect(back.x).toBeCloseTo(probe.x, 3);
    expect(back.y).toBeCloseTo(probe.y, 3);
  });

  it('north is up and east is right', () => {
    expect(toScreen(c, latLng(c.center.lat + 0.01, c.center.lng)).y).toBeLessThan(400);
    expect(toScreen(c, latLng(c.center.lat, c.center.lng + 0.01)).x).toBeGreaterThan(200);
  });

  it('panning right moves the map west', () => {
    expect(panned(c, 120, 0).center.lng).toBeLessThan(c.center.lng);
  });

  it('offscreen points are culled, onscreen ones are kept', () => {
    expect(isVisible(c, c.center)).toBe(true);
    expect(isVisible(c, latLng(0, 0))).toBe(false);
  });
});

describe('anchored', () => {
  it('keeps the anchored coordinate under the same screen point', () => {
    const c = camera(14.6096, 120.9925, 14);
    const focal = { x: 280, y: 220 };
    const under = toLatLng(c, focal);

    // This is what a pinch gesture does: zoom in around the focal point.
    const zoomed = anchored(c, under, focal, 16.5);

    expect(zoomed.zoom).toBe(16.5);
    const after = toScreen(zoomed, under);
    expect(after.x).toBeCloseTo(focal.x, 1);
    expect(after.y).toBeCloseTo(focal.y, 1);
  });

  it('clamps zoom to the supported range', () => {
    const c = camera(14.6, 121, 14);
    expect(anchored(c, c.center, { x: 1, y: 1 }, 99).zoom).toBe(MAX_ZOOM);
    expect(anchored(c, c.center, { x: 1, y: 1 }, -5).zoom).toBe(MIN_ZOOM);
  });
});

describe('fitting', () => {
  const c = camera(0, 0, 10);

  it('frames every supplied point', () => {
    const points = [
      latLng(14.6138, 120.9895),
      latLng(14.596, 121.001),
      latLng(14.625, 120.983),
    ];
    const fitted = fitting(c, points);
    for (const p of points) {
      expect(isVisible(fitted, p, 0)).toBe(true);
    }
  });

  it('a single point does not produce an infinite zoom', () => {
    const fitted = fitting(c, [latLng(14.6, 121)]);
    expect(fitted.zoom).toBe(16);
    expect(fitted.center).toEqual(latLng(14.6, 121));
  });

  it('an empty list leaves the camera untouched', () => {
    expect(fitting(c, [])).toEqual(c);
  });
});
