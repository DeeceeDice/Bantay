import 'package:bantay/core/geo/lat_lng.dart';
import 'package:bantay/data/local/local_store.dart';
import 'package:bantay/data/models/alert_item.dart';
import 'package:bantay/data/models/enums.dart';
import 'package:bantay/data/models/hazard_report.dart';
import 'package:bantay/data/models/safe_spot.dart';
import 'package:bantay/data/models/saved_route.dart';
import 'package:bantay/data/repositories/auth_repository.dart';
import 'package:bantay/data/repositories/bantay_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Builds a fresh, seeded repository pair backed by in-memory preferences.
Future<(BantayRepository, AuthRepository)> buildRepositories() async {
  SharedPreferences.setMockInitialValues(<String, Object>{});
  final LocalStore store = await LocalStore.open();
  final AuthRepository auth = AuthRepository(store);
  final BantayRepository repo = BantayRepository(store, auth);
  await auth.initialize();
  await repo.initialize();
  return (repo, auth);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('seeding', () {
    test(
      'a fresh install has hazards, safe spots, routes and alerts',
      () async {
        final (BantayRepository repo, _) = await buildRepositories();

        expect(repo.allReports, isNotEmpty);
        expect(repo.safeSpots, isNotEmpty);
        expect(repo.savedRoutes, isNotEmpty);
        expect(repo.alerts, isNotEmpty);
        expect(repo.verifiedHazards, isNotEmpty);
        expect(repo.pendingReports, isNotEmpty);
      },
    );

    test('seeding runs once, so user edits survive a restart', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final LocalStore store = await LocalStore.open();
      final AuthRepository auth = AuthRepository(store);

      final BantayRepository first = BantayRepository(store, auth);
      await first.initialize();
      final int seededCount = first.allReports.length;
      await first.deleteRoute(first.savedRoutes.first.id);

      // A second repository over the same store must not re-seed.
      final BantayRepository second = BantayRepository(store, auth);
      await second.initialize();

      expect(second.allReports.length, seededCount);
      expect(second.savedRoutes, isEmpty);
    });
  });

  group('the verification loop', () {
    test(
      'a submitted report is pending and hidden from the public map',
      () async {
        final (BantayRepository repo, AuthRepository auth) =
            await buildRepositories();
        await auth.signUp(
          name: 'Ramon Torres',
          email: 'ramon@example.com',
          password: 'password123',
        );

        final HazardReport report = await repo.submitReport(
          type: HazardType.floodedRoad,
          severity: HazardSeverity.notPassable,
          location: const LatLng(14.6096, 120.9925),
          addressLabel: 'Espana Blvd',
          description: 'Knee deep',
          photoPath: 'seed:flooded_road',
        );

        expect(report.status, ReportStatus.pending);
        expect(
          repo.pendingReports.map((HazardReport r) => r.id),
          contains(report.id),
        );
        expect(
          repo.verifiedHazards.map((HazardReport r) => r.id),
          isNot(contains(report.id)),
        );
        expect(auth.currentUser!.reportsSubmitted, 1);
      },
    );

    test(
      'verifying turns the report public and credits the reporter',
      () async {
        final (BantayRepository repo, AuthRepository auth) =
            await buildRepositories();
        await auth.signUp(
          name: 'Ramon Torres',
          email: 'ramon@example.com',
          password: 'password123',
        );

        final HazardReport report = await repo.submitReport(
          type: HazardType.floodedRoad,
          severity: HazardSeverity.notPassable,
          location: const LatLng(14.6096, 120.9925),
          addressLabel: 'Espana Blvd',
          description: '',
          photoPath: 'seed:flooded_road',
        );

        await repo.verifyReport(report.id);

        final HazardReport? after = repo.reportById(report.id);
        expect(after!.status, ReportStatus.verified);
        expect(after.verifiedAt, isNotNull);
        expect(
          repo.verifiedHazards.map((HazardReport r) => r.id),
          contains(report.id),
        );
        expect(
          repo.pendingReports.map((HazardReport r) => r.id),
          isNot(contains(report.id)),
        );
        expect(auth.currentUser!.reportsVerified, 1);
      },
    );

    test(
      'verifying publishes an alert that deep-links to the report',
      () async {
        final (BantayRepository repo, AuthRepository auth) =
            await buildRepositories();
        await auth.signUp(
          name: 'Official Cruz',
          email: 'official@example.com',
          password: 'password123',
        );
        await auth.selectRole(UserRole.barangayOfficial);

        final HazardReport pending = repo.pendingReports.first;
        final int alertsBefore = repo.alerts.length;

        await repo.verifyReport(pending.id);

        expect(repo.alerts.length, greaterThan(alertsBefore));
        final AlertItem newest = repo.alerts.first;
        expect(newest.reportId, pending.id);
        expect(
          repo.alerts.any((AlertItem a) => a.kind == AlertKind.verifiedHazard),
          isTrue,
        );
      },
    );

    test('rejecting removes the report from every public view', () async {
      final (BantayRepository repo, AuthRepository auth) =
          await buildRepositories();
      await auth.signUp(
        name: 'Official Cruz',
        email: 'official@example.com',
        password: 'password123',
      );
      await auth.selectRole(UserRole.barangayOfficial);

      final HazardReport pending = repo.pendingReports.first;
      await repo.rejectReport(pending.id);

      expect(repo.reportById(pending.id)!.status, ReportStatus.rejected);
      expect(
        repo.pendingReports.map((HazardReport r) => r.id),
        isNot(contains(pending.id)),
      );
      expect(
        repo.verifiedHazards.map((HazardReport r) => r.id),
        isNot(contains(pending.id)),
      );
    });

    test('an official only sees pending reports inside their area', () async {
      final (BantayRepository repo, AuthRepository auth) =
          await buildRepositories();
      await auth.signUp(
        name: 'Official Cruz',
        email: 'official@example.com',
        password: 'password123',
      );
      await auth.selectRole(UserRole.barangayOfficial);

      // Something far outside the default 3 km Sampaloc radius.
      await repo.submitReport(
        type: HazardType.landslide,
        severity: HazardSeverity.lifeThreatening,
        location: const LatLng(16.4023, 120.5960), // Baguio
        addressLabel: 'Far away',
        description: '',
        photoPath: 'seed:landslide',
      );

      final List<HazardReport> inArea = repo.pendingForOfficial(
        auth.currentUser!,
      );

      expect(inArea, isNotEmpty);
      expect(
        inArea.every(
          (HazardReport r) =>
              Geo.distanceMeters(auth.currentUser!.areaCenter, r.location) <=
              auth.currentUser!.areaRadiusMeters,
        ),
        isTrue,
      );
      expect(
        inArea.any((HazardReport r) => r.addressLabel == 'Far away'),
        isFalse,
      );
    });

    test('the pending queue is sorted most dangerous first', () async {
      final (BantayRepository repo, AuthRepository auth) =
          await buildRepositories();
      await auth.signUp(
        name: 'Official Cruz',
        email: 'official@example.com',
        password: 'password123',
      );
      await auth.selectRole(UserRole.barangayOfficial);

      final List<HazardReport> queue = repo.pendingForOfficial(
        auth.currentUser!,
      );

      for (int i = 0; i < queue.length - 1; i++) {
        expect(
          queue[i].severity.rank,
          greaterThanOrEqualTo(queue[i + 1].severity.rank),
        );
      }
    });
  });

  group('community confirmation voting', () {
    test('a yes vote increments the confirm counter', () async {
      final (BantayRepository repo, _) = await buildRepositories();
      final HazardReport target = repo.verifiedHazards.first;
      final int before = target.confirmCount;

      await repo.voteOnReport(
        reportId: target.id,
        userId: 'user-1',
        confirms: true,
      );

      expect(repo.reportById(target.id)!.confirmCount, before + 1);
    });

    test('a no vote increments the deny counter instead', () async {
      final (BantayRepository repo, _) = await buildRepositories();
      final HazardReport target = repo.verifiedHazards.first;
      final int confirmsBefore = target.confirmCount;
      final int deniesBefore = target.denyCount;

      await repo.voteOnReport(
        reportId: target.id,
        userId: 'user-1',
        confirms: false,
      );

      final HazardReport after = repo.reportById(target.id)!;
      expect(after.denyCount, deniesBefore + 1);
      expect(after.confirmCount, confirmsBefore);
    });

    test('the same user cannot vote twice', () async {
      final (BantayRepository repo, _) = await buildRepositories();
      final HazardReport target = repo.verifiedHazards.first;
      final int before = target.confirmCount;

      await repo.voteOnReport(
        reportId: target.id,
        userId: 'user-1',
        confirms: true,
      );
      await repo.voteOnReport(
        reportId: target.id,
        userId: 'user-1',
        confirms: true,
      );
      await repo.voteOnReport(
        reportId: target.id,
        userId: 'user-1',
        confirms: false,
      );

      expect(repo.reportById(target.id)!.confirmCount, before + 1);
      expect(repo.reportById(target.id)!.denyCount, target.denyCount);
    });

    test('flagging is also one per user', () async {
      final (BantayRepository repo, _) = await buildRepositories();
      final HazardReport target = repo.verifiedHazards.first;

      await repo.flagReport(reportId: target.id, userId: 'user-1');
      await repo.flagReport(reportId: target.id, userId: 'user-1');
      await repo.flagReport(reportId: target.id, userId: 'user-2');

      expect(repo.reportById(target.id)!.flagCount, target.flagCount + 2);
    });
  });

  group('"Am I Safe Here?"', () {
    test('reports safe when no verified hazard is within the radius', () async {
      final (BantayRepository repo, _) = await buildRepositories();

      // Baguio: nowhere near the seeded Manila hazards.
      final SafetyCheckResult result = repo.checkSafety(
        const LatLng(16.4023, 120.5960),
        2000,
      );

      expect(result.isSafe, isTrue);
      expect(result.hazards, isEmpty);
      expect(result.nearest, isNull);
    });

    test('reports unsafe and names the nearest hazard', () async {
      final (BantayRepository repo, _) = await buildRepositories();
      final HazardReport known = repo.verifiedHazards.first;

      final SafetyCheckResult result = repo.checkSafety(known.location, 500);

      expect(result.isSafe, isFalse);
      expect(result.nearest, isNotNull);
      expect(result.nearestDistanceMeters, lessThan(500));
      expect(result.worstSeverity, isNotNull);
    });

    test('ignores pending reports, which are not yet trustworthy', () async {
      final (BantayRepository repo, AuthRepository auth) =
          await buildRepositories();
      await auth.signUp(
        name: 'Ramon Torres',
        email: 'ramon@example.com',
        password: 'password123',
      );

      const LatLng remote = LatLng(16.4023, 120.5960);
      await repo.submitReport(
        type: HazardType.landslide,
        severity: HazardSeverity.lifeThreatening,
        location: remote,
        addressLabel: 'Baguio',
        description: '',
        photoPath: 'seed:landslide',
      );

      expect(repo.checkSafety(remote, 1000).isSafe, isTrue);
    });
  });

  group('saved route status', () {
    test('a route with no hazards near it reads as clear', () async {
      final (BantayRepository repo, _) = await buildRepositories();

      final SavedRoute remote = await repo.addRoute(
        label: 'Baguio loop',
        start: const LatLng(16.4023, 120.5960),
        startLabel: 'A',
        end: const LatLng(16.4100, 120.6000),
        endLabel: 'B',
      );

      expect(repo.statusForRoute(remote).isClear, isTrue);
      expect(repo.statusForRoute(remote).hazardCount, 0);
    });

    test('a hazard on the path is counted against the route', () async {
      final (BantayRepository repo, AuthRepository auth) =
          await buildRepositories();
      await auth.signUp(
        name: 'Official Cruz',
        email: 'official@example.com',
        password: 'password123',
      );
      await auth.selectRole(UserRole.barangayOfficial);

      final HazardReport hazard = repo.verifiedHazards.first;
      // A route that passes directly through a known verified hazard.
      final SavedRoute through = await repo.addRoute(
        label: 'Through the flood',
        start: Geo.offsetMeters(hazard.location, 0, -400),
        startLabel: 'South',
        end: Geo.offsetMeters(hazard.location, 0, 400),
        endLabel: 'North',
      );

      final RouteStatus status = repo.statusForRoute(through);
      expect(status.isClear, isFalse);
      expect(status.hazardCount, greaterThanOrEqualTo(1));
      expect(status.worstSeverity, isNotNull);
    });

    test('submitting a hazard on a saved route raises a route alert', () async {
      final (BantayRepository repo, AuthRepository auth) =
          await buildRepositories();
      await auth.signUp(
        name: 'Ramon Torres',
        email: 'ramon@example.com',
        password: 'password123',
      );

      final SavedRoute route = repo.savedRoutes.first;
      final int before = repo.alerts.length;

      await repo.submitReport(
        type: HazardType.floodedRoad,
        severity: HazardSeverity.notPassable,
        location: route.path[1],
        addressLabel: 'On the route',
        description: '',
        photoPath: 'seed:flooded_road',
      );

      expect(repo.alerts.length, before + 1);
      expect(repo.alerts.first.kind, AlertKind.routeStatus);
      expect(repo.alerts.first.onSavedRoute, isTrue);
      expect(repo.alerts.first.routeId, route.id);
    });

    test('a deleted route can be restored at its original position', () async {
      final (BantayRepository repo, _) = await buildRepositories();
      await repo.addRoute(
        label: 'Second',
        start: const LatLng(14.60, 121.00),
        startLabel: 'A',
        end: const LatLng(14.61, 121.00),
        endLabel: 'B',
      );

      final SavedRoute first = repo.savedRoutes.first;
      await repo.deleteRoute(first.id);
      expect(
        repo.savedRoutes.map((SavedRoute r) => r.id),
        isNot(contains(first.id)),
      );

      await repo.restoreRoute(first, atIndex: 0);
      expect(repo.savedRoutes.first.id, first.id);
    });
  });

  group('alerts', () {
    test('are ordered newest first without mutating stored state', () async {
      final (BantayRepository repo, _) = await buildRepositories();

      final List<AlertItem> first = repo.alerts;
      final List<AlertItem> second = repo.alerts;

      for (int i = 0; i < first.length - 1; i++) {
        expect(
          first[i].createdAt.isAfter(first[i + 1].createdAt) ||
              first[i].createdAt.isAtSameMomentAs(first[i + 1].createdAt),
          isTrue,
        );
      }
      // Reading twice must produce the same order.
      expect(
        first.map((AlertItem a) => a.id).toList(),
        second.map((AlertItem a) => a.id).toList(),
      );
    });

    test('mark all read clears the unread badge', () async {
      final (BantayRepository repo, _) = await buildRepositories();
      expect(repo.unreadAlertCount, greaterThan(0));

      await repo.markAllAlertsRead();

      expect(repo.unreadAlertCount, 0);
    });
  });

  group('safe spot subscriptions', () {
    test('toggle on and off, and persist', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final LocalStore store = await LocalStore.open();
      final AuthRepository auth = AuthRepository(store);
      final BantayRepository repo = BantayRepository(store, auth);
      await repo.initialize();

      final String spotId = repo.safeSpots.first.id;
      expect(repo.isSubscribed(spotId), isFalse);

      await repo.toggleSubscription(spotId);
      expect(repo.isSubscribed(spotId), isTrue);

      final BantayRepository reopened = BantayRepository(store, auth);
      await reopened.initialize();
      expect(reopened.isSubscribed(spotId), isTrue);

      await reopened.toggleSubscription(spotId);
      expect(reopened.isSubscribed(spotId), isFalse);
    });

    test('safe spots are returned nearest first', () async {
      final (BantayRepository repo, _) = await buildRepositories();
      const LatLng origin = LatLng(14.6096, 120.9925);

      final List<double> distances = repo
          .safeSpotsNear(origin)
          .map((SafeSpot spot) => Geo.distanceMeters(origin, spot.location))
          .toList();

      for (int i = 0; i < distances.length - 1; i++) {
        expect(distances[i], lessThanOrEqualTo(distances[i + 1]));
      }
    });
  });
}
