import 'dart:math' as math;
import 'dart:ui' show PathMetric;

import 'package:flutter/material.dart';

import '../geo/lat_lng.dart';
import 'map_camera.dart';
import 'map_layers.dart';
import 'map_tile_source.dart';

/// Drives a [BantayMap] from outside the widget.
///
/// Holds the camera's centre and zoom but not its size: the widget measures
/// itself and reports its viewport back, which keeps the controller usable
/// before the first layout pass (e.g. when a screen wants to frame a route
/// in `initState`).
class BantayMapController extends ChangeNotifier {
  BantayMapController({required LatLng center, double zoom = 15})
    : this._(center, zoom);

  BantayMapController._(this._center, this._zoom);

  LatLng _center;
  double _zoom;
  Size _viewport = Size.zero;
  List<LatLng>? _pendingFit;
  EdgeInsets _pendingFitPadding = const EdgeInsets.all(64);

  LatLng get center => _center;
  double get zoom => _zoom;
  Size get viewport => _viewport;

  MapCamera get camera =>
      MapCamera(center: _center, zoom: _zoom, size: _viewport);

  /// Moves the camera. [zoom] keeps its current value when omitted.
  void moveTo(LatLng center, {double? zoom}) {
    _center = center;
    if (zoom != null) _zoom = zoom.clamp(MapCamera.minZoom, MapCamera.maxZoom);
    _pendingFit = null;
    notifyListeners();
  }

  void zoomBy(double delta) {
    _zoom = (_zoom + delta).clamp(MapCamera.minZoom, MapCamera.maxZoom);
    notifyListeners();
  }

  /// Frames every point. Deferred until the widget has been laid out if the
  /// viewport is not known yet.
  void fitPoints(
    List<LatLng> points, {
    EdgeInsets padding = const EdgeInsets.all(64),
  }) {
    if (points.isEmpty) return;
    if (_viewport == Size.zero) {
      _pendingFit = points;
      _pendingFitPadding = padding;
      return;
    }
    final MapCamera fitted = camera.fitting(points, padding: padding);
    _center = fitted.center;
    _zoom = fitted.zoom;
    _pendingFit = null;
    notifyListeners();
  }

  /// Called by the widget on layout. Does not notify, because it runs during
  /// build; any deferred fit is applied on the next frame instead.
  void _attachViewport(Size size) {
    if (_viewport == size) return;
    _viewport = size;
    final List<LatLng>? pending = _pendingFit;
    if (pending != null) {
      final MapCamera fitted = camera.fitting(
        pending,
        padding: _pendingFitPadding,
      );
      _center = fitted.center;
      _zoom = fitted.zoom;
      _pendingFit = null;
    }
  }

  void _applyCamera(MapCamera next) {
    _center = next.center;
    _zoom = next.zoom;
    notifyListeners();
  }
}

/// An interactive slippy map.
///
/// Bantay draws its own map rather than embedding a vendor SDK so that the
/// app has no API key requirement, no per-view billing, and identical
/// behaviour on Android, iOS and web. It supports drag to pan, pinch and
/// double-tap to zoom, and renders marker, polyline and circle layers.
class BantayMap extends StatefulWidget {
  const BantayMap({
    super.key,
    required this.controller,
    this.markers = const <MapMarker>[],
    this.polylines = const <MapPolyline>[],
    this.circles = const <MapCircle>[],
    this.tileSource = MapTileSource.openStreetMap,
    this.onTap,
    this.onLongPress,
    this.onCameraChanged,
    this.interactive = true,
    this.showAttribution = true,
    this.dimTiles = false,
  });

  final BantayMapController controller;
  final List<MapMarker> markers;
  final List<MapPolyline> polylines;
  final List<MapCircle> circles;
  final MapTileSource tileSource;

  final void Function(LatLng point)? onTap;
  final void Function(LatLng point)? onLongPress;
  final void Function(MapCamera camera)? onCameraChanged;

  final bool interactive;
  final bool showAttribution;

  /// Fades the tiles back so overlaid pins and sheets stay dominant.
  final bool dimTiles;

  @override
  State<BantayMap> createState() => _BantayMapState();
}

class _BantayMapState extends State<BantayMap> {
  // Gesture anchors, captured at the start of each scale gesture.
  LatLng? _gestureAnchor;
  double _gestureStartZoom = 15;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onControllerChanged);
  }

  @override
  void didUpdateWidget(BantayMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_onControllerChanged);
      widget.controller.addListener(_onControllerChanged);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onControllerChanged);
    super.dispose();
  }

  void _onControllerChanged() {
    if (!mounted) return;
    setState(() {});
    widget.onCameraChanged?.call(widget.controller.camera);
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final Size size = Size(constraints.maxWidth, constraints.maxHeight);
        widget.controller._attachViewport(size);
        final MapCamera camera = widget.controller.camera;

        final Widget map = ClipRect(
          child: Stack(
            fit: StackFit.expand,
            children: <Widget>[
              _TileLayer(
                camera: camera,
                source: widget.tileSource,
                dim: widget.dimTiles,
              ),
              if (widget.circles.isNotEmpty || widget.polylines.isNotEmpty)
                IgnorePointer(
                  child: CustomPaint(
                    size: size,
                    painter: _VectorLayerPainter(
                      camera: camera,
                      polylines: widget.polylines,
                      circles: widget.circles,
                    ),
                  ),
                ),
              ..._buildMarkers(camera),
              if (widget.showAttribution)
                Positioned(
                  right: 4,
                  bottom: 2,
                  child: _AttributionChip(text: widget.tileSource.attribution),
                ),
            ],
          ),
        );

        if (!widget.interactive) return map;

        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapUp: widget.onTap == null
              ? null
              : (TapUpDetails d) =>
                    widget.onTap!(camera.toLatLng(d.localPosition)),
          onLongPressStart: widget.onLongPress == null
              ? null
              : (LongPressStartDetails d) =>
                    widget.onLongPress!(camera.toLatLng(d.localPosition)),
          onDoubleTapDown: (TapDownDetails d) {
            // Zoom in one level around the tapped point.
            final LatLng under = camera.toLatLng(d.localPosition);
            widget.controller._applyCamera(
              camera.anchored(under, d.localPosition, camera.zoom + 1),
            );
          },
          // onDoubleTap must be present for onDoubleTapDown to fire.
          onDoubleTap: () {},
          onScaleStart: (ScaleStartDetails d) {
            _gestureAnchor = camera.toLatLng(d.localFocalPoint);
            _gestureStartZoom = camera.zoom;
          },
          onScaleUpdate: (ScaleUpdateDetails d) {
            final LatLng? anchor = _gestureAnchor;
            if (anchor == null) return;
            // A pinch reports scale; a one-finger drag reports scale == 1 and
            // only moves the focal point. Handling both through `anchored`
            // means pan and zoom compose correctly in a single gesture.
            final double targetZoom = d.scale == 1.0
                ? _gestureStartZoom
                : _gestureStartZoom + _log2(d.scale);
            widget.controller._applyCamera(
              camera.anchored(anchor, d.localFocalPoint, targetZoom),
            );
          },
          onScaleEnd: (ScaleEndDetails d) => _gestureAnchor = null,
          child: map,
        );
      },
    );
  }

  List<Widget> _buildMarkers(MapCamera camera) {
    final List<Widget> built = <Widget>[];
    for (final MapMarker marker in widget.markers) {
      if (!camera.isVisible(
        marker.point,
        padding: math.max(marker.size.width, marker.size.height),
      )) {
        continue;
      }
      final Offset screen = camera.toScreen(marker.point) - marker.anchorOffset;
      built.add(
        Positioned(
          left: screen.dx,
          top: screen.dy,
          width: marker.size.width,
          height: marker.size.height,
          child: marker.onTap == null
              ? IgnorePointer(child: marker.child)
              : GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: marker.onTap,
                  child: marker.child,
                ),
        ),
      );
    }
    return built;
  }

  static double _log2(double x) => math.log(x) / math.ln2;
}

/// Renders the visible raster tiles for the current camera.
class _TileLayer extends StatelessWidget {
  const _TileLayer({
    required this.camera,
    required this.source,
    required this.dim,
  });

  final MapCamera camera;
  final MapTileSource source;
  final bool dim;

  @override
  Widget build(BuildContext context) {
    if (camera.size.isEmpty) return const SizedBox.shrink();

    // Render whole tiles from the nearest integer zoom and scale them to the
    // fractional zoom, which is what every slippy map does during a pinch.
    final int z = camera.zoom
        .floor()
        .clamp(source.minZoom, source.maxZoom)
        .toInt();
    final double scale = math.pow(2, camera.zoom - z).toDouble();
    final double tileScreenSize = MapCamera.tileSize * scale;
    final int tileCount = 1 << z;

    // Viewport top-left expressed in zoom-z world pixels.
    final Offset topLeftAtZ = camera.topLeftWorld / scale;

    final int firstX = (topLeftAtZ.dx / MapCamera.tileSize).floor();
    final int firstY = (topLeftAtZ.dy / MapCamera.tileSize).floor();
    final int lastX =
        ((topLeftAtZ.dx + camera.size.width / scale) / MapCamera.tileSize)
            .floor();
    final int lastY =
        ((topLeftAtZ.dy + camera.size.height / scale) / MapCamera.tileSize)
            .floor();

    final List<Widget> tiles = <Widget>[];
    for (int y = firstY; y <= lastY; y++) {
      // Rows outside the world have no tiles; columns wrap around instead.
      if (y < 0 || y >= tileCount) continue;
      for (int x = firstX; x <= lastX; x++) {
        final int wrappedX = ((x % tileCount) + tileCount) % tileCount;
        final double left = (x * MapCamera.tileSize - topLeftAtZ.dx) * scale;
        final double top = (y * MapCamera.tileSize - topLeftAtZ.dy) * scale;

        tiles.add(
          Positioned(
            key: ValueKey<String>('$z/$wrappedX/$y'),
            left: left,
            top: top,
            // A hairline of overlap hides the seams that rounding would
            // otherwise leave between adjacent tiles.
            width: tileScreenSize + 1,
            height: tileScreenSize + 1,
            child: _MapTile(
              url: source.urlFor(wrappedX, y, z),
              headers: source.headers,
            ),
          ),
        );
      }
    }

    return Stack(
      fit: StackFit.expand,
      children: <Widget>[
        // Shows through before tiles land, and in the gaps beyond the poles.
        const ColoredBox(color: Color(0xFFE8EDF2)),
        ...tiles,
        if (dim)
          const IgnorePointer(child: ColoredBox(color: Color(0x14000000))),
      ],
    );
  }
}

class _MapTile extends StatelessWidget {
  const _MapTile({required this.url, required this.headers});

  final String url;
  final Map<String, String> headers;

  @override
  Widget build(BuildContext context) {
    return Image.network(
      url,
      fit: BoxFit.fill,
      headers: headers.isEmpty ? null : headers,
      // Keeps the previous tile on screen while a new one decodes, instead
      // of flashing empty.
      gaplessPlayback: true,
      filterQuality: FilterQuality.medium,
      errorBuilder: (BuildContext context, Object error, StackTrace? stack) =>
          const ColoredBox(color: Color(0xFFE8EDF2)),
      frameBuilder:
          (
            BuildContext context,
            Widget child,
            int? frame,
            bool wasSynchronouslyLoaded,
          ) {
            if (wasSynchronouslyLoaded || frame != null) return child;
            return const ColoredBox(color: Color(0xFFE8EDF2));
          },
    );
  }
}

/// Paints polylines and metre-radius circles in screen space.
class _VectorLayerPainter extends CustomPainter {
  const _VectorLayerPainter({
    required this.camera,
    required this.polylines,
    required this.circles,
  });

  final MapCamera camera;
  final List<MapPolyline> polylines;
  final List<MapCircle> circles;

  @override
  void paint(Canvas canvas, Size size) {
    for (final MapCircle circle in circles) {
      _paintCircle(canvas, circle);
    }
    for (final MapPolyline line in polylines) {
      _paintPolyline(canvas, line);
    }
  }

  void _paintCircle(Canvas canvas, MapCircle circle) {
    final Offset centre = camera.toScreen(circle.center);
    // Convert the real-world radius to pixels by projecting a point that far
    // east of the centre, so the circle scales correctly with latitude.
    final LatLng edge = Geo.offsetMeters(circle.center, circle.radiusMeters, 0);
    final double radius = (camera.toScreen(edge) - centre).distance;
    if (radius <= 0 || !radius.isFinite) return;

    canvas.drawCircle(centre, radius, Paint()..color = circle.color);
    final Color? border = circle.borderColor;
    if (border != null) {
      canvas.drawCircle(
        centre,
        radius,
        Paint()
          ..color = border
          ..style = PaintingStyle.stroke
          ..strokeWidth = circle.borderWidth,
      );
    }
  }

  void _paintPolyline(Canvas canvas, MapPolyline line) {
    if (line.points.length < 2) return;

    final Path path = Path();
    for (int i = 0; i < line.points.length; i++) {
      final Offset p = camera.toScreen(line.points[i]);
      if (i == 0) {
        path.moveTo(p.dx, p.dy);
      } else {
        path.lineTo(p.dx, p.dy);
      }
    }

    final Path drawn = line.dashed ? _dash(path, 14, 9) : path;

    final Color? border = line.borderColor;
    if (border != null) {
      canvas.drawPath(
        drawn,
        Paint()
          ..color = border
          ..style = PaintingStyle.stroke
          ..strokeWidth = line.width + line.borderWidth * 2
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round,
      );
    }
    canvas.drawPath(
      drawn,
      Paint()
        ..color = line.color
        ..style = PaintingStyle.stroke
        ..strokeWidth = line.width
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
  }

  /// Splits a path into dashes, used for the not-yet-travelled part of a route.
  static Path _dash(Path source, double dashLength, double gapLength) {
    final Path result = Path();
    for (final PathMetric metric in source.computeMetrics()) {
      double distance = 0;
      while (distance < metric.length) {
        final double end = math.min(distance + dashLength, metric.length);
        result.addPath(metric.extractPath(distance, end), Offset.zero);
        distance = end + gapLength;
      }
    }
    return result;
  }

  @override
  bool shouldRepaint(_VectorLayerPainter oldDelegate) =>
      oldDelegate.camera != camera ||
      oldDelegate.polylines != polylines ||
      oldDelegate.circles != circles;
}

class _AttributionChip extends StatelessWidget {
  const _AttributionChip({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.82),
        borderRadius: const BorderRadius.all(Radius.circular(4)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        child: Text(
          text,
          style: const TextStyle(fontSize: 9.5, color: Color(0xFF5A6472)),
        ),
      ),
    );
  }
}
