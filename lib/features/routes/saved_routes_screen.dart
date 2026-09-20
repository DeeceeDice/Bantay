import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/strings.dart';
import '../../core/map/bantay_map.dart';
import '../../core/map/map_layers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/hazard_visuals.dart';
import '../../core/widgets/common.dart';
import '../../data/models/enums.dart';
import '../../data/models/saved_route.dart';
import '../../data/repositories/bantay_repository.dart';
import '../navigation/directions_screen.dart';
import 'add_route_screen.dart';

/// Saved commutes with a live "Clear" / "N hazards" status badge.
class SavedRoutesScreen extends StatelessWidget {
  const SavedRoutesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final BantayRepository repo = context.watch<BantayRepository>();
    final List<SavedRoute> routes = repo.savedRoutes;

    return Scaffold(
      appBar: AppBar(title: Text(s.savedRoutes), leading: const BackButton()),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (BuildContext _) => const AddRouteScreen(),
          ),
        ),
        backgroundColor: AppColors.brandRed,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: Text(s.addRoute),
      ),
      body: routes.isEmpty
          ? EmptyState(icon: Icons.alt_route_rounded, message: s.noSavedRoutes)
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: routes.length,
              separatorBuilder: (BuildContext context, int index) =>
                  const SizedBox(height: 12),
              itemBuilder: (BuildContext context, int index) {
                final SavedRoute route = routes[index];
                return Dismissible(
                  key: ValueKey<String>(route.id),
                  direction: DismissDirection.endToStart,
                  background: _DeleteBackground(label: s.delete),
                  onDismissed: (DismissDirection _) async {
                    await repo.deleteRoute(route.id);
                    if (!context.mounted) return;
                    AppToast.show(
                      context,
                      s.routeDeleted,
                      icon: Icons.delete_outline,
                      action: SnackBarAction(
                        label: s.undo,
                        textColor: Colors.white,
                        // Restoring at the original index keeps the list
                        // order stable, so undo really is an undo.
                        onPressed: () =>
                            repo.restoreRoute(route, atIndex: index),
                      ),
                    );
                  },
                  child: RouteCard(
                    route: route,
                    status: repo.statusForRoute(route),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (BuildContext _) => DirectionsScreen(
                          destination: route.end,
                          destinationLabel: route.endLabel,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}

/// One saved route with a mini map preview and its live status.
class RouteCard extends StatelessWidget {
  const RouteCard({
    super.key,
    required this.route,
    required this.status,
    required this.onTap,
  });

  final SavedRoute route;
  final RouteStatus status;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final bool clear = status.isClear;
    final Color statusColor = clear
        ? AppColors.safe
        : HazardVisuals.severityColor(
            status.worstSeverity ?? HazardSeverity.notPassable,
          );

    return SectionCard(
      onTap: onTap,
      padding: EdgeInsets.zero,
      borderColor: clear ? AppColors.line : statusColor.withValues(alpha: 0.4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          ClipRRect(
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(AppTheme.radiusMedium),
            ),
            child: SizedBox(
              height: 108,
              child: _RoutePreviewMap(route: route, statusColor: statusColor),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        route.label,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${route.startLabel}  ->  ${route.endLabel}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                StatusBadge(
                  label: clear
                      ? s.statusClear
                      : '${status.hazardCount} '
                            '${status.hazardCount == 1 ? (s.isFilipino ? "panganib" : "hazard") : (s.isFilipino ? "panganib" : "hazards")}',
                  color: statusColor,
                  icon: clear ? Icons.check_circle : Icons.warning_rounded,
                  filled: !clear,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Static line preview of a route.
class _RoutePreviewMap extends StatefulWidget {
  const _RoutePreviewMap({required this.route, required this.statusColor});

  final SavedRoute route;
  final Color statusColor;

  @override
  State<_RoutePreviewMap> createState() => _RoutePreviewMapState();
}

class _RoutePreviewMapState extends State<_RoutePreviewMap> {
  late final BantayMapController _map = BantayMapController(
    center: widget.route.start,
    zoom: 15,
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _map.fitPoints(widget.route.path, padding: const EdgeInsets.all(28));
    });
  }

  @override
  void dispose() {
    _map.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BantayMap(
      controller: _map,
      interactive: false,
      showAttribution: false,
      dimTiles: true,
      polylines: <MapPolyline>[
        MapPolyline(
          points: widget.route.path,
          color: widget.statusColor,
          borderColor: Colors.white,
          width: 5,
        ),
      ],
      markers: <MapMarker>[
        MapMarker(
          id: 'start',
          point: widget.route.start,
          size: const Size(14, 14),
          anchor: MarkerAnchor.centre,
          child: const _Endpoint(color: AppColors.brandBlue),
        ),
        MapMarker(
          id: 'end',
          point: widget.route.end,
          size: const Size(14, 14),
          anchor: MarkerAnchor.centre,
          child: const _Endpoint(color: AppColors.brandRed),
        ),
      ],
    );
  }
}

class _Endpoint extends StatelessWidget {
  const _Endpoint({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2.5),
      ),
    );
  }
}

class _DeleteBackground extends StatelessWidget {
  const _DeleteBackground({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: AlignmentDirectional.centerEnd,
      padding: const EdgeInsets.symmetric(horizontal: 22),
      decoration: BoxDecoration(
        color: AppColors.brandRed,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Icon(Icons.delete_outline, color: Colors.white),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
