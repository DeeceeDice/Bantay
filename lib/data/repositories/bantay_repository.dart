import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../../core/geo/lat_lng.dart';
import '../local/local_store.dart';
import '../models/alert_item.dart';
import '../models/enums.dart';
import '../models/hazard_report.dart';
import '../models/safe_spot.dart';
import '../models/saved_route.dart';
import '../models/user_profile.dart';
import '../seed/seed_data.dart';
import 'auth_repository.dart';

/// Live status of one saved route.
class RouteStatus {
  const RouteStatus({
    required this.hazardCount,
    required this.worstSeverity,
    required this.hazards,
  });

  final int hazardCount;
  final HazardSeverity? worstSeverity;
  final List<HazardReport> hazards;

  bool get isClear => hazardCount == 0;
}

/// Outcome of the "Am I Safe Here?" check.
class SafetyCheckResult {
  const SafetyCheckResult({
    required this.isSafe,
    required this.hazards,
    this.nearest,
    this.nearestDistanceMeters,
  });

  final bool isSafe;
  final List<HazardReport> hazards;
  final HazardReport? nearest;
  final double? nearestDistanceMeters;

  /// Worst severity within the radius, used to colour the status banner.
  HazardSeverity? get worstSeverity {
    if (hazards.isEmpty) return null;
    return hazards
        .map((HazardReport h) => h.severity)
        .reduce(
          (HazardSeverity a, HazardSeverity b) => a.rank >= b.rank ? a : b,
        );
  }
}

/// The app's single source of domain truth.
///
/// Every screen reads from this one object, so a report submitted on the
/// report flow is immediately visible on the map, in the verification panel,
/// in the alerts feed and in the profile stats without any manual plumbing.
/// All mutations persist through [LocalStore] before notifying listeners.
class BantayRepository extends ChangeNotifier {
  BantayRepository(this._store, this._auth);

  final LocalStore _store;
  final AuthRepository _auth;
  static const Uuid _uuid = Uuid();

  /// How close a hazard must be to a saved route to count against it.
  static const double routeHazardThresholdMeters = 120;

  List<HazardReport> _reports = <HazardReport>[];
  List<SafeSpot> _safeSpots = <SafeSpot>[];
  List<SavedRoute> _routes = <SavedRoute>[];
  List<AlertItem> _alerts = <AlertItem>[];
  Set<String> _subscribedSpotIds = <String>{};

  // --- Public views (unmodifiable so callers cannot mutate state directly) --

  List<HazardReport> get allReports =>
      List<HazardReport>.unmodifiable(_reports);

  /// Hazards everyone can see: verified only.
  List<HazardReport> get verifiedHazards => List<HazardReport>.unmodifiable(
    _reports.where((HazardReport r) => r.status == ReportStatus.verified),
  );

  /// Pending reports awaiting an official's decision.
  List<HazardReport> get pendingReports => List<HazardReport>.unmodifiable(
    _reports.where((HazardReport r) => r.status == ReportStatus.pending),
  );

  List<SafeSpot> get safeSpots => List<SafeSpot>.unmodifiable(_safeSpots);
  List<SavedRoute> get savedRoutes => List<SavedRoute>.unmodifiable(_routes);

  /// Alerts newest first. Sorts a copy so reading never mutates state.
  List<AlertItem> get alerts {
    final List<AlertItem> sorted = List<AlertItem>.from(_alerts)
      ..sort((AlertItem a, AlertItem b) => b.createdAt.compareTo(a.createdAt));
    return List<AlertItem>.unmodifiable(sorted);
  }

  int get unreadAlertCount => _alerts.where((AlertItem a) => !a.isRead).length;

  Set<String> get subscribedSpotIds =>
      Set<String>.unmodifiable(_subscribedSpotIds);

  bool isSubscribed(String spotId) => _subscribedSpotIds.contains(spotId);

  /// Reports filed by the signed-in user, newest first.
  List<HazardReport> myReports(String userId) =>
      _reports.where((HazardReport r) => r.reporterId == userId).toList()..sort(
        (HazardReport a, HazardReport b) =>
            b.reportedAt.compareTo(a.reportedAt),
      );

  // --- Lifecycle ----------------------------------------------------------

  Future<void> initialize() async {
    if (!_store.readBool(StoreKeys.seeded)) {
      await _writeSeedData();
      await _store.writeBool(StoreKeys.seeded, true);
    }
    _reports = _store
        .readCollection(StoreKeys.reports)
        .map(HazardReport.fromJson)
        .toList();
    _safeSpots = _store
        .readCollection(StoreKeys.safeSpots)
        .map(SafeSpot.fromJson)
        .toList();
    _routes = _store
        .readCollection(StoreKeys.routes)
        .map(SavedRoute.fromJson)
        .toList();
    _alerts = _store
        .readCollection(StoreKeys.alerts)
        .map(AlertItem.fromJson)
        .toList();
    _subscribedSpotIds = _store
        .readStringList(StoreKeys.subscribedSpots)
        .toSet();
    notifyListeners();
  }

  Future<void> _writeSeedData() async {
    final DateTime now = DateTime.now();
    await _store.writeCollection(
      StoreKeys.reports,
      SeedData.reports(now).map((HazardReport r) => r.toJson()).toList(),
    );
    await _store.writeCollection(
      StoreKeys.safeSpots,
      SeedData.safeSpots(now).map((SafeSpot s) => s.toJson()).toList(),
    );
    await _store.writeCollection(
      StoreKeys.routes,
      SeedData.routes(now).map((SavedRoute r) => r.toJson()).toList(),
    );
    await _store.writeCollection(
      StoreKeys.alerts,
      SeedData.alerts(now).map((AlertItem a) => a.toJson()).toList(),
    );
  }

  /// Restores the bundled demo content. Offered in Help & Support.
  Future<void> resetToSeedData() async {
    await _writeSeedData();
    await _store.writeStringList(StoreKeys.subscribedSpots, <String>[]);
    await initialize();
  }

  // --- Reports ------------------------------------------------------------

  /// Files a new community report. It enters as [ReportStatus.pending] and
  /// shows on the map as an orange pin until an official acts on it.
  Future<HazardReport> submitReport({
    required HazardType type,
    required HazardSeverity severity,
    required LatLng location,
    required String addressLabel,
    required String description,
    required String? photoPath,
  }) async {
    final UserProfile? user = _auth.currentUser;
    final HazardReport report = HazardReport(
      id: _uuid.v4(),
      type: type,
      severity: severity,
      status: ReportStatus.pending,
      location: location,
      addressLabel: addressLabel,
      reportedAt: DateTime.now(),
      reporterId: user?.id ?? 'anonymous',
      reporterName: user?.name ?? 'Anonymous',
      description: description,
      photoPath: photoPath,
    );

    _reports = <HazardReport>[..._reports, report];
    await _persistReports();

    if (user != null) {
      await _auth.updateProfile(
        user.copyWith(reportsSubmitted: user.reportsSubmitted + 1),
      );
    }

    // A hazard on a saved route is worth telling the user about right away,
    // even before it is verified.
    for (final SavedRoute route in _routes) {
      if (Geo.distanceToPathMeters(location, route.path) <=
          routeHazardThresholdMeters) {
        await _addAlert(
          AlertItem(
            id: _uuid.v4(),
            kind: AlertKind.routeStatus,
            title: 'New report on "${route.label}"',
            body:
                'A hazard was reported near $addressLabel, on your saved route. '
                'It is pending verification.',
            createdAt: DateTime.now(),
            routeId: route.id,
            reportId: report.id,
            onSavedRoute: true,
          ),
        );
        break;
      }
    }

    notifyListeners();
    return report;
  }

  /// Community confirmation voting ("Still flooded? Yes / No").
  ///
  /// One vote per user per report; voting again is a no-op so the counter
  /// cannot be inflated by tapping repeatedly.
  Future<void> voteOnReport({
    required String reportId,
    required String userId,
    required bool confirms,
  }) async {
    final int i = _reports.indexWhere((HazardReport r) => r.id == reportId);
    if (i < 0) return;
    final HazardReport report = _reports[i];
    if (report.hasVoted(userId)) return;

    _reports[i] = report.copyWith(
      confirmCount: confirms ? report.confirmCount + 1 : report.confirmCount,
      denyCount: confirms ? report.denyCount : report.denyCount + 1,
      votedUserIds: <String>[...report.votedUserIds, userId],
    );
    await _persistReports();
    notifyListeners();
  }

  /// "Report Inaccurate" flagging.
  Future<void> flagReport({
    required String reportId,
    required String userId,
  }) async {
    final int i = _reports.indexWhere((HazardReport r) => r.id == reportId);
    if (i < 0) return;
    final HazardReport report = _reports[i];
    if (report.hasFlagged(userId)) return;

    _reports[i] = report.copyWith(
      flagCount: report.flagCount + 1,
      flaggedUserIds: <String>[...report.flaggedUserIds, userId],
    );
    await _persistReports();
    notifyListeners();
  }

  /// Official action: the pin turns red and becomes visible to everyone.
  Future<void> verifyReport(String reportId) async {
    final int i = _reports.indexWhere((HazardReport r) => r.id == reportId);
    if (i < 0) return;
    final HazardReport report = _reports[i];
    final UserProfile? official = _auth.currentUser;

    _reports[i] = report.copyWith(
      status: ReportStatus.verified,
      verifiedBy: official == null
          ? 'Barangay Official'
          : '${official.name} - ${official.barangay}',
      verifiedAt: DateTime.now(),
    );
    await _persistReports();

    await _addAlert(
      AlertItem(
        id: _uuid.v4(),
        kind: AlertKind.verifiedHazard,
        title:
            'Verified: ${_hazardLabel(report.type)} at ${report.addressLabel}',
        body:
            'This hazard has been confirmed by an official and is now '
            'visible to everyone nearby.',
        createdAt: DateTime.now(),
        reportId: report.id,
        onSavedRoute: _isOnAnySavedRoute(report.location),
      ),
    );

    // Tell the reporter their own report went through, and credit their stats.
    if (official == null || report.reporterId != official.id) {
      await _addAlert(
        AlertItem(
          id: _uuid.v4(),
          kind: AlertKind.reportVerified,
          title: 'Your report was verified',
          body:
              'Your report at ${report.addressLabel} was verified and is now '
              'live on the map. Thank you for keeping the community safe.',
          createdAt: DateTime.now(),
          reportId: report.id,
        ),
      );
    }

    await _creditReporter(report.reporterId, verified: true);
    await _creditOfficial(official);
    notifyListeners();
  }

  /// Official action: the report is dismissed and disappears from the map.
  Future<void> rejectReport(String reportId) async {
    final int i = _reports.indexWhere((HazardReport r) => r.id == reportId);
    if (i < 0) return;
    final HazardReport report = _reports[i];
    final UserProfile? official = _auth.currentUser;

    _reports[i] = report.copyWith(
      status: ReportStatus.rejected,
      verifiedBy: official == null
          ? 'Barangay Official'
          : '${official.name} - ${official.barangay}',
      verifiedAt: DateTime.now(),
    );
    await _persistReports();

    if (official == null || report.reporterId != official.id) {
      await _addAlert(
        AlertItem(
          id: _uuid.v4(),
          kind: AlertKind.reportRejected,
          title: 'Your report was not verified',
          body:
              'An official reviewed your report at ${report.addressLabel} and '
              'could not confirm it. It has been removed from the map.',
          createdAt: DateTime.now(),
        ),
      );
    }

    await _creditReporter(report.reporterId, verified: false);
    await _creditOfficial(official);
    notifyListeners();
  }

  Future<void> _creditReporter(
    String reporterId, {
    required bool verified,
  }) async {
    final UserProfile? user = _auth.currentUser;
    if (user == null || user.id != reporterId) return;
    await _auth.updateProfile(
      verified
          ? user.copyWith(reportsVerified: user.reportsVerified + 1)
          : user.copyWith(reportsRejected: user.reportsRejected + 1),
    );
  }

  Future<void> _creditOfficial(UserProfile? official) async {
    if (official == null || !official.role.canVerify) return;
    // Re-read: _creditReporter may have already written a newer profile.
    final UserProfile current = _auth.currentUser ?? official;
    await _auth.updateProfile(
      current.copyWith(
        verificationsPerformed: current.verificationsPerformed + 1,
      ),
    );
  }

  Future<void> _persistReports() => _store.writeCollection(
    StoreKeys.reports,
    _reports.map((HazardReport r) => r.toJson()).toList(),
  );

  // --- Queries ------------------------------------------------------------

  HazardReport? reportById(String id) {
    for (final HazardReport r in _reports) {
      if (r.id == id) return r;
    }
    return null;
  }

  SafeSpot? safeSpotById(String id) {
    for (final SafeSpot s in _safeSpots) {
      if (s.id == id) return s;
    }
    return null;
  }

  SavedRoute? routeById(String id) {
    for (final SavedRoute r in _routes) {
      if (r.id == id) return r;
    }
    return null;
  }

  /// Verified hazards within [radiusMeters] of [origin], nearest first.
  List<HazardReport> hazardsNear(LatLng origin, double radiusMeters) {
    final List<HazardReport> found = verifiedHazards
        .where(
          (HazardReport h) =>
              Geo.distanceMeters(origin, h.location) <= radiusMeters,
        )
        .toList();
    found.sort(
      (HazardReport a, HazardReport b) => Geo.distanceMeters(
        origin,
        a.location,
      ).compareTo(Geo.distanceMeters(origin, b.location)),
    );
    return found;
  }

  /// Backs the "Am I Safe Here?" button.
  SafetyCheckResult checkSafety(LatLng origin, double radiusMeters) {
    final List<HazardReport> hazards = hazardsNear(origin, radiusMeters);
    if (hazards.isEmpty) {
      return const SafetyCheckResult(isSafe: true, hazards: <HazardReport>[]);
    }
    final HazardReport nearest = hazards.first;
    return SafetyCheckResult(
      isSafe: false,
      hazards: hazards,
      nearest: nearest,
      nearestDistanceMeters: Geo.distanceMeters(origin, nearest.location),
    );
  }

  /// Live status badge for a saved route.
  RouteStatus statusForRoute(SavedRoute route) {
    final List<HazardReport> onRoute = verifiedHazards
        .where(
          (HazardReport h) =>
              Geo.distanceToPathMeters(h.location, route.path) <=
              routeHazardThresholdMeters,
        )
        .toList();

    if (onRoute.isEmpty) {
      return const RouteStatus(
        hazardCount: 0,
        worstSeverity: null,
        hazards: <HazardReport>[],
      );
    }
    return RouteStatus(
      hazardCount: onRoute.length,
      worstSeverity: onRoute
          .map((HazardReport h) => h.severity)
          .reduce(
            (HazardSeverity a, HazardSeverity b) => a.rank >= b.rank ? a : b,
          ),
      hazards: onRoute,
    );
  }

  bool _isOnAnySavedRoute(LatLng point) => _routes.any(
    (SavedRoute r) =>
        Geo.distanceToPathMeters(point, r.path) <= routeHazardThresholdMeters,
  );

  /// Pending reports an official is responsible for.
  ///
  /// Officials only see their assigned area, so one barangay cannot moderate
  /// another's reports.
  List<HazardReport> pendingForOfficial(UserProfile official) {
    // Copy before sorting: pendingReports hands back an unmodifiable view.
    final List<HazardReport> pending = _reports
        .where(
          (HazardReport r) =>
              r.status == ReportStatus.pending &&
              Geo.distanceMeters(official.areaCenter, r.location) <=
                  official.areaRadiusMeters,
        )
        .toList();

    // Most dangerous first, then most recent, so the worst hazard is never
    // buried below a queue of minor ones.
    pending.sort((HazardReport a, HazardReport b) {
      final int bySeverity = b.severity.rank.compareTo(a.severity.rank);
      return bySeverity != 0
          ? bySeverity
          : b.reportedAt.compareTo(a.reportedAt);
    });
    return pending;
  }

  // --- Safe spots ---------------------------------------------------------

  Future<void> toggleSubscription(String spotId) async {
    if (_subscribedSpotIds.contains(spotId)) {
      _subscribedSpotIds.remove(spotId);
    } else {
      _subscribedSpotIds.add(spotId);
    }
    await _store.writeStringList(
      StoreKeys.subscribedSpots,
      _subscribedSpotIds.toList(),
    );
    notifyListeners();
  }

  List<SafeSpot> safeSpotsNear(LatLng origin, {SafeSpotCategory? category}) {
    final List<SafeSpot> spots = _safeSpots
        .where((SafeSpot s) => category == null || s.category == category)
        .toList();
    spots.sort(
      (SafeSpot a, SafeSpot b) => Geo.distanceMeters(
        origin,
        a.location,
      ).compareTo(Geo.distanceMeters(origin, b.location)),
    );
    return spots;
  }

  // --- Saved routes -------------------------------------------------------

  Future<SavedRoute> addRoute({
    required String label,
    required LatLng start,
    required String startLabel,
    required LatLng end,
    required String endLabel,
  }) async {
    final SavedRoute route = SavedRoute(
      id: _uuid.v4(),
      label: label,
      startLabel: startLabel,
      endLabel: endLabel,
      start: start,
      end: end,
      // A single midpoint keeps the preview line from cutting a perfect
      // diagonal through blocks it would never actually follow.
      waypoints: <LatLng>[
        LatLng(
          (start.latitude + end.latitude) / 2,
          (start.longitude + end.longitude) / 2,
        ),
      ],
      createdAt: DateTime.now(),
    );
    _routes = <SavedRoute>[..._routes, route];
    await _persistRoutes();
    notifyListeners();
    return route;
  }

  Future<void> deleteRoute(String routeId) async {
    _routes = _routes.where((SavedRoute r) => r.id != routeId).toList();
    await _persistRoutes();
    notifyListeners();
  }

  /// Puts a swipe-deleted route back, for the undo action.
  Future<void> restoreRoute(SavedRoute route, {int? atIndex}) async {
    final List<SavedRoute> next = List<SavedRoute>.from(_routes);
    final int index = (atIndex ?? next.length).clamp(0, next.length);
    next.insert(index, route);
    _routes = next;
    await _persistRoutes();
    notifyListeners();
  }

  Future<void> _persistRoutes() => _store.writeCollection(
    StoreKeys.routes,
    _routes.map((SavedRoute r) => r.toJson()).toList(),
  );

  // --- Alerts -------------------------------------------------------------

  Future<void> _addAlert(AlertItem alert) async {
    _alerts = <AlertItem>[alert, ..._alerts];
    await _persistAlerts();
  }

  Future<void> markAlertRead(String alertId) async {
    final int i = _alerts.indexWhere((AlertItem a) => a.id == alertId);
    if (i < 0 || _alerts[i].isRead) return;
    _alerts[i] = _alerts[i].copyWith(isRead: true);
    await _persistAlerts();
    notifyListeners();
  }

  Future<void> markAllAlertsRead() async {
    _alerts = _alerts.map((AlertItem a) => a.copyWith(isRead: true)).toList();
    await _persistAlerts();
    notifyListeners();
  }

  Future<void> _persistAlerts() => _store.writeCollection(
    StoreKeys.alerts,
    _alerts.map((AlertItem a) => a.toJson()).toList(),
  );

  static String _hazardLabel(HazardType type) => switch (type) {
    HazardType.floodedRoad => 'Flooding',
    HazardType.landslide => 'Landslide',
    HazardType.fallenTree => 'Fallen tree/debris',
    HazardType.powerLineDown => 'Power line down',
    HazardType.impassableBridge => 'Impassable bridge',
    HazardType.other => 'Hazard',
  };
}
