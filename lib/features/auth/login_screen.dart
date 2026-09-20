import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../app/routes.dart';
import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common.dart';
import '../../data/repositories/auth_repository.dart';
import '../../state/location_controller.dart';
import '../../state/settings_controller.dart';
import 'widgets/auth_scaffold.dart';

/// Email / social log-in for returning users.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final GlobalKey<FormState> _form = GlobalKey<FormState>();
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();

  bool _obscure = true;
  bool _busy = false;
  String? _pendingProvider;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _logIn() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);

    final AuthResult result = await context.read<AuthRepository>().logIn(
      email: _email.text,
      password: _password.text,
    );

    if (!mounted) return;
    setState(() => _busy = false);

    if (!result.isSuccess) {
      AppToast.error(context, result.error ?? S.of(context).somethingWentWrong);
      return;
    }
    await _continueAfterAuth();
  }

  Future<void> _social(String provider) async {
    setState(() => _pendingProvider = provider);
    final AuthResult result = await context
        .read<AuthRepository>()
        .signInWithProvider(provider);

    if (!mounted) return;
    setState(() => _pendingProvider = null);

    if (!result.isSuccess) {
      AppToast.error(context, result.error ?? S.of(context).somethingWentWrong);
      return;
    }
    await _continueAfterAuth();
  }

  /// A returning user who already granted location goes straight to the map;
  /// anyone else still has to pass through the permission screen.
  Future<void> _continueAfterAuth() async {
    final SettingsController settings = context.read<SettingsController>();
    final NavigatorState navigator = Navigator.of(context);

    if (!settings.locationGranted) {
      navigator.pushNamedAndRemoveUntil(
        Routes.locationPermission,
        (Route<dynamic> route) => false,
      );
      return;
    }

    final LocationController location = context.read<LocationController>();
    await location.requestAndLocate();
    await location.startTracking();
    navigator.pushNamedAndRemoveUntil(
      Routes.home,
      (Route<dynamic> route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return AuthScaffold(
      title: s.welcomeBack,
      subtitle: s.tagline,
      showBack: false,
      // Wrap, not Row: at small widths or large text scales the
      // prompt and the action need to fall onto two lines rather
      // than overflow.
      footer: Wrap(
        alignment: WrapAlignment.center,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: <Widget>[
          Text(s.noAccountYet, style: Theme.of(context).textTheme.bodyMedium),
          TextButton(
            onPressed: () =>
                Navigator.of(context).pushReplacementNamed(Routes.signUp),
            child: Text(s.signUp),
          ),
        ],
      ),
      children: <Widget>[
        Form(
          key: _form,
          child: Column(
            children: <Widget>[
              AuthField(
                controller: _email,
                label: s.email,
                prefixIcon: Icons.mail_outline,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autofillHints: const <String>[AutofillHints.email],
                validator: (String? v) => AuthValidators.email(
                  v,
                  required: s.emailRequired,
                  invalid: s.emailInvalid,
                ),
              ),
              AuthField(
                controller: _password,
                label: s.password,
                obscure: _obscure,
                prefixIcon: Icons.lock_outline,
                textInputAction: TextInputAction.done,
                autofillHints: const <String>[AutofillHints.password],
                onSubmitted: (_) => _logIn(),
                validator: (String? v) =>
                    (v ?? '').isEmpty ? s.passwordRequired : null,
                suffix: IconButton(
                  onPressed: () => setState(() => _obscure = !_obscure),
                  icon: Icon(
                    _obscure
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    size: 20,
                  ),
                ),
              ),
            ],
          ),
        ),
        Align(
          alignment: AlignmentDirectional.centerEnd,
          child: TextButton(
            onPressed: () =>
                Navigator.of(context).pushNamed(Routes.forgotPassword),
            child: Text(s.forgotPassword),
          ),
        ),
        const SizedBox(height: 10),
        LoadingButton(label: s.logIn, isLoading: _busy, onPressed: _logIn),
        const SizedBox(height: 22),
        OrDivider(label: s.orDivider),
        const SizedBox(height: 18),
        SocialAuthButton(
          label: s.continueWithGoogle,
          icon: Icons.g_mobiledata,
          color: AppColors.brandRed,
          isLoading: _pendingProvider == 'google',
          onPressed: () => _social('google'),
        ),
        SocialAuthButton(
          label: s.continueWithFacebook,
          icon: Icons.facebook,
          color: AppColors.brandBlue,
          isLoading: _pendingProvider == 'facebook',
          onPressed: () => _social('facebook'),
        ),
      ],
    );
  }
}
