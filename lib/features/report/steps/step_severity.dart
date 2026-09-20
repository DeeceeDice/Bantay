import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/i18n/strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/hazard_visuals.dart';
import '../../../data/models/enums.dart';
import '../../../state/report_draft_controller.dart';

/// Step 3: how dangerous is it.
///
/// Severity drives the alert radius and the sort order officials see, so each
/// option spells out what it means in practice rather than relying on the
/// label alone.
class StepSeverity extends StatelessWidget {
  const StepSeverity({super.key});

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final ReportDraftController draft = context.watch<ReportDraftController>();

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: <Widget>[
        Text(
          s.stepSeverityTitle,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 6),
        Text(
          draft.type == null
              ? draft.addressLabel
              : '${HazardVisuals.label(draft.type!, s)} - ${draft.addressLabel}',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 20),
        ...HazardSeverity.values.map(
          (HazardSeverity severity) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _SeverityTile(
              severity: severity,
              selected: draft.severity == severity,
              onTap: () => draft.setSeverity(severity),
            ),
          ),
        ),
      ],
    );
  }
}

class _SeverityTile extends StatelessWidget {
  const _SeverityTile({
    required this.severity,
    required this.selected,
    required this.onTap,
  });

  final HazardSeverity severity;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final Color color = HazardVisuals.severityColor(severity);

    final String explainer = switch (severity) {
      HazardSeverity.passableWithCaution =>
        s.isFilipino
            ? 'Nadadaanan pa pero mag-ingat. Babalaan ang mga malapit.'
            : 'Still passable but risky. Nearby users get a low-priority alert.',
      HazardSeverity.notPassable =>
        s.isFilipino
            ? 'Hindi madaanan. Iiwasan ito ng mga ruta at direksyon.'
            : 'Blocked. Routes and directions will steer around it.',
      HazardSeverity.lifeThreatening =>
        s.isFilipino
            ? 'Delikado sa buhay. Agad na aabisuhan ang barangay at mga malapit.'
            : 'Immediate danger. The barangay and everyone nearby are alerted at once.',
    };

    return Material(
      color: selected ? color.withValues(alpha: 0.10) : AppColors.surface,
      borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
            border: Border.all(
              color: selected ? color : AppColors.line,
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: selected ? color : color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  HazardVisuals.severityIcon(severity),
                  color: selected ? Colors.white : color,
                  size: 23,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      HazardVisuals.severityLabel(severity, s),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      explainer,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                selected ? Icons.check_circle : Icons.radio_button_unchecked,
                color: selected ? color : AppColors.inkFaint,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
