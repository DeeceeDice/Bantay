import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../app/routes.dart';
import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../data/repositories/bantay_repository.dart';
import '../../state/shell_controller.dart';
import '../alerts/alerts_screen.dart';
import '../profile/profile_screen.dart';
import '../safe_spots/safe_spots_screen.dart';
import 'map_screen.dart';

/// The signed-in app: five tabs with a persistent bottom navigation bar.
///
/// Tabs live in an [IndexedStack] so switching away and back preserves each
/// tab's state - most importantly the map's camera position, which is
/// expensive to re-derive and jarring to lose mid-journey.
class HomeShell extends StatelessWidget {
  const HomeShell({super.key});

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final ShellController shell = context.watch<ShellController>();
    final int unread = context.select<BantayRepository, int>(
      (BantayRepository repo) => repo.unreadAlertCount,
    );

    return Scaffold(
      body: IndexedStack(
        index: shell.tabIndex,
        children: const <Widget>[
          MapScreen(),
          // The Report tab pushes a full-screen flow rather than swapping the
          // body, so this slot only ever shows while that push is in flight.
          MapScreen(),
          AlertsScreen(),
          SafeSpotsScreen(),
          ProfileScreen(),
        ],
      ),
      bottomNavigationBar: _BottomNav(
        currentIndex: shell.tabIndex,
        unreadAlerts: unread,
        labels: <String>[
          s.tabMap,
          s.tabReport,
          s.tabAlerts,
          s.tabSafeSpots,
          s.tabProfile,
        ],
        onTap: (int index) {
          if (index == ShellController.reportTab) {
            Navigator.of(context).pushNamed(Routes.report);
            return;
          }
          shell.goToTab(index);
        },
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  const _BottomNav({
    required this.currentIndex,
    required this.unreadAlerts,
    required this.labels,
    required this.onTap,
  });

  final int currentIndex;
  final int unreadAlerts;
  final List<String> labels;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.line)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 62,
          child: Row(
            children: <Widget>[
              _NavItem(
                icon: Icons.map_outlined,
                activeIcon: Icons.map,
                label: labels[0],
                selected: currentIndex == ShellController.mapTab,
                onTap: () => onTap(ShellController.mapTab),
              ),
              _NavItem(
                icon: Icons.add_circle_outline,
                activeIcon: Icons.add_circle,
                label: labels[1],
                selected: false,
                onTap: () => onTap(ShellController.reportTab),
              ),
              _NavItem(
                icon: Icons.notifications_none,
                activeIcon: Icons.notifications,
                label: labels[2],
                selected: currentIndex == ShellController.alertsTab,
                badgeCount: unreadAlerts,
                onTap: () => onTap(ShellController.alertsTab),
              ),
              _NavItem(
                icon: Icons.shield_outlined,
                activeIcon: Icons.shield,
                label: labels[3],
                selected: currentIndex == ShellController.safeSpotsTab,
                onTap: () => onTap(ShellController.safeSpotsTab),
              ),
              _NavItem(
                icon: Icons.person_outline,
                activeIcon: Icons.person,
                label: labels[4],
                selected: currentIndex == ShellController.profileTab,
                onTap: () => onTap(ShellController.profileTab),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.selected,
    required this.onTap,
    this.badgeCount = 0,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    final Color color = selected ? AppColors.brandRed : AppColors.inkMuted;

    return Expanded(
      child: Semantics(
        button: true,
        selected: selected,
        label: label,
        child: InkWell(
          onTap: onTap,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Stack(
                clipBehavior: Clip.none,
                children: <Widget>[
                  Icon(selected ? activeIcon : icon, color: color, size: 24),
                  if (badgeCount > 0)
                    Positioned(
                      right: -7,
                      top: -4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 5,
                          vertical: 1,
                        ),
                        constraints: const BoxConstraints(minWidth: 17),
                        decoration: BoxDecoration(
                          color: AppColors.brandRed,
                          borderRadius: BorderRadius.circular(9),
                          border: Border.all(
                            color: AppColors.surface,
                            width: 1.5,
                          ),
                        ),
                        child: Text(
                          badgeCount > 9 ? '9+' : '$badgeCount',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            height: 1.3,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 3),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
