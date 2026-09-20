import 'package:flutter/material.dart';

import '../../data/models/enums.dart';
import '../theme/app_colors.dart';
import '../utils/hazard_visuals.dart';

/// A teardrop map pin carrying a hazard icon.
///
/// Colour is the primary signal (red verified, orange pending) and the icon
/// is the secondary one, so the map stays readable for users who cannot rely
/// on colour alone.
class HazardPin extends StatelessWidget {
  const HazardPin({
    super.key,
    required this.type,
    required this.status,
    this.selected = false,
    this.size = 44,
  });

  final HazardType type;
  final ReportStatus status;
  final bool selected;
  final double size;

  @override
  Widget build(BuildContext context) {
    final Color color = HazardVisuals.statusColor(status);
    return AnimatedScale(
      scale: selected ? 1.18 : 1.0,
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutBack,
      child: CustomPaint(
        painter: _PinPainter(color: color, emphasised: selected),
        child: SizedBox(
          width: size,
          height: size * 1.2,
          child: Padding(
            padding: EdgeInsets.only(bottom: size * 0.32),
            child: Icon(
              HazardVisuals.icon(type),
              size: size * 0.46,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}

/// A rounded square pin for safe spots, visually distinct from hazard
/// teardrops so the two never blur together at a glance.
class SafeSpotPin extends StatelessWidget {
  const SafeSpotPin({
    super.key,
    required this.category,
    this.selected = false,
    this.size = 38,
  });

  final SafeSpotCategory category;
  final bool selected;
  final double size;

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: selected ? 1.18 : 1.0,
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutBack,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: AppColors.safe,
          borderRadius: BorderRadius.circular(size * 0.32),
          border: Border.all(color: Colors.white, width: 2.5),
          boxShadow: const <BoxShadow>[
            BoxShadow(
              color: Color(0x40000000),
              blurRadius: 6,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Icon(
          HazardVisuals.safeSpotIcon(category),
          size: size * 0.5,
          color: Colors.white,
        ),
      ),
    );
  }
}

/// The blue dot showing the user's own position.
class UserLocationDot extends StatelessWidget {
  const UserLocationDot({super.key, this.size = 20, this.stale = false});

  final double size;

  /// True when the position is the Manila fallback rather than a real fix,
  /// which is drawn hollow so the user is never misled about accuracy.
  final bool stale;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: stale ? Colors.white : AppColors.userLocation,
        shape: BoxShape.circle,
        border: Border.all(
          color: stale ? AppColors.userLocation : Colors.white,
          width: 3,
        ),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color(0x45000000),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
    );
  }
}

/// The draggable pin used while placing a report or a route endpoint.
class PlacementPin extends StatelessWidget {
  const PlacementPin({
    super.key,
    this.color = AppColors.brandRed,
    this.size = 52,
  });

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _PinPainter(color: color, emphasised: true),
      child: SizedBox(
        width: size,
        height: size * 1.2,
        child: Padding(
          padding: EdgeInsets.only(bottom: size * 0.3),
          child: Icon(Icons.place, size: size * 0.44, color: Colors.white),
        ),
      ),
    );
  }
}

/// Paints a teardrop pin with a white rim and a drop shadow.
class _PinPainter extends CustomPainter {
  const _PinPainter({required this.color, required this.emphasised});

  final Color color;
  final bool emphasised;

  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;
    final double radius = w / 2;
    final Offset head = Offset(w / 2, radius);

    final Path pin = Path()
      ..addOval(Rect.fromCircle(center: head, radius: radius))
      ..moveTo(w * 0.18, h * 0.62)
      ..quadraticBezierTo(w * 0.5, h * 0.78, w / 2, h)
      ..quadraticBezierTo(w * 0.5, h * 0.78, w * 0.82, h * 0.62)
      ..close();

    canvas.drawShadow(pin, Colors.black54, emphasised ? 5 : 3, false);
    canvas.drawPath(pin, Paint()..color = Colors.white);

    // Inset fill so a white rim separates the pin from busy map tiles.
    canvas.save();
    canvas.translate(w / 2, h * 0.52);
    canvas.scale(0.86);
    canvas.translate(-w / 2, -h * 0.52);
    canvas.drawPath(pin, Paint()..color = color);
    canvas.restore();
  }

  @override
  bool shouldRepaint(_PinPainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.emphasised != emphasised;
}
