import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/geo/lat_lng.dart';
import '../../core/i18n/strings.dart';
import '../../core/map/bantay_map.dart';
import '../../core/map/map_layers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/hazard_visuals.dart';
import '../../core/utils/time_ago.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/hazard_photo.dart';
import '../../core/widgets/map_pins.dart';
import '../../data/models/hazard_report.dart';
import '../../data/models/user_profile.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/bantay_repository.dart';
import '../../data/seed/seed_data.dart';

/// Where barangay officials and school admins act on community reports.
///
/// Verifying a report is what turns an orange pin red for every other user,
/// so this screen shows the evidence (photo, severity, confirmations) next to
/// the decision rather than making officials dig for it.
class VerificationPanelScreen extends StatefulWidget {
  const VerificationPanelScreen({super.key});

  @override
  State<VerificationPanelScreen> createState() =>
      _VerificationPanelScreenState();
}

class _VerificationPanelScreenState extends State<VerificationPanelScreen> {
  late final BantayMapController _map = BantayMapController(
    center: SeedData.defaultCenter,
    zoom: 14,
  );
  bool _mapView = false;
  String? _selectedId;
  String? _busyId;

  @override
  void dispose() {
    _map.dispose();
    super.dispose();
  }

  Future<void> _verify(HazardReport report) async {
    final S s = S.of(context);
    setState(() => _busyId = report.id);
    await context.read<BantayRepository>().verifyReport(report.id);
    if (!mounted) return;
    setState(() {
      _busyId = null;
      if (_selectedId == report.id) _selectedId = null;
    });
    AppToast.success(context, s.reportVerifiedToast);
  }

  Future<void> _reject(HazardReport report) async {
    final S s = S.of(context);
    final bool confirmed = await confirmDialog(
      context,
      title: s.rejectConfirmTitle,
      message: s.rejectConfirmBody,
      confirmLabel: s.reject,
      cancelLabel: s.cancel,
    );
    if (!confirmed || !mounted) return;

    setState(() => _busyId = report.id);
    await context.read<BantayRepository>().rejectReport(report.id);
    if (!mounted) return;
    setState(() {
      _busyId = null;
      if (_selectedId == report.id) _selectedId = null;
    });
    AppToast.info(context, s.reportRejectedToast);
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final UserProfile? official = context.watch<AuthRepository>().currentUser;
    final BantayRepository repo = context.watch<BantayRepository>();

    if (official == null || !official.role.canVerify) {
      return Scaffold(
        appBar: AppBar(title: Text(s.verificationPanel)),
        body: EmptyState(
          icon: Icons.lock_outline,
          message: s.isFilipino
              ? 'Para lang ito sa mga opisyal ng barangay at school admin.'
              : 'This panel is only available to barangay officials and '
                    'school admins.',
        ),
      );
    }

    final List<HazardReport> pending = repo.pendingForOfficial(official);

    return Scaffold(
      appBar: AppBar(
        title: Text(s.verificationPanel),
        leading: const BackButton(),
        actions: <Widget>[
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: SegmentedButton<bool>(
              segments: <ButtonSegment<bool>>[
                ButtonSegment<bool>(
                  value: false,
                  icon: const Icon(Icons.list, size: 18),
                  tooltip: s.listView,
                ),
                ButtonSegment<bool>(
                  value: true,
                  icon: const Icon(Icons.map_outlined, size: 18),
                  tooltip: s.mapView,
                ),
              ],
              selected: <bool>{_mapView},
              showSelectedIcon: false,
              onSelectionChanged: (Set<bool> value) =>
                  setState(() => _mapView = value.first),
              style: const ButtonStyle(visualDensity: VisualDensity.compact),
            ),
          ),
        ],
      ),
      body: Column(
        children: <Widget>[
          _AreaHeader(official: official, pendingCount: pending.length),
          Expanded(
            child: pending.isEmpty
                ? EmptyState(
                    icon: Icons.verified_outlined,
                    title: s.allCaughtUp,
                    message: s.nothingToVerify,
                  )
                : _mapView
                ? _buildMapView(pending)
                : _buildListView(pending),
          ),
        ],
      ),
    );
  }

  Widget _buildListView(List<HazardReport> pending) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
      itemCount: pending.length,
      separatorBuilder: (BuildContext context, int index) =>
          const SizedBox(height: 12),
      itemBuilder: (BuildContext context, int index) {
        final HazardReport report = pending[index];
        return _PendingCard(
          report: report,
          busy: _busyId == report.id,
          onVerify: () => _verify(report),
          onReject: () => _reject(report),
        );
      },
    );
  }

  Widget _buildMapView(List<HazardReport> pending) {
    final HazardReport? selected = _selectedId == null
        ? null
        : pending.where((HazardReport r) => r.id == _selectedId).firstOrNull;

    return Stack(
      children: <Widget>[
        BantayMap(
          controller: _map,
          markers: <MapMarker>[
            for (final HazardReport report in pending)
              MapMarker(
                id: report.id,
                point: report.location,
                size: const Size(44, 53),
                onTap: () {
                  setState(() => _selectedId = report.id);
                  _map.moveTo(report.location);
                },
                child: HazardPin(
                  type: report.type,
                  status: report.status,
                  selected: _selectedId == report.id,
                ),
              ),
          ],
          onTap: (LatLng _) => setState(() => _selectedId = null),
        ),
        if (selected != null)
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: _PendingCard(
              report: selected,
              busy: _busyId == selected.id,
              onVerify: () => _verify(selected),
              onReject: () => _reject(selected),
            ),
          ),
      ],
    );
  }
}

class _AreaHeader extends StatelessWidget {
  const _AreaHeader({required this.official, required this.pendingCount});

  final UserProfile official;
  final int pendingCount;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return Container(
      width: double.infinity,
      color: AppColors.brandBlueLight,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
      child: Row(
        children: <Widget>[
          const Icon(
            Icons.shield_outlined,
            size: 20,
            color: AppColors.brandBlueDark,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  s.pendingInYourArea,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.brandBlueDark,
                    fontSize: 14,
                  ),
                ),
                Text(
                  '${official.barangay} - '
                  '${Geo.formatDistance(official.areaRadiusMeters)} radius',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.brandBlue,
                  ),
                ),
              ],
            ),
          ),
          StatusBadge(
            label: '$pendingCount',
            color: AppColors.brandBlueDark,
            filled: true,
          ),
        ],
      ),
    );
  }
}

/// One pending report with its evidence and the verify/reject actions.
class _PendingCard extends StatelessWidget {
  const _PendingCard({
    required this.report,
    required this.busy,
    required this.onVerify,
    required this.onReject,
  });

  final HazardReport report;
  final bool busy;
  final VoidCallback onVerify;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return SectionCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                SizedBox(
                  width: 74,
                  height: 74,
                  child: HazardPhoto(
                    photoPath: report.photoPath,
                    type: report.type,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                const SizedBox(width: 12),
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
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: <Widget>[
                          StatusBadge(
                            label: HazardVisuals.severityLabel(
                              report.severity,
                              s,
                            ),
                            color: HazardVisuals.severityColor(report.severity),
                            icon: HazardVisuals.severityIcon(report.severity),
                            compact: true,
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
                          if (report.flagCount > 0)
                            StatusBadge(
                              label: '${report.flagCount}',
                              color: AppColors.brandRed,
                              icon: Icons.flag_outlined,
                              compact: true,
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (report.description.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              child: Text(
                '"${report.description}"',
                style: Theme.of(context).textTheme.bodyMedium
                    ?.copyWith(fontStyle: FontStyle.italic),
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
            child: Text(
              '${s.reportedBy} ${report.reporterName}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: busy ? null : onReject,
                    icon: const Icon(Icons.close, size: 18),
                    label: Text(s.reject),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.inkMuted,
                      minimumSize: const Size.fromHeight(46),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: LoadingButton(
                    label: s.verify,
                    icon: Icons.verified_rounded,
                    isLoading: busy,
                    background: AppColors.safe,
                    onPressed: onVerify,
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
