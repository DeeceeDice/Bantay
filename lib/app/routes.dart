/// Named routes for the whole app, in one place.
///
/// Keeping them as constants means a typo in a route name is a compile error
/// at the call site rather than a blank screen at runtime.
class Routes {
  const Routes._();

  static const String splash = '/';
  static const String onboarding = '/onboarding';
  static const String login = '/login';
  static const String signUp = '/sign-up';
  static const String forgotPassword = '/forgot-password';
  static const String roleSelection = '/role';
  static const String locationPermission = '/location-permission';
  static const String home = '/home';
  static const String alerts = '/alerts';
  static const String report = '/report';
  static const String verification = '/verification';
  static const String safeSpotDetail = '/safe-spot';
  static const String addRoute = '/routes/new';
  static const String savedRoutes = '/routes';
  static const String directions = '/directions';
  static const String help = '/help';
  static const String notificationSettings = '/settings/notifications';
  static const String myReports = '/my-reports';
}
