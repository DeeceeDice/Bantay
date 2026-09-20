import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// The Bantay mark: a blue eye whose pupil is a red map pin.
///
/// Drawn with a painter rather than shipped as a raster so it stays crisp at
/// every size, from the 24dp app-bar mark to the launch screen, and so the
/// brand colours come from one source of truth.
class BantayLogo extends StatelessWidget {
  const BantayLogo({super.key, this.size = 64, this.showWordmark = false});

  final double size;
  final bool showWordmark;

  @override
  Widget build(BuildContext context) {
    final Widget mark = SizedBox(
      width: size,
      height: size * 0.72,
      child: CustomPaint(painter: _BantayLogoPainter()),
    );

    if (!showWordmark) return mark;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        mark,
        SizedBox(height: size * 0.16),
        Text(
          'Bantay',
          style: TextStyle(
            fontSize: size * 0.34,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
            color: AppColors.brandBlue,
          ),
        ),
      ],
    );
  }
}

class _BantayLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    // The eye: two mirrored quadratic curves meeting at the outer corners.
    final Path eye = Path()
      ..moveTo(0, h / 2)
      ..quadraticBezierTo(w * 0.5, -h * 0.08, w, h / 2)
      ..quadraticBezierTo(w * 0.5, h * 1.08, 0, h / 2)
      ..close();

    canvas.drawPath(eye, Paint()..color = AppColors.brandBlue);

    // Inner white of the eye, inset so the blue reads as a rim.
    final Path inner = Path()
      ..moveTo(w * 0.1, h / 2)
      ..quadraticBezierTo(w * 0.5, h * 0.08, w * 0.9, h / 2)
      ..quadraticBezierTo(w * 0.5, h * 0.92, w * 0.1, h / 2)
      ..close();
    canvas.drawPath(inner, Paint()..color = Colors.white);

    // The pupil is a map pin: a circle fused to a downward point.
    final double pinRadius = h * 0.26;
    final Offset pinCentre = Offset(w * 0.5, h * 0.44);
    final Paint red = Paint()..color = AppColors.brandRed;

    canvas.drawCircle(pinCentre, pinRadius, red);

    final Path tip = Path()
      ..moveTo(pinCentre.dx - pinRadius * 0.72, pinCentre.dy + pinRadius * 0.62)
      ..lineTo(pinCentre.dx, pinCentre.dy + pinRadius * 1.95)
      ..lineTo(pinCentre.dx + pinRadius * 0.72, pinCentre.dy + pinRadius * 0.62)
      ..close();
    canvas.drawPath(tip, red);

    // Catchlight, which is what makes the mark read as an eye rather than a
    // generic circle.
    canvas.drawCircle(
      Offset(pinCentre.dx - pinRadius * 0.3, pinCentre.dy - pinRadius * 0.34),
      pinRadius * 0.3,
      Paint()..color = Colors.white.withValues(alpha: 0.92),
    );
  }

  @override
  bool shouldRepaint(_BantayLogoPainter oldDelegate) => false;
}

/// A pulsing ring used behind the user's location dot and on the splash mark.
class PulseRing extends StatefulWidget {
  const PulseRing({
    super.key,
    required this.child,
    this.color = AppColors.userLocation,
    this.maxRadius = 34,
  });

  final Widget child;
  final Color color;
  final double maxRadius;

  @override
  State<PulseRing> createState() => _PulseRingState();
}

class _PulseRingState extends State<PulseRing>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2200),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (BuildContext context, Widget? child) {
        return CustomPaint(
          painter: _PulsePainter(
            progress: _controller.value,
            color: widget.color,
            maxRadius: widget.maxRadius,
          ),
          child: child,
        );
      },
      child: Center(child: widget.child),
    );
  }
}

class _PulsePainter extends CustomPainter {
  const _PulsePainter({
    required this.progress,
    required this.color,
    required this.maxRadius,
  });

  final double progress;
  final Color color;
  final double maxRadius;

  @override
  void paint(Canvas canvas, Size size) {
    final Offset centre = Offset(size.width / 2, size.height / 2);
    // Two rings a half-cycle apart read as a steady heartbeat rather than a
    // single ring that visibly restarts.
    for (final double offset in <double>[0, 0.5]) {
      final double t = (progress + offset) % 1.0;
      final double radius = maxRadius * Curves.easeOut.transform(t);
      final double opacity = (1.0 - t) * 0.35;
      if (radius <= 0) continue;
      canvas.drawCircle(
        centre,
        radius,
        Paint()..color = color.withValues(alpha: math.max(0, opacity)),
      );
    }
  }

  @override
  bool shouldRepaint(_PulsePainter oldDelegate) =>
      oldDelegate.progress != progress;
}
