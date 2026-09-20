import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../app/routes.dart';
import '../../core/geo/lat_lng.dart';
import '../../core/i18n/strings.dart';
import '../../core/map/bantay_map.dart';
import '../../core/map/map_layers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/hazard_visuals.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/map_pins.dart';
import '../../data/models/enums.dart';
import '../../data/models/hazard_report.dart';
import '../../data/models/safe_spot.dart';
import '../../data/repositories/bantay_repository.dart';
import '../../data/seed/seed_data.dart';
import '../../state/location_controller.dart';
import '../../state/settings_controller.dart';
import '../../state/shell_controller.dart';
import '../navigation/directions_screen.dart';
import 'widgets/hazard_detail_sheet.dart';
import 'widgets/map_filter_sheet.dart';
import 'widgets/map_search_bar.dart';
import 'widgets/safe_spot_sheet.dart';

/// The live hazard map: Bantay's home screen.
class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  late final BantayMapController _map = BantayMapController(
    center: SeedData.defaultCenter,
    zoom: 15.5,
  );

  String? _selectedReportId;
  String? _selectedSpotId;
  SafetyCheckResult? _safetyResult;
  bool _checkingSafety = false;
  bool _offlineNoticeDismissed = false;
  bool _centredOnUser = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _centreOnUserOnce());
  }

  @override
  void dispose() {
    _map.dispose();
    super.dispose();
  }

  /// Centres on the user's first fix, once, so later pans are never yanked
  /// back as location updates arrive.
  void _centreOnUserOnce() {
    if (_centredOnUser || !mounted) return;
    final LocationController location = context.read<LocationController>();
    _map.moveTo(location.current, zoom: 15.5);
    _centredOnUser = true;
  }

  /// Handles a focus request from another tab (an alert, a safe spot).
  void _consumeShellFocus(ShellController shell, BantayRepository repo) {
    final String? reportId = shell.focusReportId;
    final String? spotId = shell.focusSafeSpotId;
    final LatLng? point = shell.focusPoint;
    if (reportId == null && spotId == null && point == null) return;

    shell.consumeFocus();

    // Deferred to the next frame: this runs during build, and moving the
    // camera notifies listeners, which would rebuild mid-build.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (reportId != null) {
        final HazardReport? report = repo.reportById(reportId);
        if (report == null) return;
        _map.moveTo(report.location, zoom: 17);
        setState(() {
          _selectedReportId = reportId;
          _selectedSpotId = null;
        });
        _openHazardSheet(reportId);
      } else if (spotId != null) {
        final SafeSpot? spot = repo.safeSpotById(spotId);
        if (spot == null) return;
        _map.moveTo(spot.location, zoom: 17);
        setState(() {
          _selectedSpotId = spotId;
          _selectedReportId = null;
        });
        _openSafeSpotSheet(spotId);
      } else if (point != null) {
        _map.moveTo(point, zoom: 17);
      }
    });
  }

  Future<void> _openHazardSheet(String reportId) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (BuildContext context) => HazardDetailSheet(
        reportId: reportId,
        onGetDirections: _openDirections,
      ),
    );
    if (mounted) setState(() => _selectedReportId = null);
  }

  Future<void> _openSafeSpotSheet(String spotId) async {
    await showModalBottomSheet<void>(
      context: context,
      builder: (BuildContext context) => SafeSpotSheet(spotId: spotId),
    );
    if (mounted) setState(() => _selectedSpotId = null);
  }

  void _openDirections(HazardReport report) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        settings: const RouteSettings(name: Routes.directions),
        builder: (BuildContext _) => DirectionsScreen(
          destination: report.location,
          destinationLabel: report.addressLabel,
          avoidReportId: report.id,
        ),
      ),
    );
  }

  /// The "Am I Safe Here?" check.
  Future<void> _checkSafety() async {
    setState(() {
      _checkingSafety = true;
      _safetyResult = null;
    });

    final BantayRepository repo = context.read<BantayRepository>();
    final LocationController location = context.read<LocationController>();
    final SettingsController settings = context.read<SettingsController>();

    // A brief scan so the check reads as deliberate work rather than a
    // banner that blinks into existence.
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (!mounted) return;

    setState(() {
      _safetyResult = repo.checkSafety(
        location.current,
        settings.alertRadiusMeters,
      );
      _checkingSafety = false;
    });
  }

  void _jumpToNearestHazard() {
    final HazardReport? nearest = _safetyResult?.nearest;
    if (nearest == null) return;
    _map.moveTo(nearest.location, zoom: 17);
    setState(() => _selectedReportId = nearest.id);
    _openHazardSheet(nearest.id);
  }

  void _recentre() {
    final LocationController location = context.read<LocationController>();
    location.refresh();
    _map.moveTo(location.current, zoom: 16);
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final BantayRepository repo = context.watch<BantayRepository>();
    final SettingsController settings = context.watch<SettingsController>();
    final LocationController location = context.watch<LocationController>();
    final ShellController shell = context.watch<ShellController>();

    _consumeShellFocus(shell, repo);

    final List<MapMarker> markers = _buildMarkers(
      context,
      repo,
      settings,
      location,
    );

    return Scaffold(
      body: Stack(
        children: <Widget>[
          BantayMap(
            controller: _map,
            markers: markers,
            circles: <MapCircle>[
              // The alert radius the safety check uses, so "safe" is a claim
              // the user can see the bounds of rather than take on trust.
              if (_safetyResult != null)
                MapCircle(
                  center: location.current,
                  radiusMeters: settings.alertRadiusMeters,
                  color:
                      (_safetyResult!.isSafe
                              ? AppColors.safe
                              : AppColors.warning)
                          .withValues(alpha: 0.10),
                  borderColor:
                      (_safetyResult!.isSafe
                              ? AppColors.safe
                              : AppColors.warning)
                          .withValues(alpha: 0.5),
                ),
            ],
            onTap: (_) {
              setState(() {
                _selectedReportId = null;
                _selectedSpotId = null;
              });
              FocusScope.of(context).unfocus();
            },
          ),
          _TopOverlay(
            offline: settings.offlineMode && !_offlineNoticeDismissed,
            locationIsFallback: !location.hasRealFix,
            onDismissOffline: () =>
                setState(() => _offlineNoticeDismissed = true),
            onSearchSelected: (SearchSuggestion suggestion) =>
                _map.moveTo(suggestion.location, zoom: 16.5),
            onFilterTap: () => MapFilterSheet.show(context),
            activeFilterCount: _activeFilterCount(settings),
          ),
          if (_safetyResult != null || _checkingSafety)
            Positioned(
              left: 16,
              // Clears the map control column on the right (16 inset + 46
              // wide + 14 gap) so the banner's action button is never
              // covered by the recentre and zoom buttons.
              right: 76,
              bottom: 172,
              child: _SafetyBanner(
                result: _safetyResult,
                checking: _checkingSafety,
                onJumpToHazard: _jumpToNearestHazard,
                onDismiss: () => setState(() => _safetyResult = null),
              ),
            ),
          Positioned(
            right: 16,
            bottom: 104,
            child: Column(
              children: <Widget>[
                _MapFab(
                  icon: Icons.my_location,
                  tooltip: s.recenter,
                  onPressed: _recentre,
                ),
                const SizedBox(height: 10),
                _MapFab(
                  icon: Icons.add,
                  tooltip: 'Zoom in',
                  onPressed: () => _map.zoomBy(1),
                  small: true,
                ),
                const SizedBox(height: 6),
                _MapFab(
                  icon: Icons.remove,
                  tooltip: 'Zoom out',
                  onPressed: () => _map.zoomBy(-1),
                  small: true,
                ),
              ],
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 24,
            child: Row(
              children: <Widget>[
                Expanded(
                  child: _SafetyCheckButton(
                    label: _checkingSafety
                        ? s.checkingSurroundings
                        : s.amISafeHere,
                    busy: _checkingSafety,
                    onPressed: _checkingSafety ? null : _checkSafety,
                  ),
                ),
                const SizedBox(width: 12),
                _ReportFab(
                  onPressed: () =>
                      Navigator.of(context).pushNamed(Routes.report),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  int _activeFilterCount(SettingsController settings) {
    int count = 0;
    if (settings.verifiedOnly) count++;
    if (!settings.showsLayer(MapLayer.safeSpots)) count++;
    if (settings.offlineMode) count++;
    return count;
  }

  List<MapMarker> _buildMarkers(
    BuildContext context,
    BantayRepository repo,
    SettingsController settings,
    LocationController location,
  ) {
    final List<MapMarker> markers = <MapMarker>[];

    if (settings.showsLayer(MapLayer.safeSpots)) {
      for (final SafeSpot spot in repo.safeSpots) {
        markers.add(
          MapMarker(
            id: 'spot-${spot.id}',
            point: spot.location,
            size: const Size(38, 38),
            anchor: MarkerAnchor.centre,
            onTap: () {
              setState(() {
                _selectedSpotId = spot.id;
                _selectedReportId = null;
              });
              _openSafeSpotSheet(spot.id);
            },
            child: SafeSpotPin(
              category: spot.category,
              selected: _selectedSpotId == spot.id,
            ),
          ),
        );
      }
    }

    if (settings.showsLayer(MapLayer.pendingReports)) {
      for (final HazardReport report in repo.pendingReports) {
        markers.add(_hazardMarker(report));
      }
    }

    // Verified hazards are added last so they paint above pending ones: a
    // confirmed danger must never be hidden behind an unconfirmed report.
    if (settings.showsLayer(MapLayer.verifiedHazards)) {
      for (final HazardReport report in repo.verifiedHazards) {
        markers.add(_hazardMarker(report));
      }
    }

    markers.add(
      MapMarker(
        id: 'user',
        point: location.current,
        size: const Size(46, 46),
        anchor: MarkerAnchor.centre,
        child: IgnorePointer(
          child: UserLocationDot(stale: !location.hasRealFix),
        ),
      ),
    );

    return markers;
  }

  MapMarker _hazardMarker(HazardReport report) => MapMarker(
    id: 'hazard-${report.id}',
    point: report.location,
    size: const Size(44, 53),
    onTap: () {
      setState(() {
        _selectedReportId = report.id;
        _selectedSpotId = null;
      });
      _openHazardSheet(report.id);
    },
    child: HazardPin(
      type: report.type,
      status: report.status,
      selected: _selectedReportId == report.id,
    ),
  );
}

/// Search bar plus the offline and fallback-location notices.
class _TopOverlay extends StatelessWidget {
  const _TopOverlay({
    required this.offline,
    required this.locationIsFallback,
    required this.onDismissOffline,
    required this.onSearchSelected,
    required this.onFilterTap,
    required this.activeFilterCount,
  });

  final bool offline;
  final bool locationIsFallback;
  final VoidCallback onDismissOffline;
  final void Function(SearchSuggestion) onSearchSelected;
  final VoidCallback onFilterTap;
  final int activeFilterCount;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            MapSearchBar(
              onSelected: onSearchSelected,
              onFilterTap: onFilterTap,
              activeFilterCount: activeFilterCount,
            ),
            if (offline) ...<Widget>[
              const SizedBox(height: 10),
              StatusBanner(
                icon: Icons.wifi_off,
                title: s.offlineBanner,
                message: s.offlineSmsExplainer,
                color: AppColors.inkMuted,
                onDismiss: onDismissOffline,
              ),
            ] else if (locationIsFallback) ...<Widget>[
              const SizedBox(height: 10),
              StatusBanner(
                icon: Icons.location_off_outlined,
                title: s.locationDeniedNotice,
                color: AppColors.brandBlue,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Result banner for the "Am I Safe Here?" check.
class _SafetyBanner extends StatelessWidget {
  const _SafetyBanner({
    required this.result,
    required this.checking,
    required this.onJumpToHazard,
    required this.onDismiss,
  });

  final SafetyCheckResult? result;
  final bool checking;
  final VoidCallback onJumpToHazard;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    if (checking || result == null) {
      return StatusBanner(
        icon: Icons.radar,
        title: s.checkingSurroundings,
        color: AppColors.brandBlue,
      );
    }

    final SafetyCheckResult found = result!;
    if (found.isSafe) {
      return StatusBanner(
        icon: Icons.verified_user,
        title: s.safeZoneTitle,
        message: s.safeZoneBody,
        color: AppColors.safe,
        onDismiss: onDismiss,
      );
    }

    final HazardSeverity worst =
        found.worstSeverity ?? HazardSeverity.notPassable;
    return StatusBanner(
      icon: Icons.warning_rounded,
      title: s.hazardNearbyTitle,
      message:
          '${found.hazards.length} '
          '${found.hazards.length == 1 ? 'hazard' : 'hazards'} - '
          '${Geo.formatDistance(found.nearestDistanceMeters ?? 0)} '
          '${s.isFilipino ? 'ang layo' : 'away'}',
      color: HazardVisuals.severityColor(worst),
      action: TextButton(
        onPressed: onJumpToHazard,
        style: TextButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: Colors.white.withValues(alpha: 0.18),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        ),
        child: Text(s.jumpToHazard),
      ),
      onDismiss: onDismiss,
    );
  }
}

class _SafetyCheckButton extends StatelessWidget {
  const _SafetyCheckButton({
    required this.label,
    required this.busy,
    required this.onPressed,
  });

  final String label;
  final bool busy;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
      elevation: 5,
      shadowColor: const Color(0x40000000),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        child: Container(
          height: 54,
          padding: const EdgeInsets.symmetric(horizontal: 18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
            border: Border.all(color: AppColors.brandBlue, width: 1.6),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              if (busy)
                const SizedBox(
                  width: 19,
                  height: 19,
                  child: CircularProgressIndicator(strokeWidth: 2.4),
                )
              else
                const Icon(
                  Icons.shield_outlined,
                  color: AppColors.brandBlue,
                  size: 21,
                ),
              const SizedBox(width: 10),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                    color: AppColors.brandBlue,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReportFab extends StatelessWidget {
  const _ReportFab({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: S.of(context).reportHazard,
      child: SizedBox(
        width: 54,
        height: 54,
        child: FloatingActionButton(
          onPressed: onPressed,
          backgroundColor: AppColors.brandRed,
          foregroundColor: Colors.white,
          elevation: 5,
          shape: const CircleBorder(),
          tooltip: S.of(context).reportHazard,
          child: const Icon(Icons.add, size: 30),
        ),
      ),
    );
  }
}

class _MapFab extends StatelessWidget {
  const _MapFab({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    this.small = false,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final double size = small ? 38 : 46;
    return Tooltip(
      message: tooltip,
      child: Material(
        color: AppColors.surface,
        shape: const CircleBorder(),
        elevation: 4,
        shadowColor: const Color(0x40000000),
        child: InkWell(
          onTap: onPressed,
          customBorder: const CircleBorder(),
          child: SizedBox(
            width: size,
            height: size,
            child: Icon(
              icon,
              size: small ? 20 : 23,
              color: AppColors.brandBlue,
            ),
          ),
        ),
      ),
    );
  }
}
