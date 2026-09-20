import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../app/routes.dart';
import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/hazard_visuals.dart';
import '../../core/widgets/common.dart';
import '../../data/models/user_profile.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/bantay_repository.dart';
import '../../state/settings_controller.dart';
import '../auth/role_selection_screen.dart';
import '../routes/saved_routes_screen.dart';
import '../verification/verification_panel_screen.dart';
import 'help_support_screen.dart';
import 'my_reports_screen.dart';
import 'notification_settings_screen.dart';

/// Profile, stats and every app setting.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  Future<void> _logOut(BuildContext context) async {
    final S s = S.of(context);
    final bool confirmed = await confirmDialog(
      context,
      title: s.logOutConfirmTitle,
      message: s.logOutConfirmBody,
      confirmLabel: s.logOut,
      cancelLabel: s.cancel,
    );
    if (!confirmed || !context.mounted) return;

    await context.read<AuthRepository>().logOut();
    if (!context.mounted) return;
    Navigator.of(context)
        .pushNamedAndRemoveUntil(Routes.login, (Route<dynamic> route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final UserProfile? user = context.watch<AuthRepository>().currentUser;
    final BantayRepository repo = context.watch<BantayRepository>();
    final SettingsController settings = context.watch<SettingsController>();

    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: Text(s.profile)),
        body: EmptyState(icon: Icons.person_outline, message: s.logIn),
      );
    }

    final int myReportCount = repo.myReports(user.id).length;

    return Scaffold(
      appBar: AppBar(title: Text(s.profile)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: <Widget>[
          _ProfileHeader(user: user),
          const SizedBox(height: 18),
          _StatsRow(user: user),
          SectionHeader(title: s.myReports),
          SectionCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: <Widget>[
                _NavRow(
                  icon: Icons.assignment_outlined,
                  label: s.myReports,
                  trailing: '$myReportCount',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (BuildContext _) => const MyReportsScreen(),
                    ),
                  ),
                ),
                const Divider(height: 1),
                _NavRow(
                  icon: Icons.alt_route_rounded,
                  label: s.savedRoutes,
                  trailing: '${repo.savedRoutes.length}',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (BuildContext _) => const SavedRoutesScreen(),
                    ),
                  ),
                ),
                if (user.role.canVerify) ...<Widget>[
                  const Divider(height: 1),
                  _NavRow(
                    icon: Icons.verified_user_outlined,
                    label: s.verificationPanel,
                    trailing: '${repo.pendingForOfficial(user).length}',
                    highlight: true,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (BuildContext _) =>
                            const VerificationPanelScreen(),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          SectionHeader(title: s.notificationPreferences),
          SectionCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: <Widget>[
                _NavRow(
                  icon: Icons.notifications_none,
                  label: s.notificationPreferences,
                  trailing: settings.pushEnabled ? s.yes : s.no,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (BuildContext _) =>
                          const NotificationSettingsScreen(),
                    ),
                  ),
                ),
                const Divider(height: 1),
                _LanguageRow(settings: settings),
              ],
            ),
          ),
          SectionHeader(title: s.helpAndSupport),
          SectionCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: <Widget>[
                _NavRow(
                  icon: Icons.person_outline,
                  label: s.changeRole,
                  trailing: HazardVisuals.roleLabel(user.role, s),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (BuildContext _) =>
                          const RoleSelectionScreen(isChangingRole: true),
                    ),
                  ),
                ),
                const Divider(height: 1),
                _NavRow(
                  icon: Icons.help_outline,
                  label: s.helpAndSupport,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (BuildContext _) => const HelpSupportScreen(),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          OutlinedButton.icon(
            onPressed: () => _logOut(context),
            icon: const Icon(Icons.logout, size: 20),
            label: Text(s.logOut),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.brandRed,
              side: BorderSide(
                color: AppColors.brandRed.withValues(alpha: 0.4),
                width: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 14),
          Center(
            child: Text(
              'Bantay 1.0.0',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.user});

  final UserProfile user;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return Row(
      children: <Widget>[
        Container(
          width: 66,
          height: 66,
          decoration: const BoxDecoration(
            color: AppColors.brandBlue,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(
            user.initials,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 25,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(user.name, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 2),
              Text(user.email, style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 8),
              StatusBadge(
                label: HazardVisuals.roleLabel(user.role, s),
                color: user.role.canVerify
                    ? AppColors.safe
                    : AppColors.brandBlue,
                icon: HazardVisuals.roleIcon(user.role),
                compact: true,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.user});

  final UserProfile user;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return Row(
      children: <Widget>[
        Expanded(
          child: _StatTile(
            value: '${user.reportsSubmitted}',
            label: s.reportsSubmitted,
            color: AppColors.brandBlue,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatTile(
            value: user.role.canVerify
                ? '${user.verificationsPerformed}'
                : '${user.reportsVerified}',
            label: user.role.canVerify
                ? s.verificationsDone
                : s.reportsVerifiedStat,
            color: AppColors.safe,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatTile(
            value: '${user.trustScore}',
            label: s.trustScore,
            color: AppColors.brandRed,
          ),
        ),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.value,
    required this.label,
    required this.color,
  });

  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Column(
        children: <Widget>[
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: color,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: AppColors.inkMuted,
              height: 1.25,
            ),
          ),
        ],
      ),
    );
  }
}

class _LanguageRow extends StatelessWidget {
  const _LanguageRow({required this.settings});

  final SettingsController settings;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
      child: Row(
        children: <Widget>[
          const Icon(Icons.translate, size: 20, color: AppColors.inkMuted),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              s.language,
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
          SegmentedButton<bool>(
            segments: <ButtonSegment<bool>>[
              ButtonSegment<bool>(value: false, label: Text(s.english)),
              ButtonSegment<bool>(value: true, label: Text(s.filipino)),
            ],
            selected: <bool>{settings.isFilipino},
            showSelectedIcon: false,
            onSelectionChanged: (Set<bool> value) =>
                settings.setLocale(Locale(value.first ? 'fil' : 'en')),
            style: const ButtonStyle(visualDensity: VisualDensity.compact),
          ),
        ],
      ),
    );
  }
}

class _NavRow extends StatelessWidget {
  const _NavRow({
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailing,
    this.highlight = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String? trailing;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 15, 14, 15),
        child: Row(
          children: <Widget>[
            Icon(
              icon,
              size: 20,
              color: highlight ? AppColors.safe : AppColors.inkMuted,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: highlight ? AppColors.safeDark : AppColors.ink,
                ),
              ),
            ),
            if (trailing != null) ...<Widget>[
              Text(trailing!, style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(width: 6),
            ],
            const Icon(
              Icons.chevron_right,
              size: 20,
              color: AppColors.inkFaint,
            ),
          ],
        ),
      ),
    );
  }
}
