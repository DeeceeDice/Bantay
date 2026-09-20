import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../app/routes.dart';
import '../../core/i18n/strings.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/bantay_logo.dart';
import '../../data/local/local_store.dart';

/// Three skippable slides explaining what Bantay does before asking the user
/// to sign up.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pages = PageController();
  int _index = 0;

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    await context.read<LocalStore>().writeBool(StoreKeys.onboardingSeen, true);
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed(Routes.signUp);
  }

  void _next() {
    if (_index >= 2) {
      _finish();
      return;
    }
    _pages.nextPage(
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final List<_Slide> slides = <_Slide>[
      _Slide(
        icon: Icons.travel_explore,
        accent: AppColors.brandRed,
        title: s.onboardTitle1,
        body: s.onboardBody1,
      ),
      _Slide(
        icon: Icons.verified_user_outlined,
        accent: AppColors.brandBlue,
        title: s.onboardTitle2,
        body: s.onboardBody2,
      ),
      _Slide(
        icon: Icons.notifications_active_outlined,
        accent: AppColors.safe,
        title: s.onboardTitle3,
        body: s.onboardBody3,
      ),
    ];

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: Column(
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 12, 0),
              child: Row(
                children: <Widget>[
                  const BantayLogo(size: 34),
                  const SizedBox(width: 10),
                  const Text(
                    'Bantay',
                    style: TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                      color: AppColors.brandBlue,
                    ),
                  ),
                  const Spacer(),
                  TextButton(onPressed: _finish, child: Text(s.skip)),
                ],
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _pages,
                itemCount: slides.length,
                onPageChanged: (int i) => setState(() => _index = i),
                itemBuilder: (BuildContext context, int i) =>
                    _SlideView(slide: slides[i]),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
              child: Column(
                children: <Widget>[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List<Widget>.generate(
                      slides.length,
                      (int i) => AnimatedContainer(
                        duration: const Duration(milliseconds: 240),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        height: 8,
                        width: i == _index ? 26 : 8,
                        decoration: BoxDecoration(
                          color: i == _index
                              ? AppColors.brandRed
                              : AppColors.line,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 26),
                  FilledButton(
                    onPressed: _next,
                    child: Text(
                      _index >= slides.length - 1 ? s.getStarted : s.next,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Slide {
  const _Slide({
    required this.icon,
    required this.accent,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final Color accent;
  final String title;
  final String body;
}

class _SlideView extends StatelessWidget {
  const _SlideView({required this.slide});

  final _Slide slide;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Container(
            width: 168,
            height: 168,
            decoration: BoxDecoration(
              color: slide.accent.withValues(alpha: 0.10),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Container(
                width: 108,
                height: 108,
                decoration: BoxDecoration(
                  color: slide.accent.withValues(alpha: 0.16),
                  shape: BoxShape.circle,
                ),
                child: Icon(slide.icon, size: 52, color: slide.accent),
              ),
            ),
          ),
          const SizedBox(height: 44),
          Text(
            slide.title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 14),
          Text(
            slide.body,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge
                ?.copyWith(color: AppColors.inkMuted),
          ),
          const SizedBox(height: AppTheme.radiusLarge),
        ],
      ),
    );
  }
}
