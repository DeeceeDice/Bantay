import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common.dart';
import '../../data/repositories/auth_repository.dart';
import 'widgets/auth_scaffold.dart';

/// Password reset.
///
/// Two stages in one screen: confirm the email exists, then set a new
/// password. A real deployment would send a signed link instead of moving
/// straight to stage two; [AuthRepository.requestPasswordReset] is the seam
/// where that swap happens.
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final GlobalKey<FormState> _form = GlobalKey<FormState>();
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();

  bool _busy = false;
  bool _obscure = true;
  bool _verified = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);

    final AuthRepository auth = context.read<AuthRepository>();
    final S s = S.of(context);

    if (!_verified) {
      final String? error = await auth.requestPasswordReset(_email.text);
      if (!mounted) return;
      setState(() => _busy = false);

      if (error != null) {
        AppToast.error(context, error);
        return;
      }
      setState(() => _verified = true);
      AppToast.info(context, s.resetLinkSent);
      return;
    }

    await auth.resetPassword(_email.text, _password.text);
    if (!mounted) return;
    setState(() => _busy = false);
    AppToast.success(context, s.passwordUpdated);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);

    return AuthScaffold(
      title: s.resetPassword,
      subtitle: _verified ? s.passwordUpdated : s.forgotPassword,
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
                validator: (String? v) => AuthValidators.email(
                  v,
                  required: s.emailRequired,
                  invalid: s.emailInvalid,
                ),
              ),
              if (_verified)
                AuthField(
                  controller: _password,
                  label: s.newPassword,
                  obscure: _obscure,
                  prefixIcon: Icons.lock_outline,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _submit(),
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
        LoadingButton(
          label: _verified ? s.resetPassword : s.next,
          isLoading: _busy,
          onPressed: _submit,
        ),
        const SizedBox(height: 16),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Icon(Icons.info_outline, size: 18, color: AppColors.inkFaint),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                s.resetLinkSent,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
