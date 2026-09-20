import 'package:bantay/app/bantay_app.dart';
import 'package:bantay/data/local/local_store.dart';
import 'package:bantay/data/repositories/auth_repository.dart';
import 'package:bantay/data/repositories/bantay_repository.dart';
import 'package:bantay/state/location_controller.dart';
import 'package:bantay/state/settings_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Builds the real app with in-memory storage.
Future<Widget> buildApp({
  Map<String, Object> initialPrefs = const <String, Object>{},
}) async {
  SharedPreferences.setMockInitialValues(initialPrefs);
  final LocalStore store = await LocalStore.open();
  final SettingsController settings = SettingsController(store);
  final AuthRepository auth = AuthRepository(store);
  final BantayRepository data = BantayRepository(store, auth);

  await settings.initialize();
  await auth.initialize();
  await data.initialize();

  return BantayApp(
    store: store,
    settings: settings,
    auth: auth,
    data: data,
    location: LocationController(),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('the app boots to the splash screen', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(await buildApp());
    await tester.pump();

    expect(find.text('Bantay'), findsWidgets);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    // Let the splash's routing delay elapse so no timer outlives the test.
    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();
  });

  testWidgets('a first launch routes to onboarding', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(await buildApp());

    // Let the splash delay elapse and the route transition settle.
    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();

    expect(find.text('See hazards in real time'), findsOneWidget);
    expect(find.text('Skip'), findsOneWidget);
  });

  testWidgets('onboarding advances through all three slides', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(await buildApp());
    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();

    expect(find.text('See hazards in real time'), findsOneWidget);

    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Verified by your barangay'), findsOneWidget);

    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Get alerted before you leave'), findsOneWidget);

    // The last slide offers Get Started rather than Next.
    expect(find.text('Get Started'), findsOneWidget);
  });

  testWidgets('skipping onboarding lands on sign up', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(await buildApp());
    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();

    expect(find.text('Create your account'), findsOneWidget);
    expect(find.text('Full name'), findsOneWidget);
    expect(find.text('Continue with Google'), findsOneWidget);
  });

  testWidgets('a returning logged-out user goes straight to log in', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      await buildApp(
        initialPrefs: <String, Object>{StoreKeys.onboardingSeen: true},
      ),
    );
    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();

    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('Forgot password?'), findsOneWidget);
  });

  testWidgets('sign up validates its fields before submitting', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(await buildApp());
    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();

    // Submitting an empty form surfaces every validation message.
    await tester.tap(find.widgetWithText(FilledButton, 'Sign Up'));
    await tester.pumpAndSettle();

    expect(find.text('Name is required.'), findsOneWidget);
    expect(find.text('Email is required.'), findsOneWidget);
    expect(find.text('Password is required.'), findsOneWidget);
  });

  testWidgets('a short password is rejected', (WidgetTester tester) async {
    await tester.pumpWidget(await buildApp());
    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextFormField, 'Full name'),
      'Ramon',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Email'),
      'ramon@example.com',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Password'),
      'short',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Sign Up'));
    await tester.pumpAndSettle();

    expect(
      find.text('Password must be at least 8 characters.'),
      findsOneWidget,
    );
  });

  testWidgets('a full sign up reaches role selection', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(await buildApp());
    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextFormField, 'Full name'),
      'Ramon Torres',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Email'),
      'ramon@example.com',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Password'),
      'password123',
    );

    await tester.tap(find.widgetWithText(FilledButton, 'Sign Up'));
    // Covers the simulated auth latency.
    await tester.pump(const Duration(milliseconds: 900));
    await tester.pumpAndSettle();

    expect(find.text('Choose your role'), findsOneWidget);
    expect(find.text('Commuter / Resident'), findsOneWidget);
    expect(find.text('Barangay Official'), findsOneWidget);
  });

  testWidgets('role selection gates Next until a role is picked', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(await buildApp());
    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextFormField, 'Full name'),
      'Ramon Torres',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Email'),
      'ramon@example.com',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Password'),
      'password123',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Sign Up'));
    await tester.pump(const Duration(milliseconds: 900));
    await tester.pumpAndSettle();

    final Finder next = find.widgetWithText(FilledButton, 'Next');
    expect(tester.widget<FilledButton>(next).onPressed, isNull);

    await tester.tap(find.text('Commuter / Resident'));
    await tester.pumpAndSettle();

    expect(tester.widget<FilledButton>(next).onPressed, isNotNull);
  });

  testWidgets('switching to Filipino translates the interface', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      await buildApp(initialPrefs: <String, Object>{StoreKeys.locale: 'fil'}),
    );
    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();

    expect(find.text('Laktawan'), findsOneWidget);
    expect(find.text('Makita ang panganib sa oras na iyon'), findsOneWidget);
  });
}
