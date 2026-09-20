import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_colors.dart';

/// Bantay's Material 3 theme.
///
/// Tuned for the job the app actually does: read outdoors, in the rain, one
/// handed, often in a hurry. That means large tap targets (48dp minimum),
/// high text contrast, and generous corner radii so cards read as distinct
/// surfaces even on a cheap low-brightness screen.
class AppTheme {
  const AppTheme._();

  /// Minimum tap target. Every interactive control in the app honours this.
  static const double minTapTarget = 48;

  static const double radiusSmall = 10;
  static const double radiusMedium = 16;
  static const double radiusLarge = 24;

  static ThemeData light() {
    final ColorScheme scheme =
        ColorScheme.fromSeed(
          seedColor: AppColors.brandBlue,
          brightness: Brightness.light,
        ).copyWith(
          primary: AppColors.brandBlue,
          onPrimary: Colors.white,
          secondary: AppColors.brandRed,
          onSecondary: Colors.white,
          error: AppColors.brandRed,
          surface: AppColors.surface,
          onSurface: AppColors.ink,
        );

    final TextTheme text = _textTheme(Typography.blackMountainView);

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: AppColors.surfaceAlt,
      textTheme: text,
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.ink,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
        titleTextStyle: text.titleLarge,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          side: const BorderSide(color: AppColors.line),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(minTapTarget + 4),
          backgroundColor: AppColors.brandRed,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.line,
          disabledForegroundColor: AppColors.inkFaint,
          textStyle: text.labelLarge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusSmall + 2),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(minTapTarget + 4),
          foregroundColor: AppColors.brandBlue,
          side: const BorderSide(color: AppColors.line, width: 1.5),
          textStyle: text.labelLarge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusSmall + 2),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.brandBlue,
          minimumSize: const Size(minTapTarget, minTapTarget),
          textStyle: text.labelLarge,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceAlt,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        hintStyle: text.bodyMedium?.copyWith(color: AppColors.inkFaint),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSmall + 2),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSmall + 2),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSmall + 2),
          borderSide: const BorderSide(color: AppColors.brandBlue, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSmall + 2),
          borderSide: const BorderSide(color: AppColors.brandRed, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSmall + 2),
          borderSide: const BorderSide(color: AppColors.brandRed, width: 2),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.brandRed,
        unselectedItemColor: AppColors.inkMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 12,
        showUnselectedLabels: true,
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(radiusLarge),
          ),
        ),
        showDragHandle: true,
        dragHandleColor: AppColors.line,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMedium + 4),
        ),
        titleTextStyle: text.titleLarge,
        contentTextStyle: text.bodyMedium,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.ink,
        contentTextStyle: text.bodyMedium?.copyWith(color: Colors.white),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusSmall + 2),
        ),
        insetPadding: const EdgeInsets.all(16),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surface,
        selectedColor: AppColors.brandBlueLight,
        side: const BorderSide(color: AppColors.line),
        labelStyle: text.labelMedium,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
        ),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith<Color>(
          (Set<WidgetState> states) => states.contains(WidgetState.selected)
              ? Colors.white
              : AppColors.surface,
        ),
        trackColor: WidgetStateProperty.resolveWith<Color>(
          (Set<WidgetState> states) => states.contains(WidgetState.selected)
              ? AppColors.safe
              : AppColors.line,
        ),
      ),
      sliderTheme: const SliderThemeData(
        activeTrackColor: AppColors.brandBlue,
        inactiveTrackColor: AppColors.brandBlueLight,
        thumbColor: AppColors.brandBlue,
        overlayColor: Color(0x291B4FA0),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.line,
        thickness: 1,
        space: 1,
      ),
      listTileTheme: const ListTileThemeData(
        iconColor: AppColors.inkMuted,
        minVerticalPadding: 12,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.brandBlue,
      ),
    );
  }

  /// Applies Bantay's type scale on top of the platform's default text theme.
  static TextTheme _textTheme(TextTheme base) {
    return base.copyWith(
      displaySmall: base.displaySmall?.copyWith(
        fontWeight: FontWeight.w800,
        color: AppColors.ink,
        letterSpacing: -0.5,
      ),
      headlineMedium: base.headlineMedium?.copyWith(
        fontSize: 26,
        fontWeight: FontWeight.w800,
        color: AppColors.ink,
        letterSpacing: -0.4,
      ),
      headlineSmall: base.headlineSmall?.copyWith(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: AppColors.ink,
        letterSpacing: -0.3,
      ),
      titleLarge: base.titleLarge?.copyWith(
        fontSize: 19,
        fontWeight: FontWeight.w700,
        color: AppColors.ink,
      ),
      titleMedium: base.titleMedium?.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: AppColors.ink,
      ),
      bodyLarge: base.bodyLarge?.copyWith(
        fontSize: 16,
        height: 1.45,
        color: AppColors.ink,
      ),
      bodyMedium: base.bodyMedium?.copyWith(
        fontSize: 14.5,
        height: 1.45,
        color: AppColors.inkMuted,
      ),
      bodySmall: base.bodySmall?.copyWith(
        fontSize: 12.5,
        height: 1.4,
        color: AppColors.inkFaint,
      ),
      labelLarge: base.labelLarge?.copyWith(
        fontSize: 15.5,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.1,
      ),
      labelMedium: base.labelMedium?.copyWith(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: AppColors.ink,
      ),
    );
  }
}
