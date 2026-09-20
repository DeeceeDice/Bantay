import 'package:bantay/core/geo/lat_lng.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Geo.distanceMeters', () {
    test('is zero for the same point', () {
      expect(
        Geo.distanceMeters(
          const LatLng(14.6, 121.0),
          const LatLng(14.6, 121.0),
        ),
        closeTo(0, 0.001),
      );
    });

    test('one degree of latitude is about 111 km', () {
      final double d = Geo.distanceMeters(
        const LatLng(0, 0),
        const LatLng(1, 0),
      );
      expect(d, closeTo(111319, 60));
    });

    test('is symmetric', () {
      const LatLng a = LatLng(14.6096, 120.9925);
      const LatLng b = LatLng(14.5960, 121.0010);
      expect(
        Geo.distanceMeters(a, b),
        closeTo(Geo.distanceMeters(b, a), 0.001),
      );
    });

    test('matches a known Manila distance', () {
      // Espana Blvd to Nagtahan Bridge is roughly 1.8 km as the crow flies.
      final double d = Geo.distanceMeters(
        const LatLng(14.6096, 120.9925),
        const LatLng(14.5960, 121.0010),
      );
      expect(d, greaterThan(1500));
      expect(d, lessThan(2200));
    });
  });

  group('Geo.bearingDegrees', () {
    test('due north is 0 and due east is 90', () {
      expect(
        Geo.bearingDegrees(const LatLng(0, 0), const LatLng(1, 0)),
        closeTo(0, 0.01),
      );
      expect(
        Geo.bearingDegrees(const LatLng(0, 0), const LatLng(0, 1)),
        closeTo(90, 0.01),
      );
    });
  });

  group('Geo.distanceToPathMeters', () {
    const List<LatLng> path = <LatLng>[
      LatLng(14.6000, 121.0000),
      LatLng(14.6100, 121.0000),
    ];

    test('a point on the path measures zero', () {
      expect(
        Geo.distanceToPathMeters(const LatLng(14.6050, 121.0000), path),
        closeTo(0, 1),
      );
    });

    test('measures perpendicular distance, not endpoint distance', () {
      // Beside the middle of the segment: far from both ends, close to line.
      const LatLng beside = LatLng(14.6050, 121.0009);
      final double toPath = Geo.distanceToPathMeters(beside, path);
      final double toNearestEnd = <double>[
        Geo.distanceMeters(beside, path.first),
        Geo.distanceMeters(beside, path.last),
      ].reduce((double a, double b) => a < b ? a : b);

      expect(toPath, lessThan(toNearestEnd));
      expect(toPath, closeTo(97, 12));
    });

    test('an empty path is infinitely far', () {
      expect(
        Geo.distanceToPathMeters(const LatLng(14.6, 121.0), <LatLng>[]),
        double.infinity,
      );
    });
  });

  group('Geo.interpolateAlongPath', () {
    const List<LatLng> path = <LatLng>[
      LatLng(14.6000, 121.0000),
      LatLng(14.6100, 121.0000),
    ];

    test('t=0 and t=1 return the endpoints', () {
      expect(
        Geo.interpolateAlongPath(path, 0).latitude,
        closeTo(14.6000, 1e-6),
      );
      expect(
        Geo.interpolateAlongPath(path, 1).latitude,
        closeTo(14.6100, 1e-6),
      );
    });

    test('t=0.5 lands halfway', () {
      expect(
        Geo.interpolateAlongPath(path, 0.5).latitude,
        closeTo(14.6050, 1e-4),
      );
    });

    test('clamps out-of-range values instead of extrapolating', () {
      expect(
        Geo.interpolateAlongPath(path, 2.5).latitude,
        closeTo(14.6100, 1e-6),
      );
      expect(
        Geo.interpolateAlongPath(path, -1).latitude,
        closeTo(14.6000, 1e-6),
      );
    });
  });

  group('Geo.offsetMeters', () {
    test('moves the requested distance north', () {
      const LatLng origin = LatLng(14.6, 121.0);
      final LatLng moved = Geo.offsetMeters(origin, 0, 500);
      expect(Geo.distanceMeters(origin, moved), closeTo(500, 3));
      expect(moved.latitude, greaterThan(origin.latitude));
    });

    test('moves the requested distance east', () {
      const LatLng origin = LatLng(14.6, 121.0);
      final LatLng moved = Geo.offsetMeters(origin, 500, 0);
      expect(Geo.distanceMeters(origin, moved), closeTo(500, 3));
      expect(moved.longitude, greaterThan(origin.longitude));
    });
  });

  group('Geo.formatDistance', () {
    test('uses metres below 1 km and kilometres above', () {
      expect(Geo.formatDistance(480), '480 m');
      expect(Geo.formatDistance(2400), '2.4 km');
      expect(Geo.formatDistance(24000), '24 km');
    });

    test('handles non-finite input without throwing', () {
      expect(Geo.formatDistance(double.infinity), '--');
      expect(Geo.formatDistance(double.nan), '--');
    });
  });
}
