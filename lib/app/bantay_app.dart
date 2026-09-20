import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import '../core/theme/app_theme.dart';
import '../data/local/local_store.dart';
import '../data/repositories/auth_repository.dart';
import '../data/repositories/bantay_repository.dart';
import '../state/location_controller.dart';
import '../state/settings_controller.dart';
import '../state/shell_controller.dart';
import 'router.dart';

/// The application root: dependency wiring, theming and localisation.
class BantayApp extends StatelessWidget {
  const BantayApp({
    super.key,
    required this.store,
    required this.settings,
    required this.auth,
    required this.data,
    required this.location,
  });

  final LocalStore store;
  final SettingsController settings;
  final AuthRepository auth;
  final BantayRepository data;
  final LocationController location;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<LocalStore>.value(value: store),
        ChangeNotifierProvider<SettingsController>.value(value: settings),
        ChangeNotifierProvider<AuthRepository>.value(value: auth),
        ChangeNotifierProvider<BantayRepository>.value(value: data),
        ChangeNotifierProvider<LocationController>.value(value: location),
        ChangeNotifierProvider<ShellController>(
          create: (BuildContext _) => ShellController(),
        ),
      ],
      // Only the locale needs to rebuild MaterialApp; everything else is read
      // further down the tree.
      child: Consumer<SettingsController>(
        builder: (BuildContext context, SettingsController settings, Widget? _) {
          return MaterialApp(
            title: 'Bantay',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light(),
            locale: settings.locale,
            supportedLocales: const <Locale>[Locale('en'), Locale('fil')],
            localizationsDelegates: const <LocalizationsDelegate<Object>>[
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            // Anything we do not translate falls back to English rather than
            // to the device locale, which could be a language we have no
            // copy for at all.
            localeResolutionCallback:
                (Locale? locale, Iterable<Locale> supported) {
                  if (locale == null) return const Locale('en');
                  for (final Locale candidate in supported) {
                    if (candidate.languageCode == locale.languageCode) {
                      return candidate;
                    }
                  }
                  return const Locale('en');
                },
            initialRoute: AppRouter.initialRoute,
            onGenerateRoute: AppRouter.onGenerateRoute,
            builder: (BuildContext context, Widget? child) {
              // Clamp text scaling: beyond ~1.3x the map controls start to
              // overlap, and this app has to stay usable in an emergency.
              final MediaQueryData query = MediaQuery.of(context);
              return MediaQuery(
                data: query.copyWith(
                  textScaler: query.textScaler.clamp(
                    minScaleFactor: 0.85,
                    maxScaleFactor: 1.3,
                  ),
                ),
                child: child ?? const SizedBox.shrink(),
              );
            },
          );
        },
      ),
    );
  }
}
