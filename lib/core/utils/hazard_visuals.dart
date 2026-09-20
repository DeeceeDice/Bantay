import 'package:flutter/material.dart';

import '../../data/models/enums.dart';
import '../i18n/strings.dart';
import '../theme/app_colors.dart';

/// The single place that decides how each hazard concept looks and reads.
///
/// Centralising this is what keeps the colour language honest: red always
/// means verified hazard, orange always means pending, green always means
/// safe. No screen is free to invent its own mapping.
class HazardVisuals {
  const HazardVisuals._();

  static IconData icon(HazardType type) => switch (type) {
    HazardType.floodedRoad => Icons.water,
    HazardType.landslide => Icons.terrain,
    HazardType.fallenTree => Icons.park,
    HazardType.powerLineDown => Icons.electric_bolt,
    HazardType.impassableBridge => Icons.dangerous,
    HazardType.other => Icons.warning_amber_rounded,
  };

  static String label(HazardType type, S s) => switch (type) {
    HazardType.floodedRoad => s.hazardFlooded,
    HazardType.landslide => s.hazardLandslide,
    HazardType.fallenTree => s.hazardFallenTree,
    HazardType.powerLineDown => s.hazardPowerLine,
    HazardType.impassableBridge => s.hazardBridge,
    HazardType.other => s.hazardOther,
  };

  static String severityLabel(HazardSeverity severity, S s) =>
      switch (severity) {
        HazardSeverity.passableWithCaution => s.severityCaution,
        HazardSeverity.notPassable => s.severityNotPassable,
        HazardSeverity.lifeThreatening => s.severityLifeThreatening,
      };

  static IconData severityIcon(HazardSeverity severity) => switch (severity) {
    HazardSeverity.passableWithCaution => Icons.info_outline,
    HazardSeverity.notPassable => Icons.do_not_disturb_on_outlined,
    HazardSeverity.lifeThreatening => Icons.emergency_outlined,
  };

  /// Severity drives emphasis within the hazard palette, never outside it.
  static Color severityColor(HazardSeverity severity) => switch (severity) {
    HazardSeverity.passableWithCaution => AppColors.warning,
    HazardSeverity.notPassable => AppColors.brandRed,
    HazardSeverity.lifeThreatening => AppColors.brandRedDark,
  };

  /// Pin colour: the core colour contract of the whole map.
  static Color statusColor(ReportStatus status) => switch (status) {
    ReportStatus.verified => AppColors.brandRed,
    ReportStatus.pending => AppColors.warning,
    ReportStatus.rejected => AppColors.inkFaint,
  };

  static IconData safeSpotIcon(SafeSpotCategory category) => switch (category) {
    SafeSpotCategory.mall => Icons.storefront,
    SafeSpotCategory.school => Icons.school,
    SafeSpotCategory.evacuationCenter => Icons.holiday_village,
    SafeSpotCategory.terminal => Icons.directions_bus,
  };

  static String safeSpotLabel(SafeSpotCategory category, S s) =>
      switch (category) {
        SafeSpotCategory.mall => s.categoryMalls,
        SafeSpotCategory.school => s.categorySchools,
        SafeSpotCategory.evacuationCenter => s.categoryEvacuation,
        SafeSpotCategory.terminal => s.categoryTerminals,
      };

  static IconData alertIcon(AlertKind kind) => switch (kind) {
    AlertKind.verifiedHazard => Icons.warning_rounded,
    AlertKind.typhoonWarning => Icons.cyclone,
    AlertKind.safeSpotUpdate => Icons.home_work_outlined,
    AlertKind.reportVerified => Icons.verified_rounded,
    AlertKind.reportRejected => Icons.cancel_outlined,
    AlertKind.routeStatus => Icons.alt_route_rounded,
  };

  static Color alertColor(AlertKind kind) => switch (kind) {
    AlertKind.verifiedHazard => AppColors.brandRed,
    AlertKind.typhoonWarning => AppColors.brandRedDark,
    AlertKind.safeSpotUpdate => AppColors.brandBlue,
    AlertKind.reportVerified => AppColors.safe,
    AlertKind.reportRejected => AppColors.inkMuted,
    AlertKind.routeStatus => AppColors.warning,
  };

  static String roleLabel(UserRole role, S s) => switch (role) {
    UserRole.commuter => s.roleCommuter,
    UserRole.barangayOfficial => s.roleBarangay,
    UserRole.schoolAdmin => s.roleSchoolAdmin,
    UserRole.businessOwner => s.roleBusiness,
  };

  static IconData roleIcon(UserRole role) => switch (role) {
    UserRole.commuter => Icons.directions_walk,
    UserRole.barangayOfficial => Icons.shield_outlined,
    UserRole.schoolAdmin => Icons.school_outlined,
    UserRole.businessOwner => Icons.storefront_outlined,
  };
}
