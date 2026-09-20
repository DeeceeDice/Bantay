import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../core/geo/lat_lng.dart';
import '../data/seed/seed_data.dart';

/// How the app obtained the position it is currently showing.
enum LocationSource {
  /// Real GPS fix.
  device,

  /// Permission denied or hardware unavailable; using the Manila fallback.
  fallback,

  /// Not asked yet.
  unknown,
}

/// The user's live location, with a graceful fallback.
///
/// The spec requires that declining location still lets the user in, so this
/// controller never blocks: if permission is refused, the hardware is off, or
/// the fix times out, it reports the Manila fallback centre and flags the
/// source so the UI can explain why the blue dot is where it is.
class LocationController extends ChangeNotifier {
  LocationController();

  LatLng _current = SeedData.fallbackUserLocation;
  LocationSource _source = LocationSource.unknown;
  bool _isLocating = false;
  StreamSubscription<Position>? _watch;

  LatLng get current => _current;
  LocationSource get source => _source;
  bool get isLocating => _isLocating;
  bool get hasRealFix => _source == LocationSource.device;

  /// Asks for permission and takes a first fix.
  ///
  /// Returns true only when a real device fix was obtained.
  Future<bool> requestAndLocate() async {
    _isLocating = true;
    notifyListeners();

    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        return _fallback();
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return _fallback();
      }

      final Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 12),
        ),
      );
      _current = LatLng(position.latitude, position.longitude);
      _source = LocationSource.device;
      _isLocating = false;
      notifyListeners();
      return true;
    } on Object {
      // Any failure at all - timeout, missing plugin on an unsupported
      // platform, revoked permission mid-call - degrades to the fallback
      // rather than trapping the user on an error screen.
      return _fallback();
    }
  }

  /// Refreshes the fix if permission was already granted. Never prompts.
  Future<void> refresh() async {
    if (_source != LocationSource.device) return;
    try {
      final Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      _current = LatLng(position.latitude, position.longitude);
      notifyListeners();
    } on Object {
      // Keep the last good fix.
    }
  }

  /// Starts a live position stream so the blue dot tracks the user.
  Future<void> startTracking() async {
    if (_watch != null || _source != LocationSource.device) return;
    try {
      _watch =
          Geolocator.getPositionStream(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.high,
              distanceFilter: 15,
            ),
          ).listen(
            (Position position) {
              _current = LatLng(position.latitude, position.longitude);
              notifyListeners();
            },
            onError: (Object _) {
              // A dropped stream is not worth surfacing; the last fix stands.
            },
          );
    } on Object {
      _watch = null;
    }
  }

  /// Used by the "Not now" path, and whenever a fix cannot be obtained.
  void useFallback() {
    _fallback();
  }

  bool _fallback() {
    _current = SeedData.fallbackUserLocation;
    _source = LocationSource.fallback;
    _isLocating = false;
    notifyListeners();
    return false;
  }

  @override
  void dispose() {
    _watch?.cancel();
    super.dispose();
  }
}
