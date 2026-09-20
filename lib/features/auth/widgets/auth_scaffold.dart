import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/bantay_logo.dart';

/// Shared chrome for the sign-up, log-in and password-reset screens.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    required this.children,
    this.showBack = true,
    this.footer,
  });

  final String title;
  final String subtitle;
  final List<Widget> children;
  final bool showBack;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final bool canPop = Navigator.of(context).canPop();
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: showBack && canPop
          ? AppBar(
              backgroundColor: AppColors.surface,
              leading: const BackButton(),
              elevation: 0,
            )
          : null,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (BuildContext context, BoxConstraints constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 28),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight - 36,
                ),
                child: Center(
                  // Centres the form on tablets and wide web windows instead
                  // of stretching inputs across the whole screen.
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 440),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: <Widget>[
                        if (!showBack || !canPop)
                          const Padding(
                            padding: EdgeInsets.only(top: 12, bottom: 4),
                            child: BantayLogo(size: 62, showWordmark: true),
                          ),
                        const SizedBox(height: 26),
                        Text(
                          title,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          subtitle,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 28),
                        ...children,
                        if (footer != null) ...<Widget>[
                          const SizedBox(height: 22),
                          footer!,
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

/// "or" rule between the email form and the social buttons.
class OrDivider extends StatelessWidget {
  const OrDivider({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        const Expanded(child: Divider(color: AppColors.line)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Text(
            label,
            style: const TextStyle(
              color: AppColors.inkFaint,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const Expanded(child: Divider(color: AppColors.line)),
      ],
    );
  }
}

/// Google / Facebook sign-in button.
class SocialAuthButton extends StatelessWidget {
  const SocialAuthButton({
    super.key,
    required this.label,
    required this.icon,
    required this.color,
    required this.onPressed,
    this.isLoading = false,
  });

  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback? onPressed;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: OutlinedButton(
        onPressed: isLoading ? null : onPressed,
        child: isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2.4),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  Icon(icon, size: 21, color: color),
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text(
                      label,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppColors.ink),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

/// Email / password field with Bantay's validation messages.
class AuthField extends StatelessWidget {
  const AuthField({
    super.key,
    required this.controller,
    required this.label,
    this.hint,
    this.obscure = false,
    this.keyboardType,
    this.textInputAction,
    this.validator,
    this.prefixIcon,
    this.suffix,
    this.autofillHints,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String label;
  final String? hint;
  final bool obscure;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final String? Function(String?)? validator;
  final IconData? prefixIcon;
  final Widget? suffix;
  final List<String>? autofillHints;
  final void Function(String)? onSubmitted;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: controller,
        obscureText: obscure,
        keyboardType: keyboardType,
        textInputAction: textInputAction,
        validator: validator,
        autofillHints: autofillHints,
        onFieldSubmitted: onSubmitted,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: prefixIcon == null ? null : Icon(prefixIcon, size: 20),
          suffixIcon: suffix,
        ),
      ),
    );
  }
}

/// Field validators shared by the auth screens.
class AuthValidators {
  const AuthValidators._();

  static final RegExp _email = RegExp(r'^[\w.+-]+@[\w-]+\.[\w.-]+$');

  static String? email(
    String? value, {
    required String required,
    required String invalid,
  }) {
    final String text = (value ?? '').trim();
    if (text.isEmpty) return required;
    if (!_email.hasMatch(text)) return invalid;
    return null;
  }

  static String? password(
    String? value, {
    required String required,
    required String tooShort,
  }) {
    final String text = value ?? '';
    if (text.isEmpty) return required;
    if (text.length < 8) return tooShort;
    return null;
  }

  static String? name(String? value, {required String required}) =>
      (value ?? '').trim().isEmpty ? required : null;
}
