import 'package:flutter/material.dart';

import '../core/geo/lat_lng.dart';
import '../features/alerts/alerts_screen.dart';
import '../features/auth/forgot_password_screen.dart';
import '../features/auth/location_permission_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/role_selection_screen.dart';
import '../features/auth/sign_up_screen.dart';
import '../features/home/home_shell.dart';
import '../features/navigation/directions_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/profile/help_support_screen.dart';
import '../features/profile/my_reports_screen.dart';
import '../features/profile/notification_settings_screen.dart';
import '../features/report/report_flow_screen.dart';
import '../features/routes/add_route_screen.dart';
import '../features/routes/saved_routes_screen.dart';
import '../features/safe_spots/safe_spot_detail_screen.dart';
import '../features/splash/splash_screen.dart';
import '../features/verification/verification_panel_screen.dart';
import 'routes.dart';

/// Arguments for the directions screen.
class DirectionsArgs {
  const DirectionsArgs({
    required this.destination,
    required this.destinationLabel,
    this.avoidReportId,
  });

  final LatLng destination;
  final String destinationLabel;
  final String? avoidReportId;
}

/// Maps route names to screens.
///
/// Unknown routes fall back to the splash screen rather than crashing, which
/// matters because a stale deep link should never be able to brick the app.
class AppRouter {
  const AppRouter._();

  static const String initialRoute = Routes.splash;

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    final Widget page = switch (settings.name) {
      Routes.splash => const SplashScreen(),
      Routes.onboarding => const OnboardingScreen(),
      Routes.login => const LoginScreen(),
      Routes.signUp => const SignUpScreen(),
      Routes.forgotPassword => const ForgotPasswordScreen(),
      Routes.roleSelection => const RoleSelectionScreen(),
      Routes.locationPermission => const LocationPermissionScreen(),
      Routes.home => const HomeShell(),
      Routes.report => ReportFlowScreen(
        initialLocation: settings.arguments is LatLng
            ? settings.arguments! as LatLng
            : null,
      ),
      Routes.verification => const VerificationPanelScreen(),
      Routes.safeSpotDetail => SafeSpotDetailScreen(
        spotId: settings.arguments is String
            ? settings.arguments! as String
            : '',
      ),
      Routes.addRoute => const AddRouteScreen(),
      Routes.savedRoutes => const SavedRoutesScreen(),
      Routes.alerts => const AlertsScreen(),
      Routes.directions => _buildDirections(settings.arguments),
      Routes.help => const HelpSupportScreen(),
      Routes.notificationSettings => const NotificationSettingsScreen(),
      Routes.myReports => const MyReportsScreen(),
      _ => const SplashScreen(),
    };

    return MaterialPageRoute<dynamic>(builder: (_) => page, settings: settings);
  }

  static Widget _buildDirections(Object? arguments) {
    if (arguments is! DirectionsArgs) return const HomeShell();
    return DirectionsScreen(
      destination: arguments.destination,
      destinationLabel: arguments.destinationLabel,
      avoidReportId: arguments.avoidReportId,
    );
  }
}
