import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../app/routes.dart';
import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/hazard_visuals.dart';
import '../../core/widgets/common.dart';
import '../../data/models/enums.dart';
import '../../data/repositories/auth_repository.dart';

/// Role picker shown straight after sign-up.
///
/// The role decides whether the user can verify other people's reports, so it
/// is a deliberate, explicit choice rather than a default buried in settings.
class RoleSelectionScreen extends StatefulWidget {
  const RoleSelectionScreen({super.key, this.isChangingRole = false});

  /// When true the screen was opened from Profile to change an existing role,
  /// so it pops back instead of continuing through onboarding.
  final bool isChangingRole;

  @override
  State<RoleSelectionScreen> createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends State<RoleSelectionScreen> {
  UserRole? _selected;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    if (widget.isChangingRole) {
      _selected = context.read<AuthRepository>().currentUser?.role;
    }
  }

  Future<void> _continue() async {
    final UserRole? role = _selected;
    if (role == null) return;

    setState(() => _busy = true);
    await context.read<AuthRepository>().selectRole(role);
    if (!mounted) return;
    setState(() => _busy = false);

    if (widget.isChangingRole) {
      Navigator.of(context).pop(true);
      return;
    }
    Navigator.of(context).pushNamedAndRemoveUntil(
      Routes.locationPermission,
      (Route<dynamic> route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: widget.isChangingRole
          ? AppBar(title: Text(s.changeRole), leading: const BackButton())
          : null,
      body: SafeArea(
        child: Column(
          children: <Widget>[
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 12),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 520),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        Text(
                          s.chooseRole,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          s.chooseRoleSub,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 24),
                        ...UserRole.values.map(
                          (UserRole role) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _RoleCard(
                              role: role,
                              selected: _selected == role,
                              onTap: () => setState(() => _selected = role),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 520),
                  child: LoadingButton(
                    label: widget.isChangingRole ? s.save : s.next,
                    isLoading: _busy,
                    onPressed: _selected == null ? null : _continue,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.role,
    required this.selected,
    required this.onTap,
  });

  final UserRole role;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final String description = switch (role) {
      UserRole.commuter => s.roleCommuterDesc,
      UserRole.barangayOfficial => s.roleBarangayDesc,
      UserRole.schoolAdmin => s.roleSchoolAdminDesc,
      UserRole.businessOwner => s.roleBusinessDesc,
    };

    return Material(
      color: selected ? AppColors.brandBlueLight : AppColors.surface,
      borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
            border: Border.all(
              color: selected ? AppColors.brandBlue : AppColors.line,
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            children: <Widget>[
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: selected
                      ? AppColors.brandBlue
                      : AppColors.brandBlueLight,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  HazardVisuals.roleIcon(role),
                  color: selected ? Colors.white : AppColors.brandBlue,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      HazardVisuals.roleLabel(role, s),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      description,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    if (role.canVerify) ...<Widget>[
                      const SizedBox(height: 8),
                      StatusBadge(
                        label: s.verificationPanel,
                        color: AppColors.safe,
                        icon: Icons.verified_outlined,
                        compact: true,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                selected
                    ? Icons.radio_button_checked
                    : Icons.radio_button_unchecked,
                color: selected ? AppColors.brandBlue : AppColors.inkFaint,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
