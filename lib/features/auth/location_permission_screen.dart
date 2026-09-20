import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../app/routes.dart';
import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common.dart';
import '../../state/location_controller.dart';
import '../../state/settings_controller.dart';

/// Location permission request.
///
/// "Not now" is a first-class path, not a dark pattern: it takes the user
/// into the app immediately with the map centred on Manila and an explanation
/// of what they are missing, because a commuter in a storm should never be
/// locked out of hazard data over a permission prompt.
class LocationPermissionScreen extends StatefulWidget {
  const LocationPermissionScreen({super.key});

  @override
  State<LocationPermissionScreen> createState() =>
      _LocationPermissionScreenState();
}

class _LocationPermissionScreenState extends State<LocationPermissionScreen> {
  bool _busy = false;

  Future<void> _allow() async {
    setState(() => _busy = true);

    final LocationController location = context.read<LocationController>();
    final SettingsController settings = context.read<SettingsController>();

    final bool granted = await location.requestAndLocate();
    await settings.setLocationGranted(granted);
    if (granted) {
      await location.startTracking();
    }

    if (!mounted) return;
    setState(() => _busy = false);

    if (!granted) {
      AppToast.info(context, S.of(context).locationDeniedNotice);
    }
    _enterApp();
  }

  Future<void> _notNow() async {
    context.read<LocationController>().useFallback();
    await context.read<SettingsController>().setLocationGranted(false);
    if (!mounted) return;
    _enterApp();
  }

  void _enterApp() {
    Navigator.of(context)
        .pushNamedAndRemoveUntil(Routes.home, (Route<dynamic> route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 24, 28, 28),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Center(
                    child: Container(
                      width: 152,
                      height: 152,
                      decoration: const BoxDecoration(
                        color: AppColors.brandBlueLight,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.my_location,
                        size: 66,
                        color: AppColors.brandBlue,
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),
                  Text(
                    s.locationTitle,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 14),
                  Text(
                    s.locationBody,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge
                        ?.copyWith(color: AppColors.inkMuted),
                  ),
                  const SizedBox(height: 40),
                  LoadingButton(
                    label: s.allowLocation,
                    icon: Icons.location_on_outlined,
                    isLoading: _busy,
                    onPressed: _allow,
                  ),
                  const SizedBox(height: 10),
                  TextButton(
                    onPressed: _busy ? null : _notNow,
                    child: Text(s.notNow),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
