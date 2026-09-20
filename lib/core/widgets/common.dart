import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

/// A small pill label, used for verification state, severity and categories.
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    required this.color,
    this.icon,
    this.filled = false,
    this.compact = false,
  });

  final String label;
  final Color color;
  final IconData? icon;
  final bool filled;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final Color foreground = filled ? Colors.white : color;
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 10,
        vertical: compact ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: filled ? color : color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        border: filled ? null : Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (icon != null) ...<Widget>[
            Icon(icon, size: compact ? 12 : 14, color: foreground),
            SizedBox(width: compact ? 4 : 5),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: compact ? 11 : 12.5,
              fontWeight: FontWeight.w700,
              color: foreground,
              height: 1.1,
            ),
          ),
        ],
      ),
    );
  }
}

/// A white card with the app's standard border and padding.
class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.borderColor,
  });

  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    final BorderRadius radius = BorderRadius.circular(AppTheme.radiusMedium);
    return Material(
      color: AppColors.surface,
      borderRadius: radius,
      child: InkWell(
        onTap: onTap,
        borderRadius: radius,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: radius,
            border: Border.all(color: borderColor ?? AppColors.line),
          ),
          padding: padding,
          child: child,
        ),
      ),
    );
  }
}

/// Heading used above grouped settings and list sections.
class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.action});

  final String title;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 20, 4, 10),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Text(
              title.toUpperCase(),
              style: const TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.9,
                color: AppColors.inkFaint,
              ),
            ),
          ),
          ?action,
        ],
      ),
    );
  }
}

/// Shown wherever a list has nothing in it yet.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.message,
    this.title,
    this.action,
  });

  final IconData icon;
  final String message;
  final String? title;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                color: AppColors.brandBlueLight,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 34, color: AppColors.brandBlue),
            ),
            const SizedBox(height: 18),
            if (title != null) ...<Widget>[
              Text(
                title!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 6),
            ],
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (action != null) ...<Widget>[
              const SizedBox(height: 20),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

/// A filled button that shows a spinner while its action runs.
///
/// Every async action in Bantay routes through this so the app always feels
/// responsive, and so a slow network can never produce a double submission.
class LoadingButton extends StatelessWidget {
  const LoadingButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
    this.background,
    this.foreground,
    this.outlined = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final Color? background;
  final Color? foreground;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    final Widget content = isLoading
        ? SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2.4,
              valueColor: AlwaysStoppedAnimation<Color>(
                outlined ? (foreground ?? AppColors.brandBlue) : Colors.white,
              ),
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              if (icon != null) ...<Widget>[
                Icon(icon, size: 20),
                const SizedBox(width: 8),
              ],
              Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
            ],
          );

    // Disabling during load is what actually prevents the double tap.
    final VoidCallback? handler = isLoading ? null : onPressed;

    if (outlined) {
      return OutlinedButton(
        onPressed: handler,
        style: foreground == null
            ? null
            : OutlinedButton.styleFrom(foregroundColor: foreground),
        child: content,
      );
    }
    return FilledButton(
      onPressed: handler,
      style: background == null
          ? null
          : FilledButton.styleFrom(backgroundColor: background),
      child: content,
    );
  }
}

/// A full-width banner for safety status and offline notices.
class StatusBanner extends StatelessWidget {
  const StatusBanner({
    super.key,
    required this.icon,
    required this.title,
    required this.color,
    this.message,
    this.action,
    this.onDismiss,
  });

  final IconData icon;
  final String title;
  final Color color;
  final String? message;
  final Widget? action;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 14,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, color: Colors.white, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                    height: 1.25,
                  ),
                ),
                if (message != null) ...<Widget>[
                  const SizedBox(height: 3),
                  Text(
                    message!,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.92),
                      fontSize: 13,
                      height: 1.35,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (action != null) ...<Widget>[const SizedBox(width: 8), action!],
          if (onDismiss != null)
            IconButton(
              onPressed: onDismiss,
              icon: const Icon(Icons.close, size: 18),
              color: Colors.white,
              visualDensity: VisualDensity.compact,
              tooltip: MaterialLocalizations.of(context).closeButtonLabel,
            ),
        ],
      ),
    );
  }
}

/// Snackbar helpers, so feedback looks the same everywhere.
class AppToast {
  const AppToast._();

  static void show(
    BuildContext context,
    String message, {
    IconData? icon,
    Color? background,
    SnackBarAction? action,
  }) {
    final ScaffoldMessengerState messenger = ScaffoldMessenger.of(context);
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Row(
            children: <Widget>[
              if (icon != null) ...<Widget>[
                Icon(icon, color: Colors.white, size: 20),
                const SizedBox(width: 10),
              ],
              Expanded(child: Text(message)),
            ],
          ),
          backgroundColor: background,
          action: action,
          duration: const Duration(seconds: 3),
        ),
      );
  }

  static void success(
    BuildContext context,
    String message, {
    SnackBarAction? action,
  }) => show(
    context,
    message,
    icon: Icons.check_circle_outline,
    background: AppColors.safeDark,
    action: action,
  );

  static void error(BuildContext context, String message) => show(
    context,
    message,
    icon: Icons.error_outline,
    background: AppColors.brandRedDark,
  );

  static void info(
    BuildContext context,
    String message, {
    SnackBarAction? action,
  }) => show(context, message, icon: Icons.info_outline, action: action);
}

/// Confirmation dialog used by destructive actions.
Future<bool> confirmDialog(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  required String cancelLabel,
  bool destructive = true,
}) async {
  final bool? result = await showDialog<bool>(
    context: context,
    builder: (BuildContext context) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: <Widget>[
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(cancelLabel),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(true),
          style: destructive
              ? FilledButton.styleFrom(backgroundColor: AppColors.brandRed)
              : null,
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return result ?? false;
}
