import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common.dart';
import '../../state/settings_controller.dart';

/// Push, SMS fallback and alert radius.
class NotificationSettingsScreen extends StatelessWidget {
  const NotificationSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final SettingsController settings = context.watch<SettingsController>();

    return Scaffold(
      appBar: AppBar(
        title: Text(s.notificationPreferences),
        leading: const BackButton(),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
        children: <Widget>[
          SectionCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: <Widget>[
                SwitchListTile.adaptive(
                  value: settings.pushEnabled,
                  onChanged: settings.setPushEnabled,
                  title: Text(
                    s.pushAlerts,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  subtitle: Text(
                    s.pushAlertsDesc,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  secondary: const Icon(Icons.notifications_active_outlined),
                  contentPadding: const EdgeInsets.fromLTRB(16, 6, 12, 6),
                ),
                const Divider(height: 1),
                SwitchListTile.adaptive(
                  value: settings.smsFallbackEnabled,
                  onChanged: settings.setSmsFallbackEnabled,
                  title: Text(
                    s.smsFallback,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  subtitle: Text(
                    s.smsFallbackDesc,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  secondary: const Icon(Icons.sms_outlined),
                  contentPadding: const EdgeInsets.fromLTRB(16, 6, 12, 6),
                ),
              ],
            ),
          ),
          SectionHeader(title: s.alertRadius),
          SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Expanded(
                      child: Text(
                        s.alertRadiusDesc,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                    const SizedBox(width: 12),
                    StatusBadge(
                      label: settings.alertRadiusKm < 1
                          ? '${(settings.alertRadiusKm * 1000).round()} m'
                          : '${settings.alertRadiusKm.toStringAsFixed(1)} km',
                      color: AppColors.brandBlue,
                      filled: true,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Slider(
                  value: settings.alertRadiusKm,
                  min: 0.5,
                  max: 10,
                  // 19 stops of 500 m: fine enough to tune, coarse enough to
                  // hit a value with a thumb while walking.
                  divisions: 19,
                  label: '${settings.alertRadiusKm.toStringAsFixed(1)} km',
                  onChanged: settings.setAlertRadiusKm,
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: <Widget>[
                    Text('500 m', style: Theme.of(context).textTheme.bodySmall),
                    Text('10 km', style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.brandBlueLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Icon(
                  Icons.info_outline,
                  size: 19,
                  color: AppColors.brandBlueDark,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    s.offlineSmsExplainer,
                    style: const TextStyle(
                      fontSize: 12.5,
                      height: 1.45,
                      color: AppColors.brandBlueDark,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
