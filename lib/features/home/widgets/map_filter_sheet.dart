import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/i18n/strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/enums.dart';
import '../../../state/settings_controller.dart';

/// Map layer filters.
///
/// Each switch writes straight through to [SettingsController], so the map
/// behind the sheet updates live as the user toggles and the choice survives
/// the app being closed.
class MapFilterSheet extends StatelessWidget {
  const MapFilterSheet({super.key});

  static Future<void> show(BuildContext context) => showModalBottomSheet<void>(
    context: context,
    builder: (BuildContext context) => const MapFilterSheet(),
  );

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final SettingsController settings = context.watch<SettingsController>();

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(s.filters, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 14),
            _FilterTile(
              title: s.showVerifiedOnly,
              icon: Icons.verified_rounded,
              color: AppColors.brandRed,
              value: settings.verifiedOnly,
              onChanged: settings.setVerifiedOnly,
            ),
            _FilterTile(
              title: s.showPendingReports,
              icon: Icons.schedule,
              color: AppColors.warning,
              value: settings.showsLayer(MapLayer.pendingReports),
              onChanged: (_) => settings.toggleLayer(MapLayer.pendingReports),
            ),
            _FilterTile(
              title: s.showSafeSpots,
              icon: Icons.shield,
              color: AppColors.safe,
              value: settings.showsLayer(MapLayer.safeSpots),
              onChanged: (_) => settings.toggleLayer(MapLayer.safeSpots),
            ),
            const Divider(height: 28),
            _FilterTile(
              title: s.offlineBanner,
              icon: Icons.wifi_off,
              color: AppColors.inkMuted,
              value: settings.offlineMode,
              onChanged: settings.setOfflineMode,
              subtitle: s.offlineSmsExplainer,
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(s.done),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterTile extends StatelessWidget {
  const _FilterTile({
    required this.title,
    required this.icon,
    required this.color,
    required this.value,
    required this.onChanged,
    this.subtitle,
  });

  final String title;
  final IconData icon;
  final Color color;
  final bool value;
  final ValueChanged<bool> onChanged;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile.adaptive(
      value: value,
      onChanged: onChanged,
      contentPadding: EdgeInsets.zero,
      title: Text(title, style: Theme.of(context).textTheme.titleMedium),
      subtitle: subtitle == null
          ? null
          : Text(subtitle!, style: Theme.of(context).textTheme.bodySmall),
      secondary: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, size: 19, color: color),
      ),
    );
  }
}
