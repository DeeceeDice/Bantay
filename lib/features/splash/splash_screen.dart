import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../app/routes.dart';
import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/bantay_logo.dart';
import '../../data/local/local_store.dart';
import '../../data/repositories/auth_repository.dart';
import '../../state/location_controller.dart';
import '../../state/settings_controller.dart';

/// First screen on every launch.
///
/// Routes on what the app already knows about the user: a brand-new install
/// goes to onboarding, a returning but logged-out user to login, and a
/// logged-in user straight to the map. The delay is only long enough to show
/// the brand, not to pad the launch.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animation = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..forward();

  @override
  void initState() {
    super.initState();
    _decideNextRoute();
  }

  @override
  void dispose() {
    _animation.dispose();
    super.dispose();
  }

  Future<void> _decideNextRoute() async {
    final LocalStore store = context.read<LocalStore>();
    final AuthRepository auth = context.read<AuthRepository>();
    final SettingsController settings = context.read<SettingsController>();
    final LocationController location = context.read<LocationController>();

    await Future<void>.delayed(const Duration(milliseconds: 1400));
    if (!mounted) return;

    final bool onboarded = store.readBool(StoreKeys.onboardingSeen);

    if (!onboarded) {
      Navigator.of(context).pushReplacementNamed(Routes.onboarding);
      return;
    }
    if (!auth.isLoggedIn) {
      Navigator.of(context).pushReplacementNamed(Routes.login);
      return;
    }

    // A returning, logged-in user should land on a map that is already
    // centred on them, so take the fix now rather than after the map paints.
    if (settings.locationGranted) {
      await location.requestAndLocate();
      await location.startTracking();
    } else {
      location.useFallback();
    }
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed(Routes.home);
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return Scaffold(
      backgroundColor: AppColors.brandBlue,
      body: Center(
        child: FadeTransition(
          opacity: CurvedAnimation(parent: _animation, curve: Curves.easeOut),
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.86, end: 1.0).animate(
              CurvedAnimation(parent: _animation, curve: Curves.easeOutBack),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Container(
                  padding: const EdgeInsets.all(26),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: const BantayLogo(size: 92),
                ),
                const SizedBox(height: 26),
                const Text(
                  'Bantay',
                  style: TextStyle(
                    fontSize: 40,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -1,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  s.tagline,
                  style: TextStyle(
                    fontSize: 15.5,
                    color: Colors.white.withValues(alpha: 0.88),
                  ),
                ),
                const SizedBox(height: 44),
                SizedBox(
                  width: 26,
                  height: 26,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      Colors.white.withValues(alpha: 0.85),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
