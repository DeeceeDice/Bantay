import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/geo/lat_lng.dart';
import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/hazard_visuals.dart';
import '../../core/utils/time_ago.dart';
import '../../core/widgets/common.dart';
import '../../data/models/enums.dart';
import '../../data/models/safe_spot.dart';
import '../../data/repositories/bantay_repository.dart';
import '../../state/location_controller.dart';
import 'safe_spot_detail_screen.dart';

/// Browsable list of verified shelters, nearest first.
class SafeSpotsScreen extends StatefulWidget {
  const SafeSpotsScreen({super.key});

  @override
  State<SafeSpotsScreen> createState() => _SafeSpotsScreenState();
}

class _SafeSpotsScreenState extends State<SafeSpotsScreen> {
  SafeSpotCategory? _category;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final BantayRepository repo = context.watch<BantayRepository>();
    final LatLng origin = context.select<LocationController, LatLng>(
      (LocationController loc) => loc.current,
    );
    final List<SafeSpot> spots = repo.safeSpotsNear(
      origin,
      category: _category,
    );

    return Scaffold(
      appBar: AppBar(title: Text(s.safeSpots)),
      body: Column(
        children: <Widget>[
          SizedBox(
            height: 54,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: <Widget>[
                _CategoryChip(
                  label: s.allCategories,
                  icon: Icons.apps,
                  selected: _category == null,
                  onTap: () => setState(() => _category = null),
                ),
                ...SafeSpotCategory.values.map(
                  (SafeSpotCategory category) => _CategoryChip(
                    label: HazardVisuals.safeSpotLabel(category, s),
                    icon: HazardVisuals.safeSpotIcon(category),
                    selected: _category == category,
                    onTap: () => setState(
                      () => _category = _category == category ? null : category,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: spots.isEmpty
                ? EmptyState(
                    icon: Icons.shield_outlined,
                    message: s.isFilipino
                        ? 'Walang ligtas na lugar sa kategoryang ito.'
                        : 'No safe spots in this category yet.',
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                    itemCount: spots.length,
                    separatorBuilder: (BuildContext context, int index) =>
                        const SizedBox(height: 12),
                    itemBuilder: (BuildContext context, int index) =>
                        SafeSpotCard(
                          spot: spots[index],
                          distanceMeters: Geo.distanceMeters(
                            origin,
                            spots[index].location,
                          ),
                          subscribed: repo.isSubscribed(spots[index].id),
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (BuildContext _) =>
                                  SafeSpotDetailScreen(spotId: spots[index].id),
                            ),
                          ),
                          onToggleSubscribe: () async {
                            final bool wasSubscribed = repo.isSubscribed(
                              spots[index].id,
                            );
                            await repo.toggleSubscription(spots[index].id);
                            if (!context.mounted) return;
                            AppToast.success(
                              context,
                              wasSubscribed
                                  ? s.unsubscribedToast
                                  : s.subscribedToast,
                            );
                          },
                        ),
                  ),
          ),
        ],
      ),
    );
  }
}

/// A safe spot summary card, shared by the list and the detail screen.
class SafeSpotCard extends StatelessWidget {
  const SafeSpotCard({
    super.key,
    required this.spot,
    required this.distanceMeters,
    required this.subscribed,
    required this.onTap,
    required this.onToggleSubscribe,
  });

  final SafeSpot spot;
  final double distanceMeters;
  final bool subscribed;
  final VoidCallback onTap;
  final VoidCallback onToggleSubscribe;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return SectionCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: AppColors.safeLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              HazardVisuals.safeSpotIcon(spot.category),
              size: 27,
              color: AppColors.safeDark,
            ),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(spot.name, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 2),
                Text(
                  spot.addressLabel,
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
                      label: spot.isOpenNow ? s.openNow : s.closedNow,
                      color: spot.isOpenNow
                          ? AppColors.safe
                          : AppColors.inkMuted,
                      icon: spot.isOpenNow
                          ? Icons.check_circle
                          : Icons.schedule,
                      compact: true,
                    ),
                    StatusBadge(
                      label: Geo.formatDistance(distanceMeters),
                      color: AppColors.brandBlue,
                      icon: Icons.near_me_outlined,
                      compact: true,
                    ),
                    StatusBadge(
                      label:
                          '${TimeAgo.duration(Geo.walkingTime(distanceMeters), s)} ${s.walk}',
                      color: AppColors.brandBlue,
                      icon: Icons.directions_walk,
                      compact: true,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          IconButton(
            onPressed: onToggleSubscribe,
            tooltip: subscribed ? s.subscribed : s.subscribe,
            icon: Icon(
              subscribed
                  ? Icons.notifications_active
                  : Icons.notifications_none,
              color: subscribed ? AppColors.safeDark : AppColors.inkFaint,
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Material(
        color: selected ? AppColors.brandBlue : AppColors.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
              border: Border.all(
                color: selected ? AppColors.brandBlue : AppColors.line,
              ),
            ),
            child: Row(
              children: <Widget>[
                Icon(
                  icon,
                  size: 16,
                  color: selected ? Colors.white : AppColors.inkMuted,
                ),
                const SizedBox(width: 7),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: selected ? Colors.white : AppColors.ink,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
