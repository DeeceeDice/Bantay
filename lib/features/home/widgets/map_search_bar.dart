import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/geo/lat_lng.dart';
import '../../../core/i18n/strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/hazard_visuals.dart';
import '../../../data/models/hazard_report.dart';
import '../../../data/models/safe_spot.dart';
import '../../../data/repositories/bantay_repository.dart';
import '../../../data/seed/gazetteer.dart';

/// One row in the search dropdown.
class SearchSuggestion {
  const SearchSuggestion({
    required this.label,
    required this.sublabel,
    required this.location,
    required this.icon,
    required this.color,
  });

  final String label;
  final String sublabel;
  final LatLng location;
  final IconData icon;
  final Color color;
}

/// Search bar with live autocomplete over local data.
///
/// Matches against the built-in gazetteer, every safe spot and every reported
/// hazard, so it resolves the places a commuter actually searches for without
/// requiring a connection.
class MapSearchBar extends StatefulWidget {
  const MapSearchBar({
    super.key,
    required this.onSelected,
    required this.onFilterTap,
    this.activeFilterCount = 0,
  });

  final void Function(SearchSuggestion suggestion) onSelected;
  final VoidCallback onFilterTap;
  final int activeFilterCount;

  @override
  State<MapSearchBar> createState() => _MapSearchBarState();
}

class _MapSearchBarState extends State<MapSearchBar> {
  final TextEditingController _query = TextEditingController();
  final FocusNode _focus = FocusNode();
  List<SearchSuggestion> _results = <SearchSuggestion>[];

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _query.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    final String q = value.trim();
    if (q.isEmpty) {
      setState(() => _results = <SearchSuggestion>[]);
      return;
    }

    final BantayRepository repo = context.read<BantayRepository>();
    final S s = S.of(context);
    final List<SearchSuggestion> found = <SearchSuggestion>[];

    for (final Place place in Gazetteer.search(q, limit: 5)) {
      found.add(
        SearchSuggestion(
          label: place.name,
          sublabel: place.area,
          location: place.location,
          icon: Icons.place_outlined,
          color: AppColors.brandBlue,
        ),
      );
    }

    final String lower = q.toLowerCase();
    for (final SafeSpot spot in repo.safeSpots) {
      if (found.length >= 8) break;
      if (spot.name.toLowerCase().contains(lower)) {
        found.add(
          SearchSuggestion(
            label: spot.name,
            sublabel: spot.addressLabel,
            location: spot.location,
            icon: HazardVisuals.safeSpotIcon(spot.category),
            color: AppColors.safe,
          ),
        );
      }
    }

    for (final HazardReport report in repo.verifiedHazards) {
      if (found.length >= 10) break;
      if (report.addressLabel.toLowerCase().contains(lower)) {
        found.add(
          SearchSuggestion(
            label: HazardVisuals.label(report.type, s),
            sublabel: report.addressLabel,
            location: report.location,
            icon: HazardVisuals.icon(report.type),
            color: AppColors.brandRed,
          ),
        );
      }
    }

    setState(() => _results = found);
  }

  void _select(SearchSuggestion suggestion) {
    _query.text = suggestion.label;
    _focus.unfocus();
    setState(() => _results = <SearchSuggestion>[]);
    widget.onSelected(suggestion);
  }

  void _clear() {
    _query.clear();
    setState(() => _results = <SearchSuggestion>[]);
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final bool showResults = _focus.hasFocus && _results.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppTheme.radiusSmall + 4),
            boxShadow: const <BoxShadow>[
              BoxShadow(
                color: Color(0x26000000),
                blurRadius: 12,
                offset: Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            children: <Widget>[
              const SizedBox(width: 12),
              const Icon(Icons.search, color: AppColors.inkMuted, size: 22),
              Expanded(
                child: TextField(
                  controller: _query,
                  focusNode: _focus,
                  onChanged: _onChanged,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: s.searchHint,
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    filled: false,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 15,
                    ),
                  ),
                ),
              ),
              if (_query.text.isNotEmpty)
                IconButton(
                  onPressed: _clear,
                  icon: const Icon(Icons.close, size: 19),
                  color: AppColors.inkMuted,
                  visualDensity: VisualDensity.compact,
                  tooltip: s.close,
                ),
              const SizedBox(
                height: 26,
                child: VerticalDivider(width: 1, color: AppColors.line),
              ),
              _FilterButton(
                activeCount: widget.activeFilterCount,
                onTap: widget.onFilterTap,
                tooltip: s.filters,
              ),
            ],
          ),
        ),
        if (showResults)
          Container(
            margin: const EdgeInsets.only(top: 6),
            constraints: const BoxConstraints(maxHeight: 268),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppTheme.radiusSmall + 4),
              boxShadow: const <BoxShadow>[
                BoxShadow(
                  color: Color(0x26000000),
                  blurRadius: 12,
                  offset: Offset(0, 3),
                ),
              ],
            ),
            child: ListView.separated(
              shrinkWrap: true,
              padding: EdgeInsets.zero,
              itemCount: _results.length,
              separatorBuilder: (BuildContext context, int index) =>
                  const Divider(height: 1, color: AppColors.line),
              itemBuilder: (BuildContext context, int i) {
                final SearchSuggestion item = _results[i];
                return ListTile(
                  dense: true,
                  leading: Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: item.color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(9),
                    ),
                    child: Icon(item.icon, size: 18, color: item.color),
                  ),
                  title: Text(
                    item.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  subtitle: Text(
                    item.sublabel,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  onTap: () => _select(item),
                );
              },
            ),
          ),
      ],
    );
  }
}

class _FilterButton extends StatelessWidget {
  const _FilterButton({
    required this.activeCount,
    required this.onTap,
    required this.tooltip,
  });

  final int activeCount;
  final VoidCallback onTap;
  final String tooltip;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: const BorderRadius.horizontal(right: Radius.circular(14)),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Stack(
            clipBehavior: Clip.none,
            children: <Widget>[
              const Icon(Icons.tune, size: 22, color: AppColors.brandBlue),
              if (activeCount > 0)
                Positioned(
                  right: -5,
                  top: -4,
                  child: Container(
                    width: 15,
                    height: 15,
                    decoration: BoxDecoration(
                      color: AppColors.brandRed,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.surface, width: 1.5),
                    ),
                    child: Text(
                      '$activeCount',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 8.5,
                        fontWeight: FontWeight.w800,
                        height: 1.4,
                      ),
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
