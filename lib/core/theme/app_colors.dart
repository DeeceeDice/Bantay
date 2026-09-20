import 'package:flutter/material.dart';

/// Bantay brand palette.
///
/// The logo is a blue eye shape with a red map-pin pupil, so deep red and
/// blue carry the brand while orange and green are reserved exclusively for
/// hazard state (pending vs. verified-safe). Nothing else in the UI is
/// allowed to use the state colors, so a glance at the map is unambiguous.
class AppColors {
  const AppColors._();

  /// Primary brand red, taken from the map-pin pupil in the logo.
  static const Color brandRed = Color(0xFFC8102E);
  static const Color brandRedDark = Color(0xFF9B0C23);
  static const Color brandRedLight = Color(0xFFF7DDE2);

  /// Secondary brand blue, taken from the eye shape in the logo.
  static const Color brandBlue = Color(0xFF1B4FA0);
  static const Color brandBlueDark = Color(0xFF123772);
  static const Color brandBlueLight = Color(0xFFDFE8F5);

  /// Pending / unverified / caution state.
  static const Color warning = Color(0xFFF4772E);
  static const Color warningDark = Color(0xFFC25718);
  static const Color warningLight = Color(0xFFFDEAE0);

  /// Verified-safe state.
  static const Color safe = Color(0xFF2E9E44);
  static const Color safeDark = Color(0xFF1F7330);
  static const Color safeLight = Color(0xFFE0F3E4);

  /// The user's own live location.
  static const Color userLocation = Color(0xFF1E88E5);

  // Neutrals tuned for outdoor legibility: high contrast, low chroma.
  static const Color ink = Color(0xFF14181F);
  static const Color inkMuted = Color(0xFF5A6472);
  static const Color inkFaint = Color(0xFF8B94A3);
  static const Color line = Color(0xFFE2E6EC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceAlt = Color(0xFFF5F7FA);
  static const Color scrim = Color(0x8A000000);
}
