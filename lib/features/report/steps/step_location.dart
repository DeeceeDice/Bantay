import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/i18n/strings.dart';
import '../../../core/map/bantay_map.dart';
import '../../../core/map/map_camera.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/map_pins.dart';
import '../../../state/location_controller.dart';
import '../../../state/report_draft_controller.dart';

/// Step 1: place the hazard pin.
///
/// The pin is fixed to the centre of the viewport and the map moves under it.
/// That is far easier one-handed than dragging a small target, and it means
/// the pin can never be dropped outside the visible area.
class StepLocation extends StatefulWidget {
  const StepLocation({super.key});

  @override
  State<StepLocation> createState() => _StepLocationState();
}

class _StepLocationState extends State<StepLocation> {
  late final BantayMapController _map;

  @override
  void initState() {
    super.initState();
    _map = BantayMapController(
      center: context.read<ReportDraftController>().location,
      zoom: 17,
    );
  }

  @override
  void dispose() {
    _map.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final ReportDraftController draft = context.watch<ReportDraftController>();

    return Column(
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                s.stepLocationTitle,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 6),
              Text(
                s.stepLocationBody,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
        ),
        Expanded(
          child: Stack(
            alignment: Alignment.center,
            children: <Widget>[
              BantayMap(
                controller: _map,
                // Committing the pin on every camera change keeps the draft
                // and the address label in step with what the user sees.
                onCameraChanged: (MapCamera camera) =>
                    draft.setLocation(camera.center),
              ),
              // The pin sits slightly above centre so its tip, not its body,
              // marks the middle of the screen.
              const Padding(
                padding: EdgeInsets.only(bottom: 52),
                child: IgnorePointer(child: PlacementPin()),
              ),
              Positioned(
                right: 14,
                bottom: 14,
                child: _RecentreButton(
                  onPressed: () => _map.moveTo(
                    context.read<LocationController>().current,
                    zoom: 17,
                  ),
                  tooltip: s.recenter,
                ),
              ),
            ],
          ),
        ),
        Container(
          width: double.infinity,
          color: AppColors.surface,
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
          child: Row(
            children: <Widget>[
              const Icon(
                Icons.place_outlined,
                size: 20,
                color: AppColors.brandRed,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      draft.addressLabel,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${draft.location.latitude.toStringAsFixed(5)}, '
                      '${draft.location.longitude.toStringAsFixed(5)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _RecentreButton extends StatelessWidget {
  const _RecentreButton({required this.onPressed, required this.tooltip});

  final VoidCallback onPressed;
  final String tooltip;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
        elevation: 3,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
          child: const SizedBox(
            width: 44,
            height: 44,
            child: Icon(
              Icons.my_location,
              size: 21,
              color: AppColors.brandBlue,
            ),
          ),
        ),
      ),
    );
  }
}
