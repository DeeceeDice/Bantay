/// Domain enums for Bantay.
///
/// Every enum carries a stable [id] used for JSON persistence, so renaming a
/// Dart constant never invalidates data already stored on a user's device.
library;

enum UserRole {
  commuter('commuter'),
  barangayOfficial('barangay_official'),
  schoolAdmin('school_admin'),
  businessOwner('business_owner');

  const UserRole(this.id);
  final String id;

  /// Roles allowed to verify or reject community reports.
  bool get canVerify =>
      this == UserRole.barangayOfficial || this == UserRole.schoolAdmin;

  static UserRole fromId(String? id) => UserRole.values.firstWhere(
    (UserRole r) => r.id == id,
    orElse: () => UserRole.commuter,
  );
}

enum HazardType {
  floodedRoad('flooded_road'),
  landslide('landslide'),
  fallenTree('fallen_tree'),
  powerLineDown('power_line_down'),
  impassableBridge('impassable_bridge'),
  other('other');

  const HazardType(this.id);
  final String id;

  static HazardType fromId(String? id) => HazardType.values.firstWhere(
    (HazardType t) => t.id == id,
    orElse: () => HazardType.other,
  );
}

enum HazardSeverity {
  passableWithCaution('passable_with_caution', 1),
  notPassable('not_passable', 2),
  lifeThreatening('life_threatening', 3);

  const HazardSeverity(this.id, this.rank);
  final String id;

  /// Higher means more dangerous; drives sort order and banner colour.
  final int rank;

  static HazardSeverity fromId(String? id) => HazardSeverity.values.firstWhere(
    (HazardSeverity s) => s.id == id,
    orElse: () => HazardSeverity.passableWithCaution,
  );
}

enum ReportStatus {
  pending('pending'),
  verified('verified'),
  rejected('rejected');

  const ReportStatus(this.id);
  final String id;

  static ReportStatus fromId(String? id) => ReportStatus.values.firstWhere(
    (ReportStatus s) => s.id == id,
    orElse: () => ReportStatus.pending,
  );
}

enum SafeSpotCategory {
  mall('mall'),
  school('school'),
  evacuationCenter('evacuation_center'),
  terminal('terminal');

  const SafeSpotCategory(this.id);
  final String id;

  static SafeSpotCategory fromId(String? id) =>
      SafeSpotCategory.values.firstWhere(
        (SafeSpotCategory c) => c.id == id,
        orElse: () => SafeSpotCategory.evacuationCenter,
      );
}

enum AlertKind {
  verifiedHazard('verified_hazard'),
  typhoonWarning('typhoon_warning'),
  safeSpotUpdate('safe_spot_update'),
  reportVerified('report_verified'),
  reportRejected('report_rejected'),
  routeStatus('route_status');

  const AlertKind(this.id);
  final String id;

  static AlertKind fromId(String? id) => AlertKind.values.firstWhere(
    (AlertKind k) => k.id == id,
    orElse: () => AlertKind.verifiedHazard,
  );
}

/// Which pin layers the map is currently showing.
enum MapLayer {
  verifiedHazards('verified_hazards'),
  pendingReports('pending_reports'),
  safeSpots('safe_spots');

  const MapLayer(this.id);
  final String id;

  static MapLayer fromId(String? id) => MapLayer.values.firstWhere(
    (MapLayer l) => l.id == id,
    orElse: () => MapLayer.verifiedHazards,
  );
}
