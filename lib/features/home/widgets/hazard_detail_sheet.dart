import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/geo/lat_lng.dart';
import '../../../core/i18n/strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/hazard_visuals.dart';
import '../../../core/utils/time_ago.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/hazard_photo.dart';
import '../../../data/models/hazard_report.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../../data/repositories/bantay_repository.dart';
import '../../../state/location_controller.dart';

/// Bottom sheet shown when a hazard pin is tapped.
///
/// This is where the community verification loop actually happens: the photo
/// and timestamp let a user judge the report, the Yes/No vote feeds the
/// confirmation counter, and "Report inaccurate" flags it for an official.
class HazardDetailSheet extends StatelessWidget {
  const HazardDetailSheet({
    super.key,
    required this.reportId,
    required this.onGetDirections,
  });

  final String reportId;
  final void Function(HazardReport report) onGetDirections;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    // Watching the repository keeps the sheet live: a vote cast here updates
    // the counter in place without closing and reopening the sheet.
    final HazardReport? report = context
        .select<BantayRepository, HazardReport?>(
          (BantayRepository repo) => repo.reportById(reportId),
        );
    if (report == null) return const SizedBox.shrink();

    final String? userId = context.select<AuthRepository, String?>(
      (AuthRepository auth) => auth.currentUser?.id,
    );
    final LatLng userPoint = context.select<LocationController, LatLng>(
      (LocationController loc) => loc.current,
    );
    final double distance = Geo.distanceMeters(userPoint, report.location);

    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      minChildSize: 0.3,
      maxChildSize: 0.92,
      expand: false,
      builder: (BuildContext context, ScrollController scrollController) {
        return ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: HazardVisuals.statusColor(report.status)
                        .withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    HazardVisuals.icon(report.type),
                    color: HazardVisuals.statusColor(report.status),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        HazardVisuals.label(report.type, s),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        report.addressLabel,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: <Widget>[
                StatusBadge(
                  label: report.isVerified ? s.verifiedBadge : s.pendingBadge,
                  color: HazardVisuals.statusColor(report.status),
                  icon: report.isVerified
                      ? Icons.verified_rounded
                      : Icons.schedule,
                  filled: report.isVerified,
                ),
                StatusBadge(
                  label: HazardVisuals.severityLabel(report.severity, s),
                  color: HazardVisuals.severityColor(report.severity),
                  icon: HazardVisuals.severityIcon(report.severity),
                ),
                StatusBadge(
                  label: Geo.formatDistance(distance),
                  color: AppColors.brandBlue,
                  icon: Icons.near_me_outlined,
                ),
              ],
            ),
            const SizedBox(height: 16),
            HazardPhoto(
              photoPath: report.photoPath,
              type: report.type,
              height: 172,
              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
            ),
            if (report.description.isNotEmpty) ...<Widget>[
              const SizedBox(height: 14),
              Text(
                report.description,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            ],
            const SizedBox(height: 14),
            _MetaRow(
              icon: Icons.schedule,
              label: TimeAgo.format(report.reportedAt, s),
            ),
            _MetaRow(
              icon: Icons.person_outline,
              label: '${s.reportedBy} ${report.reporterName}',
            ),
            if (report.verifiedBy != null)
              _MetaRow(
                icon: Icons.verified_outlined,
                label: '${s.verifiedByLabel} ${report.verifiedBy}',
                color: AppColors.safe,
              ),
            const SizedBox(height: 18),
            _ConfirmationPanel(report: report, userId: userId),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () {
                Navigator.of(context).pop();
                onGetDirections(report);
              },
              icon: const Icon(Icons.directions),
              label: Text(s.getDirections),
            ),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: userId == null || report.hasFlagged(userId)
                  ? null
                  : () async {
                      await context.read<BantayRepository>().flagReport(
                        reportId: report.id,
                        userId: userId,
                      );
                      if (!context.mounted) return;
                      AppToast.info(context, s.flaggedForReview);
                    },
              icon: const Icon(Icons.flag_outlined, size: 18),
              label: Text(
                report.flagCount > 0
                    ? '${s.reportInaccurate} (${report.flagCount})'
                    : s.reportInaccurate,
              ),
              style: TextButton.styleFrom(foregroundColor: AppColors.inkMuted),
            ),
          ],
        );
      },
    );
  }
}

/// The "Is this still here? Yes / No" vote with its live counter.
class _ConfirmationPanel extends StatelessWidget {
  const _ConfirmationPanel({required this.report, required this.userId});

  final HazardReport report;
  final String? userId;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final bool hasVoted = userId != null && report.hasVoted(userId!);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  s.stillThereQuestion,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              Row(
                children: <Widget>[
                  const Icon(
                    Icons.how_to_vote_outlined,
                    size: 16,
                    color: AppColors.safe,
                  ),
                  const SizedBox(width: 5),
                  Text(
                    '${report.confirmCount}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: AppColors.safe,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${report.confirmCount} ${s.confirmations}'
            '${report.denyCount > 0 ? '  -  ${report.denyCount} ${s.no.toLowerCase()}' : ''}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          if (hasVoted)
            Row(
              children: <Widget>[
                const Icon(Icons.check_circle, size: 18, color: AppColors.safe),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    s.thanksForConfirming,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.safeDark,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            )
          else
            Row(
              children: <Widget>[
                Expanded(
                  child: _VoteButton(
                    label: s.yes,
                    icon: Icons.thumb_up_outlined,
                    color: AppColors.safe,
                    onTap: userId == null
                        ? null
                        : () => _vote(context, confirms: true),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _VoteButton(
                    label: s.no,
                    icon: Icons.thumb_down_outlined,
                    color: AppColors.inkMuted,
                    onTap: userId == null
                        ? null
                        : () => _vote(context, confirms: false),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Future<void> _vote(BuildContext context, {required bool confirms}) async {
    final S s = S.of(context);
    await context.read<BantayRepository>().voteOnReport(
      reportId: report.id,
      userId: userId!,
      confirms: confirms,
    );
    if (!context.mounted) return;
    AppToast.success(context, s.thanksForConfirming);
  }
}

class _VoteButton extends StatelessWidget {
  const _VoteButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 18),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: color,
        minimumSize: const Size.fromHeight(46),
        side: BorderSide(color: color.withValues(alpha: 0.4), width: 1.5),
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.icon, required this.label, this.color});

  final IconData icon;
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: <Widget>[
          Icon(icon, size: 16, color: color ?? AppColors.inkFaint),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: color ?? AppColors.inkMuted),
            ),
          ),
        ],
      ),
    );
  }
}
