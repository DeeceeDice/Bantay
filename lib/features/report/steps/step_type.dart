import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/i18n/strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/hazard_visuals.dart';
import '../../../data/models/enums.dart';
import '../../../state/report_draft_controller.dart';

/// Step 2: what kind of hazard is it.
class StepType extends StatelessWidget {
  const StepType({super.key});

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final ReportDraftController draft = context.watch<ReportDraftController>();

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: <Widget>[
        Text(s.stepTypeTitle, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 6),
        Text(draft.addressLabel, style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 20),
        ...HazardType.values.map(
          (HazardType type) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _TypeTile(
              type: type,
              selected: draft.type == type,
              onTap: () => draft.setType(type),
            ),
          ),
        ),
      ],
    );
  }
}

class _TypeTile extends StatelessWidget {
  const _TypeTile({
    required this.type,
    required this.selected,
    required this.onTap,
  });

  final HazardType type;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return Material(
      color: selected ? AppColors.brandRedLight : AppColors.surface,
      borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
            border: Border.all(
              color: selected ? AppColors.brandRed : AppColors.line,
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            children: <Widget>[
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: selected ? AppColors.brandRed : AppColors.surfaceAlt,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  HazardVisuals.icon(type),
                  color: selected ? Colors.white : AppColors.inkMuted,
                  size: 23,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  HazardVisuals.label(type, s),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              Icon(
                selected ? Icons.check_circle : Icons.radio_button_unchecked,
                color: selected ? AppColors.brandRed : AppColors.inkFaint,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
