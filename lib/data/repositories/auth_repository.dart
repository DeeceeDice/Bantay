import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../local/local_store.dart';
import '../models/enums.dart';
import '../models/user_profile.dart';

/// Result of an auth attempt, so the UI can show a precise error.
class AuthResult {
  const AuthResult.success(this.profile) : error = null, isSuccess = true;
  const AuthResult.failure(this.error) : profile = null, isSuccess = false;

  final UserProfile? profile;
  final String? error;
  final bool isSuccess;
}

/// Account storage and sign-in.
///
/// Bantay ships with a self-contained account store so the app is fully
/// usable the moment it is installed, with no backend to stand up and no API
/// keys to configure. Passwords are salted and SHA-256 hashed rather than
/// kept in the clear.
///
/// This class is the single seam for a real backend: swap the body of
/// [signUp], [logIn] and [signInWithProvider] for calls to Firebase Auth (or
/// any other provider) and nothing else in the app has to change.
class AuthRepository extends ChangeNotifier {
  AuthRepository(this._store);

  final LocalStore _store;
  static const Uuid _uuid = Uuid();

  UserProfile? _current;
  UserProfile? get currentUser => _current;
  bool get isLoggedIn => _current != null;

  /// Restores the previous session, if any.
  Future<void> initialize() async {
    final Map<String, dynamic>? session = _store.readObject(StoreKeys.session);
    if (session != null) {
      final String? userId = session['userId'] as String?;
      if (userId != null) {
        _current = _findAccountById(userId)?.profile;
      }
    }
    notifyListeners();
  }

  Future<AuthResult> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    await _simulateLatency();
    final String normalized = email.trim().toLowerCase();

    if (_findAccountByEmail(normalized) != null) {
      return const AuthResult.failure(
        'An account with that email already exists. Try logging in instead.',
      );
    }

    final String salt = _uuid.v4();
    final UserProfile profile = UserProfile(
      id: _uuid.v4(),
      name: name.trim(),
      email: normalized,
      // Role is chosen on the next screen; commuter is the safe default so a
      // half-finished signup can never grant verification powers.
      role: UserRole.commuter,
      joinedAt: DateTime.now(),
    );

    await _writeAccount(
      _Account(
        profile: profile,
        salt: salt,
        passwordHash: _hash(password, salt),
      ),
    );
    await _startSession(profile);
    return AuthResult.success(profile);
  }

  Future<AuthResult> logIn({
    required String email,
    required String password,
  }) async {
    await _simulateLatency();
    final String normalized = email.trim().toLowerCase();
    final _Account? account = _findAccountByEmail(normalized);

    if (account == null) {
      return const AuthResult.failure('No account found for that email.');
    }
    if (account.passwordHash != _hash(password, account.salt)) {
      return const AuthResult.failure('Incorrect password. Please try again.');
    }

    await _startSession(account.profile);
    return AuthResult.success(account.profile);
  }

  /// Google / Facebook sign-in.
  ///
  /// Wired end to end against the local account store so the button is a real,
  /// working action rather than a dead control. Replacing this body with the
  /// provider SDK call is the only change needed to go live.
  Future<AuthResult> signInWithProvider(String provider) async {
    await _simulateLatency();
    final String email = 'user.$provider@bantay.ph';
    final _Account? existing = _findAccountByEmail(email);

    if (existing != null) {
      await _startSession(existing.profile);
      return AuthResult.success(existing.profile);
    }

    final UserProfile profile = UserProfile(
      id: _uuid.v4(),
      name: provider == 'google' ? 'Google User' : 'Facebook User',
      email: email,
      role: UserRole.commuter,
      authProvider: provider,
      joinedAt: DateTime.now(),
    );
    final String salt = _uuid.v4();
    await _writeAccount(
      _Account(
        profile: profile,
        salt: salt,
        // Provider accounts have no local password; the hash can never match.
        passwordHash: _hash(_uuid.v4(), salt),
      ),
    );
    await _startSession(profile);
    return AuthResult.success(profile);
  }

  /// Password reset. Returns an error string when the email is unknown.
  Future<String?> requestPasswordReset(String email) async {
    await _simulateLatency();
    final String normalized = email.trim().toLowerCase();
    if (_findAccountByEmail(normalized) == null) {
      return 'No account found for that email.';
    }
    return null;
  }

  /// Applies a new password for [email]. Used by the reset flow.
  Future<void> resetPassword(String email, String newPassword) async {
    final _Account? account = _findAccountByEmail(email.trim().toLowerCase());
    if (account == null) return;
    final String salt = _uuid.v4();
    await _writeAccount(
      _Account(
        profile: account.profile,
        salt: salt,
        passwordHash: _hash(newPassword, salt),
      ),
    );
  }

  Future<void> selectRole(UserRole role) async {
    final UserProfile? user = _current;
    if (user == null) return;
    await updateProfile(user.copyWith(role: role));
  }

  /// Persists a changed profile and republishes it to listeners.
  Future<void> updateProfile(UserProfile updated) async {
    final _Account? account = _findAccountById(updated.id);
    if (account == null) return;
    await _writeAccount(
      _Account(
        profile: updated,
        salt: account.salt,
        passwordHash: account.passwordHash,
      ),
    );
    _current = updated;
    notifyListeners();
  }

  Future<void> logOut() async {
    await _store.writeObject(StoreKeys.session, null);
    _current = null;
    notifyListeners();
  }

  // --- storage helpers ---------------------------------------------------

  Future<void> _startSession(UserProfile profile) async {
    await _store.writeObject(StoreKeys.session, <String, dynamic>{
      'userId': profile.id,
      'startedAt': DateTime.now().toIso8601String(),
    });
    _current = profile;
    notifyListeners();
  }

  List<_Account> _accounts() =>
      _store.readCollection(StoreKeys.accounts).map(_Account.fromJson).toList();

  _Account? _findAccountByEmail(String email) {
    for (final _Account a in _accounts()) {
      if (a.profile.email == email) return a;
    }
    return null;
  }

  _Account? _findAccountById(String id) {
    for (final _Account a in _accounts()) {
      if (a.profile.id == id) return a;
    }
    return null;
  }

  Future<void> _writeAccount(_Account account) async {
    final List<_Account> all =
        _accounts()
            .where((_Account a) => a.profile.id != account.profile.id)
            .toList()
          ..add(account);
    await _store.writeCollection(
      StoreKeys.accounts,
      all.map((_Account a) => a.toJson()).toList(),
    );
  }

  static String _hash(String password, String salt) =>
      sha256.convert(utf8.encode('$salt::$password')).toString();

  /// A short delay so every auth action shows a real loading state.
  static Future<void> _simulateLatency() =>
      Future<void>.delayed(const Duration(milliseconds: 600));
}

class _Account {
  const _Account({
    required this.profile,
    required this.salt,
    required this.passwordHash,
  });

  final UserProfile profile;
  final String salt;
  final String passwordHash;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'profile': profile.toJson(),
    'salt': salt,
    'passwordHash': passwordHash,
  };

  factory _Account.fromJson(Map<String, dynamic> json) => _Account(
    profile: UserProfile.fromJson(
      Map<String, dynamic>.from(json['profile'] as Map<dynamic, dynamic>),
    ),
    salt: json['salt'] as String? ?? '',
    passwordHash: json['passwordHash'] as String? ?? '',
  );
}
