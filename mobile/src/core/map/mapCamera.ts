import { Geo, LatLng, latLng } from '../geo/latLng';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export const MIN_ZOOM = 3;
export const MAX_ZOOM = 19;
export const TILE_SIZE = 256;

/** The latitude beyond which Web Mercator is undefined. */
export const MAX_LATITUDE = 85.05112878;

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/**
 * Web Mercator projection and viewport maths for the map.
 *
 * This is the same scheme every slippy-map tile server uses: the world is a
 * square of `256 * 2^zoom` pixels, with latitude clamped where the projection
 * diverges.
 *
 * Kept as pure functions with no React or React Native dependency, so the
 * maths is directly unit-testable - which matters because gesture behaviour
 * is impossible to eyeball in CI but the maths underneath it is not.
 */
export interface MapCamera {
  readonly center: LatLng;
  readonly zoom: number;
  readonly size: Size;
}

export const camera = (
  center: LatLng,
  zoom: number,
  size: Size,
): MapCamera => ({ center, zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM), size });

/** Projects a coordinate to absolute world pixels at `atZoom`. */
export function projectWorld(point: LatLng, atZoom: number): Point {
  const scale = TILE_SIZE * Math.pow(2, atZoom);
  const lat = clamp(point.lat, -MAX_LATITUDE, MAX_LATITUDE);
  const latRad = (lat * Math.PI) / 180;

  const x = ((point.lng + 180) / 360) * scale;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    scale;
  return { x, y };
}

/** Inverse of `projectWorld`. */
export function unprojectWorld(world: Point, atZoom: number): LatLng {
  const scale = TILE_SIZE * Math.pow(2, atZoom);
  const lng = (world.x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * world.y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return latLng(lat, lng);
}

export const worldSize = (c: MapCamera): number =>
  TILE_SIZE * Math.pow(2, c.zoom);

/** World-pixel offset of the viewport's top-left corner. */
export function topLeftWorld(c: MapCamera): Point {
  const centreWorld = projectWorld(c.center, c.zoom);
  return {
    x: centreWorld.x - c.size.width / 2,
    y: centreWorld.y - c.size.height / 2,
  };
}

/** Screen position of a geographic point inside this viewport. */
export function toScreen(c: MapCamera, point: LatLng): Point {
  const world = projectWorld(point, c.zoom);
  const topLeft = topLeftWorld(c);
  return { x: world.x - topLeft.x, y: world.y - topLeft.y };
}

/** Geographic point under a screen position. */
export function toLatLng(c: MapCamera, screen: Point): LatLng {
  const topLeft = topLeftWorld(c);
  return unprojectWorld(
    { x: screen.x + topLeft.x, y: screen.y + topLeft.y },
    c.zoom,
  );
}

/**
 * True when a point falls inside the viewport, with `padding` slack so
 * markers are not culled while part of them is still visible.
 */
export function isVisible(c: MapCamera, point: LatLng, padding = 96): boolean {
  const p = toScreen(c, point);
  return (
    p.x >= -padding &&
    p.y >= -padding &&
    p.x <= c.size.width + padding &&
    p.y <= c.size.height + padding
  );
}

/**
 * Returns the camera that puts `point` under `screen` at `atZoom`.
 *
 * This is what keeps the spot under a pinch anchored while the zoom level
 * changes around it, and it is also how a one-finger drag is expressed, so
 * pan and zoom compose correctly within a single gesture.
 */
export function anchored(
  c: MapCamera,
  point: LatLng,
  screen: Point,
  atZoom: number,
): MapCamera {
  const z = clamp(atZoom, MIN_ZOOM, MAX_ZOOM);
  const world = projectWorld(point, z);
  const newTopLeft = { x: world.x - screen.x, y: world.y - screen.y };
  const newCenter = unprojectWorld(
    {
      x: newTopLeft.x + c.size.width / 2,
      y: newTopLeft.y + c.size.height / 2,
    },
    z,
  );
  return { center: newCenter, zoom: z, size: c.size };
}

/** Pans by a screen-space delta. */
export function panned(c: MapCamera, dx: number, dy: number): MapCamera {
  const centreWorld = projectWorld(c.center, c.zoom);
  const next = unprojectWorld(
    { x: centreWorld.x - dx, y: centreWorld.y - dy },
    c.zoom,
  );
  return { ...c, center: clampCenter(next) };
}

/**
 * A camera that frames every point with `padding` to spare.
 *
 * Falls back to the current camera when the list is empty, and to a fixed
 * close zoom when every point is identical - a zero-size bounding box would
 * otherwise produce an infinite zoom.
 */
export function fitting(
  c: MapCamera,
  points: readonly LatLng[],
  padding: Insets = { top: 64, right: 64, bottom: 64, left: 64 },
): MapCamera {
  if (points.length === 0) return c;
  if (points.length === 1) return { ...c, center: points[0], zoom: 16 };

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }

  const mid = latLng((minLat + maxLat) / 2, (minLng + maxLng) / 2);
  const availableWidth = Math.max(
    32,
    c.size.width - padding.left - padding.right,
  );
  const availableHeight = Math.max(
    32,
    c.size.height - padding.top - padding.bottom,
  );

  // Find the largest zoom at which the bounds still fit the viewport.
  let best = MIN_ZOOM;
  for (let z = MAX_ZOOM; z >= MIN_ZOOM; z -= 0.25) {
    const a = projectWorld(latLng(maxLat, minLng), z);
    const b = projectWorld(latLng(minLat, maxLng), z);
    if (
      Math.abs(b.x - a.x) <= availableWidth &&
      Math.abs(b.y - a.y) <= availableHeight
    ) {
      best = z;
      break;
    }
  }
  return { center: mid, zoom: best, size: c.size };
}

/**
 * Converts a real-world radius in meters to screen pixels at the camera's
 * latitude, so a circle scales correctly as the map moves north or south.
 */
export function metersToPixels(c: MapCamera, origin: LatLng, meters: number): number {
  const centre = toScreen(c, origin);
  const edge = toScreen(c, Geo.offsetMeters(origin, meters, 0));
  return Math.hypot(edge.x - centre.x, edge.y - centre.y);
}

/**
 * Keeps the centre inside the projectable world so the map cannot be dragged
 * off into undefined latitudes.
 */
function clampCenter(center: LatLng): LatLng {
  return latLng(
    clamp(center.lat, -MAX_LATITUDE, MAX_LATITUDE),
    ((((center.lng + 180) % 360) + 360) % 360) - 180,
  );
}
