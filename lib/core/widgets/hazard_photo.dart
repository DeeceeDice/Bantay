import 'package:flutter/material.dart';

import '../../data/models/enums.dart';
import '../photos/photo_support.dart';
import '../theme/app_colors.dart';
import '../utils/hazard_visuals.dart';

/// Displays a hazard's photo.
///
/// Handles three cases: a real photo the user captured, one of the bundled
/// sample scenes that ship with the seed data (`seed:` prefix), and no photo
/// at all. Sample scenes are drawn rather than bundled as fake JPEGs, so the
/// app never passes off an illustration as a real photograph of a real place.
class HazardPhoto extends StatelessWidget {
  const HazardPhoto({
    super.key,
    required this.photoPath,
    required this.type,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
  });

  final String? photoPath;
  final HazardType type;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  static const String seedPrefix = 'seed:';

  @override
  Widget build(BuildContext context) {
    final Widget content = _buildContent(context);
    final Widget sized = height == null
        ? content
        : SizedBox(height: height, width: double.infinity, child: content);

    if (borderRadius == null) return sized;
    return ClipRRect(borderRadius: borderRadius!, child: sized);
  }

  Widget _buildContent(BuildContext context) {
    final String? path = photoPath;
    if (path == null || path.isEmpty) {
      return _SamplePhoto(type: type, isPlaceholder: true);
    }
    if (path.startsWith(seedPrefix)) {
      return _SamplePhoto(type: type);
    }
    return buildLocalPhoto(
      path,
      fit: fit,
      onError: (BuildContext _) =>
          _SamplePhoto(type: type, isPlaceholder: true),
    );
  }
}

/// A drawn stand-in scene for sample data and for photos that fail to load.
class _SamplePhoto extends StatelessWidget {
  const _SamplePhoto({required this.type, this.isPlaceholder = false});

  final HazardType type;
  final bool isPlaceholder;

  @override
  Widget build(BuildContext context) {
    final Color tint = HazardVisuals.statusColor(ReportStatus.pending);
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[
            AppColors.brandBlueLight,
            Color.lerp(AppColors.brandBlueLight, tint, 0.28)!,
          ],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          CustomPaint(painter: _SampleScenePainter(type: type)),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Icon(
                  HazardVisuals.icon(type),
                  size: 40,
                  color: AppColors.brandBlue.withValues(alpha: 0.75),
                ),
                const SizedBox(height: 6),
                Text(
                  isPlaceholder ? 'No photo' : 'Sample photo',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.brandBlue.withValues(alpha: 0.7),
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

/// Draws a minimal roadscape so sample cards have visual texture instead of
/// reading as an error state.
class _SampleScenePainter extends CustomPainter {
  const _SampleScenePainter({required this.type});

  final HazardType type;

  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    // Horizon.
    final Paint ground = Paint()
      ..color = AppColors.brandBlue.withValues(alpha: 0.10);
    canvas.drawRect(Rect.fromLTWH(0, h * 0.62, w, h * 0.38), ground);

    // Road receding to a vanishing point.
    final Path road = Path()
      ..moveTo(w * 0.28, h)
      ..lineTo(w * 0.46, h * 0.62)
      ..lineTo(w * 0.56, h * 0.62)
      ..lineTo(w * 0.82, h)
      ..close();
    canvas.drawPath(
      road,
      Paint()..color = AppColors.inkMuted.withValues(alpha: 0.16),
    );

    if (type == HazardType.floodedRoad) {
      // Water line across the lower third.
      canvas.drawRect(
        Rect.fromLTWH(0, h * 0.78, w, h * 0.22),
        Paint()..color = AppColors.userLocation.withValues(alpha: 0.22),
      );
    }
  }

  @override
  bool shouldRepaint(_SampleScenePainter oldDelegate) =>
      oldDelegate.type != type;
}
