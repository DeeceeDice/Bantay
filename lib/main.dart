import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app/bantay_app.dart';
import 'data/local/local_store.dart';
import 'data/repositories/auth_repository.dart';
import 'data/repositories/bantay_repository.dart';
import 'state/location_controller.dart';
import 'state/settings_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Bantay is used one-handed while walking; locking to portrait keeps the
  // map controls where the thumb expects them.
  await SystemChrome.setPreferredOrientations(<DeviceOrientation>[
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
    ),
  );

  // Storage and the repositories that sit on it are built before the first
  // frame, so no screen ever has to render an "initialising" state.
  final LocalStore store = await LocalStore.open();

  final SettingsController settings = SettingsController(store);
  final AuthRepository auth = AuthRepository(store);
  final BantayRepository data = BantayRepository(store, auth);

  await settings.initialize();
  await auth.initialize();
  await data.initialize();

  runApp(
    BantayApp(
      store: store,
      settings: settings,
      auth: auth,
      data: data,
      location: LocationController(),
    ),
  );
}
