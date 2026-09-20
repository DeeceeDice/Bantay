import 'package:flutter/widgets.dart';

import '../geo/lat_lng.dart';

/// A widget pinned to a geographic position on [BantayMap].
@immutable
class MapMarker {
  const MapMarker({
    required this.id,
    required this.point,
    required this.child,
    this.size = const Size(40, 48),
    this.anchor = MarkerAnchor.bottomCentre,
    this.onTap,
  });

  final String id;
  final LatLng point;
  final Widget child;
  final Size size;

  /// Which part of [child] sits on [point].
  final MarkerAnchor anchor;

  final VoidCallback? onTap;

  /// Offset from the marker's top-left to the anchored point.
  Offset get anchorOffset => switch (anchor) {
    MarkerAnchor.bottomCentre => Offset(size.width / 2, size.height),
    MarkerAnchor.centre => Offset(size.width / 2, size.height / 2),
  };
}

enum MarkerAnchor {
  /// For map pins, whose tip marks the spot.
  bottomCentre,

  /// For dots and circles, which are centred on the spot.
  centre,
}

/// A line drawn through a list of coordinates, e.g. a saved route.
@immutable
class MapPolyline {
  const MapPolyline({
    required this.points,
    required this.color,
    this.width = 6,
    this.borderColor,
    this.borderWidth = 2,
    this.dashed = false,
  });

  final List<LatLng> points;
  final Color color;
  final double width;

  /// Casing drawn under the line so it stays legible over busy map tiles.
  final Color? borderColor;
  final double borderWidth;

  final bool dashed;
}

/// A circle with a radius in real-world meters, e.g. the alert radius.
@immutable
class MapCircle {
  const MapCircle({
    required this.center,
    required this.radiusMeters,
    required this.color,
    this.borderColor,
    this.borderWidth = 2,
  });

  final LatLng center;
  final double radiusMeters;
  final Color color;
  final Color? borderColor;
  final double borderWidth;
}
