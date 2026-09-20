import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/hazard_visuals.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/hazard_photo.dart';
import '../../data/models/hazard_report.dart';
import '../../state/shell_controller.dart';

/// Confirmation shown after a report is filed.
///
/// It states plainly what happens next - pending verification, already
/// visible as an orange pin - so the user is not left wondering whether the
/// report went anywhere.
class ReportSuccessScreen extends StatelessWidget {
  const ReportSuccessScreen({super.key, required this.report});

  final HazardReport report;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Center(
                    child: Container(
                      width: 108,
                      height: 108,
                      decoration: const BoxDecoration(
                        color: AppColors.safeLight,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.check_rounded,
                        size: 58,
                        color: AppColors.safe,
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  Text(
                    s.reportSubmittedTitle,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    s.reportSubmittedBody,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 26),
                  SectionCard(
                    child: Row(
                      children: <Widget>[
                        SizedBox(
                          width: 62,
                          height: 62,
                          child: HazardPhoto(
                            photoPath: report.photoPath,
                            type: report.type,
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text(
                                HazardVisuals.label(report.type, s),
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                report.addressLabel,
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                              const SizedBox(height: 8),
                              StatusBadge(
                                label: s.pendingBadge,
                                color: AppColors.warning,
                                icon: Icons.schedule,
                                compact: true,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppTheme.radiusLarge),
                  FilledButton.icon(
                    onPressed: () {
                      context.read<ShellController>()
                        ..goToTab(ShellController.mapTab)
                        ..focusReport(report.id);
                      Navigator.of(context).pop();
                    },
                    icon: const Icon(Icons.map_outlined),
                    label: Text(s.backToMap),
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
