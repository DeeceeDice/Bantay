import 'dart:math' as math;

/// A WGS84 geographic coordinate.
///
/// Bantay ships its own coordinate type rather than depending on a mapping
/// SDK, because the map widget is self-contained (see [BantayMap]) and the
/// whole app must work without an API key.
class LatLng {
  const LatLng(this.latitude, this.longitude);

  final double latitude;
  final double longitude;

  Map<String, dynamic> toJson() => {'lat': latitude, 'lng': longitude};

  factory LatLng.fromJson(Map<String, dynamic> json) =>
      LatLng((json['lat'] as num).toDouble(), (json['lng'] as num).toDouble());

  @override
  bool operator ==(Object other) =>
      other is LatLng &&
      other.latitude == latitude &&
      other.longitude == longitude;

  @override
  int get hashCode => Object.hash(latitude, longitude);

  @override
  String toString() =>
      'LatLng(${latitude.toStringAsFixed(5)}, ${longitude.toStringAsFixed(5)})';
}

/// Geographic helpers shared by the map, the "Am I Safe Here?" check, route
/// status and distance labels.
class Geo {
  const Geo._();

  static const double earthRadiusMeters = 6378137.0;

  /// Great-circle distance in meters between two coordinates.
  static double distanceMeters(LatLng a, LatLng b) {
    final double lat1 = _rad(a.latitude);
    final double lat2 = _rad(b.latitude);
    final double dLat = _rad(b.latitude - a.latitude);
    final double dLng = _rad(b.longitude - a.longitude);

    final double h =
        math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1) *
            math.cos(lat2) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    return 2 * earthRadiusMeters * math.asin(math.min(1.0, math.sqrt(h)));
  }

  /// Initial bearing in degrees (0 = north, clockwise) from [a] to [b].
  static double bearingDegrees(LatLng a, LatLng b) {
    final double lat1 = _rad(a.latitude);
    final double lat2 = _rad(b.latitude);
    final double dLng = _rad(b.longitude - a.longitude);
    final double y = math.sin(dLng) * math.cos(lat2);
    final double x =
        math.cos(lat1) * math.sin(lat2) -
        math.sin(lat1) * math.cos(lat2) * math.cos(dLng);
    return (_deg(math.atan2(y, x)) + 360) % 360;
  }

  /// Shortest distance in meters from point [p] to the polyline [path].
  ///
  /// Used to decide whether a hazard actually sits on one of the user's saved
  /// routes, rather than merely being near its endpoints.
  static double distanceToPathMeters(LatLng p, List<LatLng> path) {
    if (path.isEmpty) return double.infinity;
    if (path.length == 1) return distanceMeters(p, path.first);

    double best = double.infinity;
    for (int i = 0; i < path.length - 1; i++) {
      final double d = _distanceToSegmentMeters(p, path[i], path[i + 1]);
      if (d < best) best = d;
    }
    return best;
  }

  /// Total length in meters of a polyline.
  static double pathLengthMeters(List<LatLng> path) {
    double total = 0;
    for (int i = 0; i < path.length - 1; i++) {
      total += distanceMeters(path[i], path[i + 1]);
    }
    return total;
  }

  /// Interpolates a point [t] (0..1) of the way along a polyline.
  static LatLng interpolateAlongPath(List<LatLng> path, double t) {
    if (path.isEmpty) return const LatLng(0, 0);
    if (path.length == 1) return path.first;

    final double target = pathLengthMeters(path) * t.clamp(0.0, 1.0);
    double travelled = 0;
    for (int i = 0; i < path.length - 1; i++) {
      final double seg = distanceMeters(path[i], path[i + 1]);
      if (seg <= 0) continue;
      if (travelled + seg >= target) {
        final double f = (target - travelled) / seg;
        return LatLng(
          path[i].latitude + (path[i + 1].latitude - path[i].latitude) * f,
          path[i].longitude + (path[i + 1].longitude - path[i].longitude) * f,
        );
      }
      travelled += seg;
    }
    return path.last;
  }

  /// Offsets a coordinate by a distance in meters along each axis.
  static LatLng offsetMeters(
    LatLng origin,
    double eastMeters,
    double northMeters,
  ) {
    final double dLat = _deg(northMeters / earthRadiusMeters);
    final double dLng = _deg(
      eastMeters / (earthRadiusMeters * math.cos(_rad(origin.latitude))),
    );
    return LatLng(origin.latitude + dLat, origin.longitude + dLng);
  }

  /// Human-readable distance, e.g. "480 m" or "2.4 km".
  static String formatDistance(double meters) {
    if (meters.isInfinite || meters.isNaN) return '--';
    if (meters < 1000) return '${meters.round()} m';
    return '${(meters / 1000).toStringAsFixed(meters < 10000 ? 1 : 0)} km';
  }

  /// Rough walking time at a 1.35 m/s city pace.
  static Duration walkingTime(double meters) =>
      Duration(seconds: (meters / 1.35).round());

  /// Rough driving time at a 20 km/h Metro Manila traffic pace.
  static Duration drivingTime(double meters) =>
      Duration(seconds: (meters / (20000 / 3600)).round());

  static double _distanceToSegmentMeters(LatLng p, LatLng a, LatLng b) {
    // Project into a local equirectangular plane; segments are short enough
    // (tens to hundreds of meters) that the distortion is negligible.
    final double latRef = _rad((a.latitude + b.latitude) / 2);
    double x(LatLng c) =>
        _rad(c.longitude) * math.cos(latRef) * earthRadiusMeters;
    double y(LatLng c) => _rad(c.latitude) * earthRadiusMeters;

    final double ax = x(a), ay = y(a);
    final double bx = x(b), by = y(b);
    final double px = x(p), py = y(p);

    final double dx = bx - ax, dy = by - ay;
    final double lenSq = dx * dx + dy * dy;
    if (lenSq == 0) return distanceMeters(p, a);

    double t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = t.clamp(0.0, 1.0);
    final double cx = ax + t * dx, cy = ay + t * dy;
    return math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
  }

  static double _rad(double deg) => deg * math.pi / 180.0;
  static double _deg(double rad) => rad * 180.0 / math.pi;
}
