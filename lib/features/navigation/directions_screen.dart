import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/geo/lat_lng.dart';
import '../../core/i18n/strings.dart';
import '../../core/map/bantay_map.dart';
import '../../core/map/map_layers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/hazard_visuals.dart';
import '../../core/utils/time_ago.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/map_pins.dart';
import '../../data/models/hazard_report.dart';
import '../../data/repositories/bantay_repository.dart';
import '../../state/location_controller.dart';

/// Route preview and simulated turn-by-turn navigation.
///
/// The route is generated locally by bending a straight line away from any
/// verified hazard that sits on it, which is enough to demonstrate the
/// avoidance behaviour end to end without a routing provider. Swapping in a
/// real directions API means replacing [_buildRoute]; everything else here -
/// the ETA, the progress, the hazard warnings - already works off the
/// resulting polyline.
class DirectionsScreen extends StatefulWidget {
  const DirectionsScreen({
    super.key,
    required this.destination,
    required this.destinationLabel,
    this.avoidReportId,
  });

  final LatLng destination;
  final String destinationLabel;

  /// A hazard the route should deliberately steer around.
  final String? avoidReportId;

  @override
  State<DirectionsScreen> createState() => _DirectionsScreenState();
}

class _DirectionsScreenState extends State<DirectionsScreen> {
  late final BantayMapController _map;
  late LatLng _origin;
  List<LatLng> _route = <LatLng>[];
  List<HazardReport> _hazardsOnRoute = <HazardReport>[];

  bool _navigating = false;
  double _progress = 0;
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _origin = context.read<LocationController>().current;
    _map = BantayMapController(center: _origin, zoom: 15);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _rebuildRoute();
      _map.fitPoints(
        _route,
        padding: const EdgeInsets.fromLTRB(56, 130, 56, 260),
      );
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _map.dispose();
    super.dispose();
  }

  void _rebuildRoute() {
    final BantayRepository repo = context.read<BantayRepository>();
    final List<LatLng> route = _buildRoute(repo);
    setState(() {
      _route = route;
      _hazardsOnRoute = repo.verifiedHazards
          .where(
            (HazardReport h) =>
                Geo.distanceToPathMeters(h.location, route) <=
                BantayRepository.routeHazardThresholdMeters,
          )
          .toList();
    });
  }

  /// Builds a polyline from the user to the destination, detouring around
  /// hazards that would otherwise sit on the direct line.
  List<LatLng> _buildRoute(BantayRepository repo) {
    final List<LatLng> direct = <LatLng>[_origin, widget.destination];

    // Any verified hazard close to the straight line has to be avoided, not
    // just the one the user tapped.
    final List<HazardReport> blocking = repo.verifiedHazards
        .where(
          (HazardReport h) =>
              Geo.distanceToPathMeters(h.location, direct) <= 90,
        )
        .toList();

    if (blocking.isEmpty) {
      return <LatLng>[
        _origin,
        Geo.interpolateAlongPath(direct, 0.5),
        widget.destination,
      ];
    }

    // Offset the midpoint perpendicular to the direct line, away from the
    // worst hazard, which produces a believable detour around the block.
    final LatLng midpoint = Geo.interpolateAlongPath(direct, 0.5);
    final HazardReport worst = blocking.reduce(
      (HazardReport a, HazardReport b) =>
          a.severity.rank >= b.severity.rank ? a : b,
    );

    final double bearingToHazard = Geo.bearingDegrees(midpoint, worst.location);
    // Push 180 degrees away from the hazard.
    final double away = (bearingToHazard + 180) % 360;
    final double radians = away * math.pi / 180.0;
    const double detourMeters = 260;

    // Bearing is clockwise from north, so east is sin and north is cos.
    final LatLng detour = Geo.offsetMeters(
      midpoint,
      detourMeters * math.sin(radians),
      detourMeters * math.cos(radians),
    );

    return <LatLng>[
      _origin,
      Geo.interpolateAlongPath(<LatLng>[_origin, detour], 0.6),
      detour,
      Geo.interpolateAlongPath(<LatLng>[detour, widget.destination], 0.4),
      widget.destination,
    ];
  }

  void _toggleNavigation() {
    if (_navigating) {
      _ticker?.cancel();
      setState(() {
        _navigating = false;
        _progress = 0;
      });
      return;
    }

    setState(() {
      _navigating = true;
      _progress = 0;
    });

    // Simulated movement along the route, ~40 seconds end to end.
    _ticker = Timer.periodic(const Duration(milliseconds: 400), (Timer timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() => _progress = (_progress + 0.01).clamp(0.0, 1.0));

      final LatLng position = Geo.interpolateAlongPath(_route, _progress);
      _map.moveTo(position, zoom: 17);

      if (_progress >= 1.0) {
        timer.cancel();
        setState(() => _navigating = false);
        AppToast.success(context, S.of(context).youHaveArrived);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final double distance = Geo.pathLengthMeters(_route);
    final Duration travel = Geo.drivingTime(distance);
    final Duration remaining = travel * (1 - _progress);
    final DateTime arrival = DateTime.now().add(remaining);
    final LatLng position = _navigating
        ? Geo.interpolateAlongPath(_route, _progress)
        : _origin;

    return Scaffold(
      appBar: AppBar(
        title: Text(_navigating ? s.navigatingTo : s.routePreview),
        leading: const BackButton(),
      ),
      body: Stack(
        children: <Widget>[
          BantayMap(
            controller: _map,
            polylines: <MapPolyline>[
              if (_route.length >= 2)
                MapPolyline(
                  points: _route,
                  color: AppColors.brandBlue,
                  borderColor: Colors.white,
                  width: 7,
                ),
              // The travelled portion is overdrawn in a darker shade so
              // progress is readable at a glance.
              if (_navigating && _progress > 0)
                MapPolyline(
                  points: _travelledPortion(),
                  color: AppColors.brandBlueDark,
                  width: 7,
                ),
            ],
            markers: <MapMarker>[
              MapMarker(
                id: 'origin',
                point: position,
                size: const Size(24, 24),
                anchor: MarkerAnchor.centre,
                child: const UserLocationDot(),
              ),
              MapMarker(
                id: 'destination',
                point: widget.destination,
                size: const Size(46, 55),
                child: const PlacementPin(color: AppColors.brandRed, size: 46),
              ),
              for (final HazardReport hazard in _hazardsOnRoute)
                MapMarker(
                  id: 'route-hazard-${hazard.id}',
                  point: hazard.location,
                  size: const Size(38, 46),
                  child: HazardPin(
                    type: hazard.type,
                    status: hazard.status,
                    size: 38,
                  ),
                ),
            ],
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _RoutePanel(
              destinationLabel: widget.destinationLabel,
              distance: distance,
              remaining: remaining,
              arrival: arrival,
              navigating: _navigating,
              progress: _progress,
              hazards: _hazardsOnRoute,
              onToggleNavigation: _route.length >= 2 ? _toggleNavigation : null,
            ),
          ),
        ],
      ),
    );
  }

  List<LatLng> _travelledPortion() {
    if (_route.length < 2) return _route;
    final LatLng head = Geo.interpolateAlongPath(_route, _progress);
    final List<LatLng> travelled = <LatLng>[_route.first];
    double covered = 0;
    final double target = Geo.pathLengthMeters(_route) * _progress;

    for (int i = 0; i < _route.length - 1; i++) {
      final double segment = Geo.distanceMeters(_route[i], _route[i + 1]);
      if (covered + segment >= target) break;
      covered += segment;
      travelled.add(_route[i + 1]);
    }
    travelled.add(head);
    return travelled;
  }
}

/// Bottom panel with ETA, hazard warnings and the navigation toggle.
class _RoutePanel extends StatelessWidget {
  const _RoutePanel({
    required this.destinationLabel,
    required this.distance,
    required this.remaining,
    required this.arrival,
    required this.navigating,
    required this.progress,
    required this.hazards,
    required this.onToggleNavigation,
  });

  final String destinationLabel;
  final double distance;
  final Duration remaining;
  final DateTime arrival;
  final bool navigating;
  final double progress;
  final List<HazardReport> hazards;
  final VoidCallback? onToggleNavigation;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppTheme.radiusLarge),
        ),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: Color(0x2E000000),
            blurRadius: 18,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              if (navigating) ...<Widget>[
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 6,
                    backgroundColor: AppColors.brandBlueLight,
                  ),
                ),
                const SizedBox(height: 14),
              ],
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Icon(Icons.place, color: AppColors.brandRed, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      destinationLabel,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: <Widget>[
                  _Stat(
                    label: s.arriveIn,
                    value: TimeAgo.duration(remaining, s),
                    color: AppColors.brandBlue,
                  ),
                  const SizedBox(width: 12),
                  _Stat(
                    label: s.eta,
                    value: TimeAgo.clock(arrival, s),
                    color: AppColors.ink,
                  ),
                  const SizedBox(width: 12),
                  _Stat(
                    label: s.routePreview,
                    value: Geo.formatDistance(distance),
                    color: AppColors.ink,
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (hazards.isEmpty)
                Row(
                  children: <Widget>[
                    const Icon(
                      Icons.check_circle,
                      size: 18,
                      color: AppColors.safe,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        s.avoidingHazards,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.safeDark,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                )
              else
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.warningLight,
                    borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                    border: Border.all(
                      color: AppColors.warning.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Row(
                    children: <Widget>[
                      const Icon(
                        Icons.warning_amber_rounded,
                        size: 19,
                        color: AppColors.warningDark,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          '${hazards.length} '
                          '${hazards.length == 1 ? (s.isFilipino ? "panganib" : "hazard") : (s.isFilipino ? "mga panganib" : "hazards")} '
                          '${s.isFilipino ? "sa rutang ito" : "on this route"}: '
                          '${HazardVisuals.label(hazards.first.type, s)}',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: AppColors.warningDark,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: onToggleNavigation,
                icon: Icon(
                  navigating ? Icons.stop : Icons.navigation,
                  size: 20,
                ),
                label: Text(navigating ? s.endNavigation : s.startNavigation),
                style: navigating
                    ? FilledButton.styleFrom(
                        backgroundColor: AppColors.inkMuted,
                      )
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.7,
              color: AppColors.inkFaint,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
