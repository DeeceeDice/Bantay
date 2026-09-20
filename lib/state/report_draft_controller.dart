import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

import '../core/geo/lat_lng.dart';
import '../core/photos/photo_support.dart';
import '../data/models/enums.dart';
import '../data/seed/gazetteer.dart';

/// Working state for the four-step "Report a Hazard" flow.
///
/// Held in one controller rather than threaded through four screens so the
/// user can move backwards and forwards without losing what they entered,
/// and so the Submit button can check completeness in one place.
class ReportDraftController extends ChangeNotifier {
  ReportDraftController({required LatLng initialLocation})
    : _location = initialLocation {
    _addressLabel = _describe(initialLocation);
  }

  LatLng _location;
  String _addressLabel = '';
  HazardType? _type;
  HazardSeverity? _severity;
  String? _photoPath;
  String _description = '';
  int _step = 0;

  static const int stepCount = 4;
  static const int maxDescriptionLength = 140;

  LatLng get location => _location;
  String get addressLabel => _addressLabel;
  HazardType? get type => _type;
  HazardSeverity? get severity => _severity;
  String? get photoPath => _photoPath;
  String get description => _description;
  int get step => _step;

  bool get isFirstStep => _step == 0;
  bool get isLastStep => _step == stepCount - 1;

  /// Whether the current step has everything it needs to advance.
  bool get canAdvance => switch (_step) {
    0 => true,
    1 => _type != null,
    2 => _severity != null,
    // The spec makes a photo mandatory: it is what lets an official
    // verify a report without visiting the location.
    3 => _photoPath != null,
    _ => false,
  };

  void setLocation(LatLng location) {
    _location = location;
    _addressLabel = _describe(location);
    notifyListeners();
  }

  void setType(HazardType type) {
    _type = type;
    notifyListeners();
  }

  void setSeverity(HazardSeverity severity) {
    _severity = severity;
    notifyListeners();
  }

  void setDescription(String value) {
    _description = value.length > maxDescriptionLength
        ? value.substring(0, maxDescriptionLength)
        : value;
    notifyListeners();
  }

  void clearPhoto() {
    _photoPath = null;
    notifyListeners();
  }

  void nextStep() {
    if (_step < stepCount - 1 && canAdvance) {
      _step++;
      notifyListeners();
    }
  }

  void previousStep() {
    if (_step > 0) {
      _step--;
      notifyListeners();
    }
  }

  void goToStep(int step) {
    if (step < 0 || step >= stepCount || step > _step) return;
    _step = step;
    notifyListeners();
  }

  /// Captures or picks a photo and copies it somewhere durable.
  ///
  /// Returns an error message, or null on success. A cancelled picker is not
  /// an error and returns null without changing the draft.
  Future<String?> attachPhoto(ImageSource source) async {
    try {
      final XFile? picked = await ImagePicker().pickImage(
        source: source,
        // Downscaling here keeps report payloads small enough to upload over
        // a congested network during a storm, which is exactly when the app
        // is used most.
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 82,
      );
      if (picked == null) return null;

      _photoPath = await persistPickedPhoto(picked.path);
      notifyListeners();
      return null;
    } on Object catch (error) {
      return 'Could not attach that photo. $error';
    }
  }

  /// Best-effort reverse geocode against the built-in gazetteer.
  ///
  /// Keeps the address label working offline; a production build can layer a
  /// geocoding API over this and fall back to it when the network is down.
  static String _describe(LatLng point) {
    Place? nearest;
    double best = double.infinity;

    for (final Place place in Gazetteer.places) {
      final double distance = Geo.distanceMeters(point, place.location);
      if (distance < best) {
        best = distance;
        nearest = place;
      }
    }

    if (nearest == null) {
      return '${point.latitude.toStringAsFixed(4)}, '
          '${point.longitude.toStringAsFixed(4)}';
    }
    if (best < 140) return nearest.fullLabel;
    return 'Near ${nearest.name}, ${nearest.area}';
  }
}
