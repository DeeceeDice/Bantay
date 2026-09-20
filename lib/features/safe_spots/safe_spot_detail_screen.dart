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
import '../../data/models/safe_spot.dart';
import '../../data/repositories/bantay_repository.dart';
import '../../state/location_controller.dart';
import '../navigation/directions_screen.dart';

/// Full detail for one safe spot: hours, capacity, contact and directions.
class SafeSpotDetailScreen extends StatelessWidget {
  const SafeSpotDetailScreen({super.key, required this.spotId});

  final String spotId;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final SafeSpot? spot = context.select<BantayRepository, SafeSpot?>(
      (BantayRepository repo) => repo.safeSpotById(spotId),
    );

    if (spot == null) {
      return Scaffold(
        appBar: AppBar(leading: const BackButton()),
        body: EmptyState(icon: Icons.search_off, message: s.somethingWentWrong),
      );
    }

    final bool subscribed = context.select<BantayRepository, bool>(
      (BantayRepository repo) => repo.isSubscribed(spotId),
    );
    final LatLng origin = context.select<LocationController, LatLng>(
      (LocationController loc) => loc.current,
    );
    final double distance = Geo.distanceMeters(origin, spot.location);

    return Scaffold(
      appBar: AppBar(title: Text(spot.name), leading: const BackButton()),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
        children: <Widget>[
          _MiniMap(spot: spot, origin: origin),
          const SizedBox(height: 16),
          Row(
            children: <Widget>[
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppColors.safeLight,
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(
                  HazardVisuals.safeSpotIcon(spot.category),
                  color: AppColors.safeDark,
                  size: 25,
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      spot.name,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    Text(
                      HazardVisuals.safeSpotLabel(spot.category, s),
                      style: Theme.of(context).textTheme.bodySmall,
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
                label: spot.isOpenNow ? s.openNow : s.closedNow,
                color: spot.isOpenNow ? AppColors.safe : AppColors.inkMuted,
                icon: spot.isOpenNow ? Icons.check_circle : Icons.schedule,
                filled: spot.isOpenNow,
              ),
              StatusBadge(
                label: Geo.formatDistance(distance),
                color: AppColors.brandBlue,
                icon: Icons.near_me_outlined,
              ),
              StatusBadge(
                label:
                    '${TimeAgo.duration(Geo.walkingTime(distance), s)} ${s.walk}',
                color: AppColors.brandBlue,
                icon: Icons.directions_walk,
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(spot.description, style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 20),
          SectionCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: <Widget>[
                _DetailRow(
                  icon: Icons.schedule,
                  label: s.hours,
                  value: spot.openingHours,
                ),
                if (spot.capacity != null) ...<Widget>[
                  const Divider(height: 1),
                  _DetailRow(
                    icon: Icons.groups_outlined,
                    label: s.capacity,
                    value: s.isFilipino
                        ? '${spot.capacity} katao'
                        : '${spot.capacity} people',
                  ),
                ],
                if (spot.contactNumber != null) ...<Widget>[
                  const Divider(height: 1),
                  _DetailRow(
                    icon: Icons.phone_outlined,
                    label: s.contact,
                    value: spot.contactNumber!,
                  ),
                ],
                const Divider(height: 1),
                _DetailRow(
                  icon: Icons.place_outlined,
                  label: s.searchHint,
                  value: spot.addressLabel,
                ),
                if (spot.lastUpdated != null) ...<Widget>[
                  const Divider(height: 1),
                  _DetailRow(
                    icon: Icons.update,
                    label: s.alerts,
                    value: TimeAgo.format(spot.lastUpdated!, s),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (BuildContext _) => DirectionsScreen(
                  destination: spot.location,
                  destinationLabel: spot.name,
                ),
              ),
            ),
            icon: const Icon(Icons.directions),
            label: Text(s.getDirections),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () async {
              await context.read<BantayRepository>().toggleSubscription(spotId);
              if (!context.mounted) return;
              AppToast.success(
                context,
                subscribed ? s.unsubscribedToast : s.subscribedToast,
              );
            },
            icon: Icon(
              subscribed
                  ? Icons.notifications_active
                  : Icons.notifications_none,
              size: 20,
            ),
            label: Text(subscribed ? s.subscribed : s.subscribe),
            style: OutlinedButton.styleFrom(
              foregroundColor: subscribed
                  ? AppColors.safeDark
                  : AppColors.brandBlue,
            ),
          ),
        ],
      ),
    );
  }
}

/// Non-interactive map preview framing the spot and the user.
class _MiniMap extends StatefulWidget {
  const _MiniMap({required this.spot, required this.origin});

  final SafeSpot spot;
  final LatLng origin;

  @override
  State<_MiniMap> createState() => _MiniMapState();
}

class _MiniMapState extends State<_MiniMap> {
  late final BantayMapController _map = BantayMapController(
    center: widget.spot.location,
    zoom: 16,
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _map.fitPoints(<LatLng>[
        widget.spot.location,
        widget.origin,
      ], padding: const EdgeInsets.all(48));
    });
  }

  @override
  void dispose() {
    _map.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
      child: SizedBox(
        height: 190,
        child: BantayMap(
          controller: _map,
          interactive: false,
          polylines: <MapPolyline>[
            MapPolyline(
              points: <LatLng>[widget.origin, widget.spot.location],
              color: AppColors.brandBlue,
              borderColor: Colors.white,
              width: 5,
              dashed: true,
            ),
          ],
          markers: <MapMarker>[
            MapMarker(
              id: 'origin',
              point: widget.origin,
              size: const Size(22, 22),
              anchor: MarkerAnchor.centre,
              child: const UserLocationDot(size: 18),
            ),
            MapMarker(
              id: 'spot',
              point: widget.spot.location,
              size: const Size(38, 38),
              anchor: MarkerAnchor.centre,
              child: SafeSpotPin(category: widget.spot.category),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, size: 19, color: AppColors.inkFaint),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.4,
                    color: AppColors.inkFaint,
                  ),
                ),
                const SizedBox(height: 2),
                Text(value, style: Theme.of(context).textTheme.bodyLarge),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
