import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../app/routes.dart';
import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common.dart';
import '../../data/repositories/auth_repository.dart';
import 'widgets/auth_scaffold.dart';

/// Account creation. On success the user continues to role selection.
class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final GlobalKey<FormState> _form = GlobalKey<FormState>();
  final TextEditingController _name = TextEditingController();
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();

  bool _obscure = true;
  bool _busy = false;
  String? _pendingProvider;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _signUp() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);

    final AuthResult result = await context.read<AuthRepository>().signUp(
      name: _name.text,
      email: _email.text,
      password: _password.text,
    );

    if (!mounted) return;
    setState(() => _busy = false);

    if (!result.isSuccess) {
      AppToast.error(context, result.error ?? S.of(context).somethingWentWrong);
      return;
    }
    Navigator.of(context).pushNamedAndRemoveUntil(
      Routes.roleSelection,
      (Route<dynamic> route) => false,
    );
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
    Navigator.of(context).pushNamedAndRemoveUntil(
      Routes.roleSelection,
      (Route<dynamic> route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return AuthScaffold(
      title: s.createAccount,
      subtitle: s.tagline,
      showBack: false,
      // Wrap, not Row: at small widths or large text scales the
      // prompt and the action need to fall onto two lines rather
      // than overflow.
      footer: Wrap(
        alignment: WrapAlignment.center,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: <Widget>[
          Text(
            s.alreadyHaveAccount,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          TextButton(
            onPressed: () =>
                Navigator.of(context).pushReplacementNamed(Routes.login),
            child: Text(s.logIn),
          ),
        ],
      ),
      children: <Widget>[
        Form(
          key: _form,
          child: Column(
            children: <Widget>[
              AuthField(
                controller: _name,
                label: s.fullName,
                prefixIcon: Icons.person_outline,
                textInputAction: TextInputAction.next,
                autofillHints: const <String>[AutofillHints.name],
                validator: (String? v) =>
                    AuthValidators.name(v, required: s.nameRequired),
              ),
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
                autofillHints: const <String>[AutofillHints.newPassword],
                onSubmitted: (_) => _signUp(),
                validator: (String? v) => AuthValidators.password(
                  v,
                  required: s.passwordRequired,
                  tooShort: s.passwordTooShort,
                ),
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
        const SizedBox(height: 10),
        LoadingButton(label: s.signUp, isLoading: _busy, onPressed: _signUp),
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
