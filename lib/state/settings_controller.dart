import 'package:flutter/material.dart';

import '../data/local/local_store.dart';
import '../data/models/enums.dart';

/// User preferences: language, notification settings and map layer state.
///
/// Everything here is persisted immediately on change, so the app reopens
/// exactly as the user left it.
class SettingsController extends ChangeNotifier {
  SettingsController(this._store);

  final LocalStore _store;

  Locale _locale = const Locale('en');
  bool _pushEnabled = true;
  bool _smsFallbackEnabled = true;
  double _alertRadiusKm = 2.0;
  bool _locationGranted = false;
  bool _offlineMode = false;
  Set<MapLayer> _layers = <MapLayer>{
    MapLayer.verifiedHazards,
    MapLayer.pendingReports,
    MapLayer.safeSpots,
  };

  Locale get locale => _locale;
  bool get isFilipino => _locale.languageCode == 'fil';
  bool get pushEnabled => _pushEnabled;
  bool get smsFallbackEnabled => _smsFallbackEnabled;
  double get alertRadiusKm => _alertRadiusKm;
  double get alertRadiusMeters => _alertRadiusKm * 1000;
  bool get locationGranted => _locationGranted;
  bool get offlineMode => _offlineMode;
  Set<MapLayer> get layers => Set<MapLayer>.unmodifiable(_layers);

  bool showsLayer(MapLayer layer) => _layers.contains(layer);

  /// True when the map is filtered down to verified hazards only.
  bool get verifiedOnly => !_layers.contains(MapLayer.pendingReports);

  Future<void> initialize() async {
    _locale = Locale(_store.readString(StoreKeys.locale) ?? 'en');
    _pushEnabled = _store.readBool(StoreKeys.pushEnabled, fallback: true);
    _smsFallbackEnabled = _store.readBool(
      StoreKeys.smsFallbackEnabled,
      fallback: true,
    );
    _alertRadiusKm = _store.readDouble(StoreKeys.alertRadiusKm, fallback: 2.0);
    _locationGranted = _store.readBool(StoreKeys.locationGranted);
    _offlineMode = _store.readBool(StoreKeys.offlineMode);

    final List<String> saved = _store.readStringList(StoreKeys.mapLayers);
    if (saved.isNotEmpty) {
      _layers = saved.map(MapLayer.fromId).toSet();
    }
    notifyListeners();
  }

  Future<void> setLocale(Locale locale) async {
    _locale = locale;
    await _store.writeString(StoreKeys.locale, locale.languageCode);
    notifyListeners();
  }

  Future<void> toggleLanguage() =>
      setLocale(isFilipino ? const Locale('en') : const Locale('fil'));

  Future<void> setPushEnabled(bool value) async {
    _pushEnabled = value;
    await _store.writeBool(StoreKeys.pushEnabled, value);
    notifyListeners();
  }

  Future<void> setSmsFallbackEnabled(bool value) async {
    _smsFallbackEnabled = value;
    await _store.writeBool(StoreKeys.smsFallbackEnabled, value);
    notifyListeners();
  }

  Future<void> setAlertRadiusKm(double value) async {
    _alertRadiusKm = value;
    await _store.writeDouble(StoreKeys.alertRadiusKm, value);
    notifyListeners();
  }

  Future<void> setLocationGranted(bool value) async {
    _locationGranted = value;
    await _store.writeBool(StoreKeys.locationGranted, value);
    notifyListeners();
  }

  Future<void> setOfflineMode(bool value) async {
    _offlineMode = value;
    await _store.writeBool(StoreKeys.offlineMode, value);
    notifyListeners();
  }

  Future<void> toggleLayer(MapLayer layer) async {
    if (_layers.contains(layer)) {
      _layers.remove(layer);
    } else {
      _layers.add(layer);
    }
    await _persistLayers();
    notifyListeners();
  }

  /// Backs the "Show verified only" switch, which is the inverse of the
  /// pending-reports layer.
  Future<void> setVerifiedOnly(bool value) async {
    if (value) {
      _layers.remove(MapLayer.pendingReports);
    } else {
      _layers.add(MapLayer.pendingReports);
    }
    await _persistLayers();
    notifyListeners();
  }

  Future<void> _persistLayers() => _store.writeStringList(
    StoreKeys.mapLayers,
    _layers.map((MapLayer l) => l.id).toList(),
  );
}
