import 'package:bantay/data/local/local_store.dart';
import 'package:bantay/data/models/enums.dart';
import 'package:bantay/data/models/user_profile.dart';
import 'package:bantay/data/repositories/auth_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<AuthRepository> buildAuth() async {
  SharedPreferences.setMockInitialValues(<String, Object>{});
  final LocalStore store = await LocalStore.open();
  final AuthRepository auth = AuthRepository(store);
  await auth.initialize();
  return auth;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('sign up', () {
    test('creates an account and starts a session', () async {
      final AuthRepository auth = await buildAuth();

      final AuthResult result = await auth.signUp(
        name: 'Ramon Torres',
        email: 'Ramon@Example.COM',
        password: 'password123',
      );

      expect(result.isSuccess, isTrue);
      expect(auth.isLoggedIn, isTrue);
      // Email is normalised so casing can never split one person into two
      // accounts.
      expect(auth.currentUser!.email, 'ramon@example.com');
      // A half-finished signup must never start out able to verify reports.
      expect(auth.currentUser!.role, UserRole.commuter);
    });

    test('rejects a duplicate email', () async {
      final AuthRepository auth = await buildAuth();
      await auth.signUp(
        name: 'Ramon',
        email: 'ramon@example.com',
        password: 'password123',
      );

      final AuthResult second = await auth.signUp(
        name: 'Someone Else',
        email: 'RAMON@example.com',
        password: 'different1',
      );

      expect(second.isSuccess, isFalse);
      expect(second.error, contains('already exists'));
    });
  });

  group('log in', () {
    test('succeeds with the right password', () async {
      final AuthRepository auth = await buildAuth();
      await auth.signUp(
        name: 'Ramon',
        email: 'ramon@example.com',
        password: 'password123',
      );
      await auth.logOut();
      expect(auth.isLoggedIn, isFalse);

      final AuthResult result = await auth.logIn(
        email: 'ramon@example.com',
        password: 'password123',
      );

      expect(result.isSuccess, isTrue);
      expect(auth.currentUser!.name, 'Ramon');
    });

    test('fails with the wrong password', () async {
      final AuthRepository auth = await buildAuth();
      await auth.signUp(
        name: 'Ramon',
        email: 'ramon@example.com',
        password: 'password123',
      );
      await auth.logOut();

      final AuthResult result = await auth.logIn(
        email: 'ramon@example.com',
        password: 'wrongpassword',
      );

      expect(result.isSuccess, isFalse);
      expect(auth.isLoggedIn, isFalse);
    });

    test('fails for an unknown email', () async {
      final AuthRepository auth = await buildAuth();

      final AuthResult result = await auth.logIn(
        email: 'nobody@example.com',
        password: 'password123',
      );

      expect(result.isSuccess, isFalse);
      expect(result.error, contains('No account'));
    });
  });

  test('passwords are never stored in the clear', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final AuthRepository auth = AuthRepository(LocalStore(prefs));
    await auth.initialize();

    await auth.signUp(
      name: 'Ramon',
      email: 'ramon@example.com',
      password: 'sup3rsecret',
    );

    final String stored = prefs.getString(StoreKeys.accounts) ?? '';
    expect(stored, isNotEmpty);
    expect(stored.contains('sup3rsecret'), isFalse);
  });

  test('a session is restored on the next launch', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final LocalStore store = await LocalStore.open();

    final AuthRepository first = AuthRepository(store);
    await first.initialize();
    await first.signUp(
      name: 'Ramon',
      email: 'ramon@example.com',
      password: 'password123',
    );

    final AuthRepository relaunched = AuthRepository(store);
    await relaunched.initialize();

    expect(relaunched.isLoggedIn, isTrue);
    expect(relaunched.currentUser!.email, 'ramon@example.com');
  });

  test('logging out clears the session', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final LocalStore store = await LocalStore.open();
    final AuthRepository auth = AuthRepository(store);
    await auth.initialize();
    await auth.signUp(
      name: 'Ramon',
      email: 'ramon@example.com',
      password: 'password123',
    );

    await auth.logOut();

    final AuthRepository relaunched = AuthRepository(store);
    await relaunched.initialize();
    expect(relaunched.isLoggedIn, isFalse);
  });

  test('role selection persists and grants verification rights', () async {
    final AuthRepository auth = await buildAuth();
    await auth.signUp(
      name: 'Official Cruz',
      email: 'official@example.com',
      password: 'password123',
    );

    await auth.selectRole(UserRole.barangayOfficial);

    expect(auth.currentUser!.role, UserRole.barangayOfficial);
    expect(auth.currentUser!.role.canVerify, isTrue);
  });

  group('trust score', () {
    UserProfile profile({
      int submitted = 0,
      int verified = 0,
      int rejected = 0,
    }) => UserProfile(
      id: 'u',
      name: 'Test User',
      email: 't@example.com',
      role: UserRole.commuter,
      reportsSubmitted: submitted,
      reportsVerified: verified,
      reportsRejected: rejected,
    );

    test('a brand new account starts neutral', () {
      expect(profile().trustScore, 50);
    });

    test('accurate reporting raises the score above neutral', () {
      expect(profile(submitted: 4, verified: 4).trustScore, greaterThan(50));
    });

    test('rejected reports pull the score down', () {
      final int accurate = profile(submitted: 4, verified: 4).trustScore;
      final int sloppy = profile(
        submitted: 4,
        verified: 1,
        rejected: 3,
      ).trustScore;
      expect(sloppy, lessThan(accurate));
    });

    test('stays within 0 and 100 even at extremes', () {
      expect(
        profile(submitted: 500, verified: 500).trustScore,
        inInclusiveRange(0, 100),
      );
      expect(
        profile(submitted: 500, rejected: 500).trustScore,
        inInclusiveRange(0, 100),
      );
    });

    test('volume alone cannot outrank accuracy', () {
      final int accurate = profile(submitted: 10, verified: 10).trustScore;
      final int prolificButWrong = profile(
        submitted: 100,
        verified: 20,
        rejected: 80,
      ).trustScore;
      expect(prolificButWrong, lessThan(accurate));
    });
  });

  test('initials handle one-word and empty names', () {
    UserProfile named(String name) => UserProfile(
      id: 'u',
      name: name,
      email: 't@example.com',
      role: UserRole.commuter,
    );

    expect(named('Ramon Torres').initials, 'RT');
    expect(named('Ramon').initials, 'R');
    expect(named('   ').initials, '?');
    expect(named('Maria Clara de Santos').initials, 'MS');
  });
}
