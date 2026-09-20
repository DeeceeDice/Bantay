import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Key-value persistence for the whole app.
///
/// Bantay stores its domain data as a single JSON document per collection in
/// [SharedPreferences]. That keeps the storage layer dependency-free and
/// identical on Android, iOS and web, and the data volumes involved (a few
/// hundred reports at most) are far below the point where a real database
/// would earn its complexity.
///
/// Swapping in a remote backend later means reimplementing this one class
/// plus the repositories that call it; nothing in the UI touches storage.
class LocalStore {
  LocalStore(this._prefs);

  final SharedPreferences _prefs;

  static Future<LocalStore> open() async =>
      LocalStore(await SharedPreferences.getInstance());

  // --- Collections (JSON lists) -----------------------------------------

  List<Map<String, dynamic>> readCollection(String key) {
    final String? raw = _prefs.getString(key);
    if (raw == null || raw.isEmpty) return <Map<String, dynamic>>[];
    try {
      final dynamic decoded = jsonDecode(raw);
      if (decoded is! List) return <Map<String, dynamic>>[];
      return decoded
          .whereType<Map<dynamic, dynamic>>()
          .map((Map<dynamic, dynamic> e) => Map<String, dynamic>.from(e))
          .toList();
    } on FormatException {
      // Corrupt payload: drop it rather than trapping the user on a crash
      // loop they cannot clear without reinstalling.
      return <Map<String, dynamic>>[];
    }
  }

  Future<void> writeCollection(
    String key,
    List<Map<String, dynamic>> rows,
  ) async {
    await _prefs.setString(key, jsonEncode(rows));
  }

  // --- Single objects ----------------------------------------------------

  Map<String, dynamic>? readObject(String key) {
    final String? raw = _prefs.getString(key);
    if (raw == null || raw.isEmpty) return null;
    try {
      final dynamic decoded = jsonDecode(raw);
      return decoded is Map<dynamic, dynamic>
          ? Map<String, dynamic>.from(decoded)
          : null;
    } on FormatException {
      return null;
    }
  }

  Future<void> writeObject(String key, Map<String, dynamic>? value) async {
    if (value == null) {
      await _prefs.remove(key);
    } else {
      await _prefs.setString(key, jsonEncode(value));
    }
  }

  // --- Scalars -----------------------------------------------------------

  bool readBool(String key, {bool fallback = false}) =>
      _prefs.getBool(key) ?? fallback;

  Future<void> writeBool(String key, bool value) => _prefs.setBool(key, value);

  double readDouble(String key, {double fallback = 0}) =>
      _prefs.getDouble(key) ?? fallback;

  Future<void> writeDouble(String key, double value) =>
      _prefs.setDouble(key, value);

  String? readString(String key) => _prefs.getString(key);

  Future<void> writeString(String key, String value) =>
      _prefs.setString(key, value);

  List<String> readStringList(String key) =>
      _prefs.getStringList(key) ?? <String>[];

  Future<void> writeStringList(String key, List<String> value) =>
      _prefs.setStringList(key, value);

  Future<void> remove(String key) => _prefs.remove(key);

  /// Wipes every Bantay key. Used by "Log out" and by the reset-demo action.
  Future<void> clearAll() async {
    for (final String key in _prefs.getKeys().toList()) {
      if (key.startsWith(StoreKeys.prefix)) {
        await _prefs.remove(key);
      }
    }
  }
}

/// Every persisted key in one place, so nothing collides silently.
class StoreKeys {
  const StoreKeys._();

  static const String prefix = 'bantay.';

  static const String seeded = '${prefix}seeded.v1';
  static const String onboardingSeen = '${prefix}onboarding_seen';
  static const String session = '${prefix}session';
  static const String accounts = '${prefix}accounts';

  static const String reports = '${prefix}reports';
  static const String safeSpots = '${prefix}safe_spots';
  static const String routes = '${prefix}routes';
  static const String alerts = '${prefix}alerts';
  static const String subscribedSpots = '${prefix}subscribed_spots';

  static const String locale = '${prefix}locale';
  static const String pushEnabled = '${prefix}push_enabled';
  static const String smsFallbackEnabled = '${prefix}sms_fallback';
  static const String alertRadiusKm = '${prefix}alert_radius_km';
  static const String locationGranted = '${prefix}location_granted';
  static const String mapLayers = '${prefix}map_layers';
  static const String offlineMode = '${prefix}offline_mode';
}
