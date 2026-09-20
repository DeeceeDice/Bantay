import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../app/routes.dart';
import '../../../core/geo/lat_lng.dart';
import '../../../core/i18n/strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/hazard_visuals.dart';
import '../../../core/utils/time_ago.dart';
import '../../../core/widgets/common.dart';
import '../../../data/models/safe_spot.dart';
import '../../../data/repositories/bantay_repository.dart';
import '../../../state/location_controller.dart';
import '../../safe_spots/safe_spot_detail_screen.dart';

/// Compact sheet shown when a safe-spot pin is tapped on the map.
class SafeSpotSheet extends StatelessWidget {
  const SafeSpotSheet({super.key, required this.spotId});

  final String spotId;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final SafeSpot? spot = context.select<BantayRepository, SafeSpot?>(
      (BantayRepository repo) => repo.safeSpotById(spotId),
    );
    if (spot == null) return const SizedBox.shrink();

    final bool subscribed = context.select<BantayRepository, bool>(
      (BantayRepository repo) => repo.isSubscribed(spotId),
    );
    final LatLng userPoint = context.select<LocationController, LatLng>(
      (LocationController loc) => loc.current,
    );
    final double distance = Geo.distanceMeters(userPoint, spot.location);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.safeLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    HazardVisuals.safeSpotIcon(spot.category),
                    color: AppColors.safeDark,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        spot.name,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        spot.addressLabel,
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
            const SizedBox(height: 14),
            Text(
              spot.description,
              style: Theme.of(context).textTheme.bodyMedium,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 16),
            Row(
              children: <Widget>[
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await context.read<BantayRepository>().toggleSubscription(
                        spot.id,
                      );
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
                      size: 19,
                    ),
                    label: Text(subscribed ? s.subscribed : s.subscribe),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: subscribed
                          ? AppColors.safeDark
                          : AppColors.brandBlue,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          settings: const RouteSettings(
                            name: Routes.safeSpotDetail,
                          ),
                          builder: (BuildContext _) =>
                              SafeSpotDetailScreen(spotId: spot.id),
                        ),
                      );
                    },
                    icon: const Icon(Icons.arrow_forward, size: 19),
                    label: Text(s.next),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
