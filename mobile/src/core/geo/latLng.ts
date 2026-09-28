/** A WGS84 geographic coordinate. */
export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

export const latLng = (lat: number, lng: number): LatLng => ({ lat, lng });

const EARTH_RADIUS_METERS = 6378137.0;
const rad = (deg: number): number => (deg * Math.PI) / 180;
const deg = (r: number): number => (r * 180) / Math.PI;

/**
 * Geographic helpers shared by the map, the "Am I Safe Here?" check, route
 * status and distance labels.
 *
 * Bantay ships its own geo maths rather than depending on a mapping SDK,
 * because the map component is self-contained and the whole app must work
 * without an API key.
 */
export const Geo = {
  earthRadiusMeters: EARTH_RADIUS_METERS,

  /** Great-circle distance in meters between two coordinates. */
  distanceMeters(a: LatLng, b: LatLng): number {
    const lat1 = rad(a.lat);
    const lat2 = rad(b.lat);
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);

    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
  },

  /** Initial bearing in degrees (0 = north, clockwise) from `a` to `b`. */
  bearingDegrees(a: LatLng, b: LatLng): number {
    const lat1 = rad(a.lat);
    const lat2 = rad(b.lat);
    const dLng = rad(b.lng - a.lng);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (deg(Math.atan2(y, x)) + 360) % 360;
  },

  /**
   * Shortest distance in meters from point `p` to the polyline `path`.
   *
   * Used to decide whether a hazard actually sits on one of the user's saved
   * routes, rather than merely being near its endpoints.
   */
  distanceToPathMeters(p: LatLng, path: readonly LatLng[]): number {
    if (path.length === 0) return Number.POSITIVE_INFINITY;
    if (path.length === 1) return Geo.distanceMeters(p, path[0]);

    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < path.length - 1; i++) {
      const d = distanceToSegmentMeters(p, path[i], path[i + 1]);
      if (d < best) best = d;
    }
    return best;
  },

  /** Total length in meters of a polyline. */
  pathLengthMeters(path: readonly LatLng[]): number {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      total += Geo.distanceMeters(path[i], path[i + 1]);
    }
    return total;
  },

  /** Interpolates a point `t` (0..1) of the way along a polyline. */
  interpolateAlongPath(path: readonly LatLng[], t: number): LatLng {
    if (path.length === 0) return latLng(0, 0);
    if (path.length === 1) return path[0];

    const clamped = Math.min(1, Math.max(0, t));
    const target = Geo.pathLengthMeters(path) * clamped;
    let travelled = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const seg = Geo.distanceMeters(path[i], path[i + 1]);
      if (seg <= 0) continue;
      if (travelled + seg >= target) {
        const f = (target - travelled) / seg;
        return latLng(
          path[i].lat + (path[i + 1].lat - path[i].lat) * f,
          path[i].lng + (path[i + 1].lng - path[i].lng) * f,
        );
      }
      travelled += seg;
    }
    return path[path.length - 1];
  },

  /** Offsets a coordinate by a distance in meters along each axis. */
  offsetMeters(origin: LatLng, eastMeters: number, northMeters: number): LatLng {
    const dLat = deg(northMeters / EARTH_RADIUS_METERS);
    const dLng = deg(
      eastMeters / (EARTH_RADIUS_METERS * Math.cos(rad(origin.lat))),
    );
    return latLng(origin.lat + dLat, origin.lng + dLng);
  },

  /** Human-readable distance, e.g. "480 m" or "2.4 km". */
  formatDistance(meters: number): string {
    if (!Number.isFinite(meters)) return '--';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
  },

  /** An alert radius in kilometres, as the settings show it: "500 m", "2.0 km". */
  formatRadius(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  },

  /** Rough walking time at a 1.35 m/s city pace, in seconds. */
  walkingTimeSeconds: (meters: number): number => Math.round(meters / 1.35),

  /** Rough driving time at a 20 km/h Metro Manila traffic pace, in seconds. */
  drivingTimeSeconds: (meters: number): number =>
    Math.round(meters / (20000 / 3600)),
};

/**
 * Projects into a local equirectangular plane; segments are short enough
 * (tens to hundreds of meters) that the distortion is negligible.
 */
function distanceToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const latRef = rad((a.lat + b.lat) / 2);
  const x = (c: LatLng): number =>
    rad(c.lng) * Math.cos(latRef) * EARTH_RADIUS_METERS;
  const y = (c: LatLng): number => rad(c.lat) * EARTH_RADIUS_METERS;

  const ax = x(a);
  const ay = y(a);
  const bx = x(b);
  const by = y(b);
  const px = x(p);
  const py = y(p);

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Geo.distanceMeters(p, a);

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.min(1, Math.max(0, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
}
