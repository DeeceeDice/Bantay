import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/geo/lat_lng.dart';
import '../../core/i18n/strings.dart';
import '../../core/map/bantay_map.dart';
import '../../core/map/map_layers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/map_pins.dart';
import '../../data/repositories/bantay_repository.dart';
import '../../state/location_controller.dart';
import '../../state/report_draft_controller.dart';

/// Creates a saved route by tapping a start and an end point on the map.
///
/// Save stays disabled until both ends are placed and the route has a name,
/// so a half-finished route can never end up in the list.
class AddRouteScreen extends StatefulWidget {
  const AddRouteScreen({super.key});

  @override
  State<AddRouteScreen> createState() => _AddRouteScreenState();
}

class _AddRouteScreenState extends State<AddRouteScreen> {
  late final BantayMapController _map;
  final TextEditingController _name = TextEditingController();

  LatLng? _start;
  LatLng? _end;
  String _startLabel = '';
  String _endLabel = '';
  bool _placingEnd = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _map = BantayMapController(
      center: context.read<LocationController>().current,
      zoom: 15,
    );
  }

  @override
  void dispose() {
    _map.dispose();
    _name.dispose();
    super.dispose();
  }

  bool get _canSave =>
      _start != null && _end != null && _name.text.trim().isNotEmpty;

  void _handleTap(LatLng point) {
    // Reverse-geocoding here reuses the report flow's gazetteer lookup, so a
    // route endpoint reads the same way a hazard address does.
    final String label = _describe(point);
    setState(() {
      if (!_placingEnd) {
        _start = point;
        _startLabel = label;
        _placingEnd = true;
      } else {
        _end = point;
        _endLabel = label;
      }
    });
  }

  String _describe(LatLng point) {
    final ReportDraftController probe = ReportDraftController(
      initialLocation: point,
    );
    final String label = probe.addressLabel;
    probe.dispose();
    return label;
  }

  Future<void> _save() async {
    if (!_canSave) return;
    setState(() => _saving = true);

    await context.read<BantayRepository>().addRoute(
      label: _name.text.trim(),
      start: _start!,
      startLabel: _startLabel,
      end: _end!,
      endLabel: _endLabel,
    );

    if (!mounted) return;
    setState(() => _saving = false);
    AppToast.success(context, S.of(context).routeSavedToast);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(s.newRoute), leading: const BackButton()),
      body: Column(
        children: <Widget>[
          Container(
            width: double.infinity,
            color: AppColors.brandBlueLight,
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
            child: Row(
              children: <Widget>[
                const Icon(
                  Icons.touch_app_outlined,
                  size: 18,
                  color: AppColors.brandBlueDark,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _start == null
                        ? '${s.setStart}. ${s.tapMapToSet}'
                        : _end == null
                        ? '${s.setEnd}. ${s.tapMapToSet}'
                        : s.saveRoute,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.brandBlueDark,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: BantayMap(
              controller: _map,
              onTap: _handleTap,
              polylines: <MapPolyline>[
                if (_start != null && _end != null)
                  MapPolyline(
                    points: <LatLng>[_start!, _end!],
                    color: AppColors.brandBlue,
                    borderColor: Colors.white,
                    width: 6,
                    dashed: true,
                  ),
              ],
              markers: <MapMarker>[
                if (_start != null)
                  MapMarker(
                    id: 'start',
                    point: _start!,
                    size: const Size(42, 50),
                    child: const PlacementPin(
                      color: AppColors.brandBlue,
                      size: 42,
                    ),
                  ),
                if (_end != null)
                  MapMarker(
                    id: 'end',
                    point: _end!,
                    size: const Size(42, 50),
                    child: const PlacementPin(
                      color: AppColors.brandRed,
                      size: 42,
                    ),
                  ),
              ],
            ),
          ),
          Container(
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(top: BorderSide(color: AppColors.line)),
            ),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: _EndpointChip(
                            label: s.startPoint,
                            value: _startLabel,
                            color: AppColors.brandBlue,
                            active: !_placingEnd,
                            onTap: () => setState(() => _placingEnd = false),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _EndpointChip(
                            label: s.endPoint,
                            value: _endLabel,
                            color: AppColors.brandRed,
                            active: _placingEnd,
                            onTap: () => setState(() => _placingEnd = true),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _name,
                      onChanged: (_) => setState(() {}),
                      textCapitalization: TextCapitalization.words,
                      decoration: InputDecoration(
                        labelText: s.routeName,
                        hintText: s.routeNameHint,
                        prefixIcon: const Icon(Icons.label_outline, size: 20),
                      ),
                    ),
                    const SizedBox(height: 12),
                    LoadingButton(
                      label: s.saveRoute,
                      icon: Icons.check,
                      isLoading: _saving,
                      onPressed: _canSave ? _save : null,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EndpointChip extends StatelessWidget {
  const _EndpointChip({
    required this.label,
    required this.value,
    required this.color,
    required this.active,
    required this.onTap,
  });

  final String label;
  final String value;
  final Color color;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: active ? color.withValues(alpha: 0.10) : AppColors.surfaceAlt,
      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
            border: Border.all(
              color: active ? color : AppColors.line,
              width: active ? 1.6 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Container(
                    width: 9,
                    height: 9,
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    label.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.6,
                      color: AppColors.inkFaint,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 3),
              Text(
                value.isEmpty ? '--' : value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: AppColors.ink,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
