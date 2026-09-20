import 'package:flutter/foundation.dart';

import '../core/geo/lat_lng.dart';

/// Which tab of the home shell is showing, plus one-shot navigation requests.
///
/// Alerts and safe spots need to be able to say "open the map on this pin".
/// Routing that through a controller rather than constructor arguments keeps
/// the bottom-nav tabs alive (so the map does not rebuild and lose its camera
/// every time the user switches away and back).
class ShellController extends ChangeNotifier {
  int _tabIndex = 0;
  String? _focusReportId;
  String? _focusSafeSpotId;
  LatLng? _focusPoint;

  int get tabIndex => _tabIndex;
  String? get focusReportId => _focusReportId;
  String? get focusSafeSpotId => _focusSafeSpotId;
  LatLng? get focusPoint => _focusPoint;

  static const int mapTab = 0;
  static const int reportTab = 1;
  static const int alertsTab = 2;
  static const int safeSpotsTab = 3;
  static const int profileTab = 4;

  void goToTab(int index) {
    if (_tabIndex == index) return;
    _tabIndex = index;
    notifyListeners();
  }

  /// Switches to the map and asks it to centre on and select a report.
  void focusReport(String reportId) {
    _focusReportId = reportId;
    _focusSafeSpotId = null;
    _focusPoint = null;
    _tabIndex = mapTab;
    notifyListeners();
  }

  /// Switches to the map and asks it to centre on and select a safe spot.
  void focusSafeSpot(String safeSpotId) {
    _focusSafeSpotId = safeSpotId;
    _focusReportId = null;
    _focusPoint = null;
    _tabIndex = mapTab;
    notifyListeners();
  }

  /// Switches to the map and centres it on an arbitrary point.
  void focusOnPoint(LatLng point) {
    _focusPoint = point;
    _focusReportId = null;
    _focusSafeSpotId = null;
    _tabIndex = mapTab;
    notifyListeners();
  }

  /// Clears a pending request once the map has acted on it, so it does not
  /// re-trigger on the next rebuild.
  void consumeFocus() {
    _focusReportId = null;
    _focusSafeSpotId = null;
    _focusPoint = null;
  }
}
