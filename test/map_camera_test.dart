import 'package:bantay/core/geo/lat_lng.dart';
import 'package:bantay/core/map/map_camera.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const Size viewport = Size(400, 800);

  group('MapCamera projection', () {
    test('null island sits at the centre of the world at zoom 0', () {
      final Offset world = MapCamera.projectWorld(const LatLng(0, 0), 0);
      expect(world.dx, closeTo(128, 0.001));
      expect(world.dy, closeTo(128, 0.001));
    });

    test('longitude maps across the full world width', () {
      expect(
        MapCamera.projectWorld(const LatLng(0, -180), 0).dx,
        closeTo(0, 0.001),
      );
      expect(
        MapCamera.projectWorld(const LatLng(0, 180), 0).dx,
        closeTo(256, 0.001),
      );
    });

    test('the Mercator latitude limit maps to the top of the world', () {
      expect(
        MapCamera.projectWorld(const LatLng(MapCamera.maxLatitude, 0), 0).dy,
        closeTo(0, 0.01),
      );
    });

    test('world size doubles with each zoom level', () {
      const MapCamera c = MapCamera(
        center: LatLng(0, 0),
        zoom: 3,
        size: viewport,
      );
      expect(c.worldSize, 256 * 8);
    });

    test('project and unproject round-trip', () {
      const LatLng point = LatLng(14.6096, 120.9925);
      for (final double zoom in <double>[3, 8, 12.5, 16, 19]) {
        final LatLng back = MapCamera.unprojectWorld(
          MapCamera.projectWorld(point, zoom),
          zoom,
        );
        expect(back.latitude, closeTo(point.latitude, 1e-6));
        expect(back.longitude, closeTo(point.longitude, 1e-6));
      }
    });
  });

  group('MapCamera viewport', () {
    const MapCamera camera = MapCamera(
      center: LatLng(14.6096, 120.9925),
      zoom: 15,
      size: viewport,
    );

    test('the centre coordinate lands in the middle of the viewport', () {
      final Offset screen = camera.toScreen(camera.center);
      expect(screen.dx, closeTo(200, 0.001));
      expect(screen.dy, closeTo(400, 0.001));
    });

    test('toScreen and toLatLng round-trip', () {
      const Offset probe = Offset(310, 145);
      final Offset back = camera.toScreen(camera.toLatLng(probe));
      expect(back.dx, closeTo(probe.dx, 0.001));
      expect(back.dy, closeTo(probe.dy, 0.001));
    });

    test('north is up and east is right', () {
      final Offset north = camera.toScreen(
        LatLng(camera.center.latitude + 0.01, camera.center.longitude),
      );
      final Offset east = camera.toScreen(
        LatLng(camera.center.latitude, camera.center.longitude + 0.01),
      );
      expect(north.dy, lessThan(400));
      expect(east.dx, greaterThan(200));
    });

    test('panning right moves the map west', () {
      final MapCamera panned = camera.panned(const Offset(120, 0));
      expect(panned.center.longitude, lessThan(camera.center.longitude));
    });

    test('offscreen points are culled, onscreen ones are kept', () {
      expect(camera.isVisible(camera.center), isTrue);
      expect(camera.isVisible(const LatLng(0, 0)), isFalse);
    });
  });

  group('MapCamera.anchored', () {
    test('keeps the anchored coordinate under the same screen point', () {
      const MapCamera camera = MapCamera(
        center: LatLng(14.6096, 120.9925),
        zoom: 14,
        size: viewport,
      );
      const Offset focal = Offset(280, 220);
      final LatLng under = camera.toLatLng(focal);

      // This is what a pinch gesture does: zoom in around the focal point.
      final MapCamera zoomed = camera.anchored(under, focal, 16.5);

      expect(zoomed.zoom, 16.5);
      final Offset after = zoomed.toScreen(under);
      expect(after.dx, closeTo(focal.dx, 0.01));
      expect(after.dy, closeTo(focal.dy, 0.01));
    });

    test('clamps zoom to the supported range', () {
      const MapCamera camera = MapCamera(
        center: LatLng(14.6, 121.0),
        zoom: 14,
        size: viewport,
      );
      expect(
        camera.anchored(camera.center, const Offset(1, 1), 99).zoom,
        MapCamera.maxZoom,
      );
      expect(
        camera.anchored(camera.center, const Offset(1, 1), -5).zoom,
        MapCamera.minZoom,
      );
    });
  });

  group('MapCamera.fitting', () {
    const MapCamera camera = MapCamera(
      center: LatLng(0, 0),
      zoom: 10,
      size: viewport,
    );

    test('frames every supplied point', () {
      const List<LatLng> points = <LatLng>[
        LatLng(14.6138, 120.9895),
        LatLng(14.5960, 121.0010),
        LatLng(14.6250, 120.9830),
      ];
      final MapCamera fitted = camera.fitting(points);
      for (final LatLng p in points) {
        expect(
          fitted.isVisible(p, padding: 0),
          isTrue,
          reason: '$p should be framed',
        );
      }
    });

    test('a single point does not produce an infinite zoom', () {
      final MapCamera fitted = camera.fitting(<LatLng>[
        const LatLng(14.6, 121.0),
      ]);
      expect(fitted.zoom, 16);
      expect(fitted.center, const LatLng(14.6, 121.0));
    });

    test('an empty list leaves the camera untouched', () {
      expect(camera.fitting(<LatLng>[]), camera);
    });
  });
}
