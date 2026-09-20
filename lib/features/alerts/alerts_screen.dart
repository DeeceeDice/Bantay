import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/hazard_visuals.dart';
import '../../core/utils/time_ago.dart';
import '../../core/widgets/common.dart';
import '../../data/models/alert_item.dart';
import '../../data/models/saved_route.dart';
import '../../data/repositories/bantay_repository.dart';
import '../../state/settings_controller.dart';
import '../../state/shell_controller.dart';

/// Chronological feed of everything Bantay has told the user.
///
/// The saved-routes filter is the one that matters day to day: during a storm
/// the "everywhere" feed fills up fast, and most people only need to know
/// about the roads they actually travel.
class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  bool _savedRoutesOnly = false;

  void _openAlert(AlertItem alert) {
    final BantayRepository repo = context.read<BantayRepository>();
    final ShellController shell = context.read<ShellController>();

    repo.markAlertRead(alert.id);

    if (alert.reportId != null && repo.reportById(alert.reportId!) != null) {
      shell.focusReport(alert.reportId!);
      return;
    }
    if (alert.safeSpotId != null) {
      shell.focusSafeSpot(alert.safeSpotId!);
      return;
    }
    if (alert.routeId != null) {
      final SavedRoute? route = repo.routeById(alert.routeId!);
      if (route != null) shell.focusOnPoint(route.start);
    }
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final BantayRepository repo = context.watch<BantayRepository>();
    final SettingsController settings = context.watch<SettingsController>();

    final List<AlertItem> all = repo.alerts;
    final List<AlertItem> visible = _savedRoutesOnly
        ? all.where((AlertItem a) => a.onSavedRoute).toList()
        : all;
    final bool hasUnread = all.any((AlertItem a) => !a.isRead);

    return Scaffold(
      appBar: AppBar(
        title: Text(s.alerts),
        actions: <Widget>[
          if (hasUnread)
            TextButton(
              onPressed: repo.markAllAlertsRead,
              child: Text(s.markAllRead),
            ),
          const SizedBox(width: 6),
        ],
      ),
      body: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: SegmentedButton<bool>(
              segments: <ButtonSegment<bool>>[
                ButtonSegment<bool>(
                  value: false,
                  label: Text(s.everywhereNearby),
                ),
                ButtonSegment<bool>(value: true, label: Text(s.mySavedRoutes)),
              ],
              selected: <bool>{_savedRoutesOnly},
              showSelectedIcon: false,
              onSelectionChanged: (Set<bool> value) =>
                  setState(() => _savedRoutesOnly = value.first),
            ),
          ),
          if (settings.smsFallbackEnabled)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: _SmsFallbackNotice(message: s.offlineSmsExplainer),
            ),
          Expanded(
            child: visible.isEmpty
                ? EmptyState(
                    icon: Icons.notifications_none,
                    title: s.allCaughtUp,
                    message: _savedRoutesOnly ? s.noRouteAlerts : s.noAlerts,
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                    itemCount: visible.length,
                    separatorBuilder: (BuildContext context, int index) =>
                        const SizedBox(height: 10),
                    itemBuilder: (BuildContext context, int index) =>
                        _AlertTile(
                          alert: visible[index],
                          onTap: () => _openAlert(visible[index]),
                        ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _AlertTile extends StatelessWidget {
  const _AlertTile({required this.alert, required this.onTap});

  final AlertItem alert;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final Color accent = HazardVisuals.alertColor(alert.kind);

    return SectionCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      // Unread alerts get a tinted border so the feed is scannable without
      // reading a single word.
      borderColor: alert.isRead
          ? AppColors.line
          : accent.withValues(alpha: 0.45),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(
              HazardVisuals.alertIcon(alert.kind),
              size: 20,
              color: accent,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Expanded(
                      child: Text(
                        alert.title,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              fontWeight: alert.isRead
                                  ? FontWeight.w600
                                  : FontWeight.w800,
                            ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      TimeAgo.compact(alert.createdAt),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    if (!alert.isRead) ...<Widget>[
                      const SizedBox(width: 6),
                      Container(
                        width: 8,
                        height: 8,
                        margin: const EdgeInsets.only(top: 5),
                        decoration: BoxDecoration(
                          color: accent,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(alert.body, style: Theme.of(context).textTheme.bodyMedium),
                if (alert.onSavedRoute) ...<Widget>[
                  const SizedBox(height: 8),
                  StatusBadge(
                    label: s.mySavedRoutes,
                    color: AppColors.warningDark,
                    icon: Icons.alt_route_rounded,
                    compact: true,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SmsFallbackNotice extends StatelessWidget {
  const _SmsFallbackNotice({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.brandBlueLight,
        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Icon(
            Icons.sms_outlined,
            size: 18,
            color: AppColors.brandBlueDark,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12,
                height: 1.4,
                color: AppColors.brandBlueDark,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
