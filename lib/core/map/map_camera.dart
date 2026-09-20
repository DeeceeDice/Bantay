import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../geo/lat_lng.dart';

/// Web Mercator projection and viewport maths for [BantayMap].
///
/// This is the same scheme every slippy-map tile server uses (OSM, Google,
/// Mapbox): the world is a square of `256 * 2^zoom` pixels, with latitude
/// clamped to +/-85.05113 degrees where the projection diverges.
///
/// Keeping the projection in its own class with no Flutter dependencies
/// beyond [Offset] makes it directly unit-testable, which matters because
/// gesture maths is impossible to eyeball on a headless build.
@immutable
class MapCamera {
  const MapCamera({
    required this.center,
    required this.zoom,
    required this.size,
  });

  /// Geographic point at the middle of the viewport.
  final LatLng center;

  /// Fractional zoom level. 0 is the whole world in one 256px tile.
  final double zoom;

  /// Viewport size in logical pixels.
  final Size size;

  static const double minZoom = 3;
  static const double maxZoom = 19;
  static const double tileSize = 256;

  /// The latitude beyond which Web Mercator is undefined.
  static const double maxLatitude = 85.05112878;

  double get worldSize => tileSize * math.pow(2, zoom).toDouble();

  MapCamera copyWith({LatLng? center, double? zoom, Size? size}) => MapCamera(
    center: center ?? this.center,
    zoom: (zoom ?? this.zoom).clamp(minZoom, maxZoom),
    size: size ?? this.size,
  );

  // --- Projection ---------------------------------------------------------

  /// Projects a coordinate to absolute world pixels at [atZoom].
  static Offset projectWorld(LatLng point, double atZoom) {
    final double scale = tileSize * math.pow(2, atZoom).toDouble();
    final double lat = point.latitude
        .clamp(-maxLatitude, maxLatitude)
        .toDouble();
    final double latRad = lat * math.pi / 180.0;

    final double x = (point.longitude + 180.0) / 360.0 * scale;
    final double y =
        (1.0 - math.log(math.tan(latRad) + 1.0 / math.cos(latRad)) / math.pi) /
        2.0 *
        scale;
    return Offset(x, y);
  }

  /// Inverse of [projectWorld].
  static LatLng unprojectWorld(Offset world, double atZoom) {
    final double scale = tileSize * math.pow(2, atZoom).toDouble();
    final double lng = world.dx / scale * 360.0 - 180.0;
    final double n = math.pi - 2.0 * math.pi * world.dy / scale;
    final double lat =
        180.0 / math.pi * math.atan(0.5 * (math.exp(n) - math.exp(-n)));
    return LatLng(lat, lng);
  }

  // --- Viewport -----------------------------------------------------------

  Offset get _viewportCenter => Offset(size.width / 2, size.height / 2);

  /// World-pixel offset of the viewport's top-left corner.
  Offset get topLeftWorld => projectWorld(center, zoom) - _viewportCenter;

  /// Screen position of a geographic point inside this viewport.
  Offset toScreen(LatLng point) => projectWorld(point, zoom) - topLeftWorld;

  /// Geographic point under a screen position.
  LatLng toLatLng(Offset screen) => unprojectWorld(screen + topLeftWorld, zoom);

  /// True when a point falls inside the viewport, with [padding] slack so
  /// markers are not culled while part of them is still visible.
  bool isVisible(LatLng point, {double padding = 96}) {
    final Offset p = toScreen(point);
    return p.dx >= -padding &&
        p.dy >= -padding &&
        p.dx <= size.width + padding &&
        p.dy <= size.height + padding;
  }

  /// Returns the camera that puts [point] under [screen] at [atZoom].
  ///
  /// This is what keeps the spot under a pinch anchored while the zoom level
  /// changes around it.
  MapCamera anchored(LatLng point, Offset screen, double atZoom) {
    final double clamped = atZoom.clamp(minZoom, maxZoom).toDouble();
    final Offset world = projectWorld(point, clamped);
    final Offset newTopLeft = world - screen;
    final LatLng newCenter = unprojectWorld(
      newTopLeft + _viewportCenter,
      clamped,
    );
    return MapCamera(center: newCenter, zoom: clamped, size: size);
  }

  /// Pans by a screen-space delta.
  MapCamera panned(Offset delta) {
    final LatLng newCenter = unprojectWorld(
      projectWorld(center, zoom) - delta,
      zoom,
    );
    return copyWith(center: _clampCenter(newCenter));
  }

  /// A camera that frames every point in [points] with [padding] to spare.
  ///
  /// Falls back to the current camera when the list is empty, and to a fixed
  /// close zoom when every point is identical (a zero-size bounding box would
  /// otherwise produce an infinite zoom).
  MapCamera fitting(
    List<LatLng> points, {
    EdgeInsets padding = const EdgeInsets.all(64),
  }) {
    if (points.isEmpty) return this;
    if (points.length == 1) {
      return copyWith(center: points.first, zoom: 16);
    }

    double minLat = points.first.latitude, maxLat = points.first.latitude;
    double minLng = points.first.longitude, maxLng = points.first.longitude;
    for (final LatLng p in points) {
      minLat = math.min(minLat, p.latitude);
      maxLat = math.max(maxLat, p.latitude);
      minLng = math.min(minLng, p.longitude);
      maxLng = math.max(maxLng, p.longitude);
    }

    final LatLng mid = LatLng((minLat + maxLat) / 2, (minLng + maxLng) / 2);
    final double availableWidth = math.max(
      32.0,
      size.width - padding.horizontal,
    );
    final double availableHeight = math.max(
      32.0,
      size.height - padding.vertical,
    );

    // Find the largest zoom at which the bounds still fit the viewport.
    double best = minZoom;
    for (double z = maxZoom; z >= minZoom; z -= 0.25) {
      final Offset a = projectWorld(LatLng(maxLat, minLng), z);
      final Offset b = projectWorld(LatLng(minLat, maxLng), z);
      if ((b.dx - a.dx).abs() <= availableWidth &&
          (b.dy - a.dy).abs() <= availableHeight) {
        best = z;
        break;
      }
    }
    return MapCamera(center: mid, zoom: best, size: size);
  }

  /// Keeps the centre inside the projectable world so the map cannot be
  /// dragged off into undefined latitudes.
  static LatLng _clampCenter(LatLng center) => LatLng(
    center.latitude.clamp(-maxLatitude, maxLatitude).toDouble(),
    ((center.longitude + 180.0) % 360.0 + 360.0) % 360.0 - 180.0,
  );

  @override
  bool operator ==(Object other) =>
      other is MapCamera &&
      other.center == center &&
      other.zoom == zoom &&
      other.size == size;

  @override
  int get hashCode => Object.hash(center, zoom, size);
}
