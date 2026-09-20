import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/hazard_visuals.dart';
import '../../core/utils/time_ago.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/hazard_photo.dart';
import '../../data/models/enums.dart';
import '../../data/models/hazard_report.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/bantay_repository.dart';
import '../../state/shell_controller.dart';

/// Every report the signed-in user has filed, with its current state.
class MyReportsScreen extends StatelessWidget {
  const MyReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final String? userId = context.select<AuthRepository, String?>(
      (AuthRepository auth) => auth.currentUser?.id,
    );
    final BantayRepository repo = context.watch<BantayRepository>();
    final List<HazardReport> reports = userId == null
        ? <HazardReport>[]
        : repo.myReports(userId);

    return Scaffold(
      appBar: AppBar(title: Text(s.myReports), leading: const BackButton()),
      body: reports.isEmpty
          ? EmptyState(icon: Icons.assignment_outlined, message: s.noReportsYet)
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
              itemCount: reports.length,
              separatorBuilder: (BuildContext context, int index) =>
                  const SizedBox(height: 12),
              itemBuilder: (BuildContext context, int index) {
                final HazardReport report = reports[index];
                return SectionCard(
                  padding: const EdgeInsets.all(14),
                  onTap: report.status == ReportStatus.rejected
                      ? null
                      : () {
                          context.read<ShellController>().focusReport(
                            report.id,
                          );
                          Navigator.of(context).pop();
                        },
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
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
                      const SizedBox(width: 13),
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
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 6,
                              runSpacing: 6,
                              children: <Widget>[
                                StatusBadge(
                                  label: switch (report.status) {
                                    ReportStatus.verified => s.verifiedBadge,
                                    ReportStatus.pending => s.pendingBadge,
                                    ReportStatus.rejected => s.reject,
                                  },
                                  color: HazardVisuals.statusColor(
                                    report.status,
                                  ),
                                  icon: switch (report.status) {
                                    ReportStatus.verified =>
                                      Icons.verified_rounded,
                                    ReportStatus.pending => Icons.schedule,
                                    ReportStatus.rejected =>
                                      Icons.cancel_outlined,
                                  },
                                  compact: true,
                                  filled:
                                      report.status == ReportStatus.verified,
                                ),
                                StatusBadge(
                                  label: TimeAgo.compact(report.reportedAt),
                                  color: AppColors.inkMuted,
                                  icon: Icons.schedule,
                                  compact: true,
                                ),
                                if (report.confirmCount > 0)
                                  StatusBadge(
                                    label: '${report.confirmCount}',
                                    color: AppColors.safe,
                                    icon: Icons.how_to_vote_outlined,
                                    compact: true,
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
