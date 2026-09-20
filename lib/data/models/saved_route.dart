import '../../core/geo/lat_lng.dart';

/// A commute the user travels often, e.g. Home to School.
///
/// The route stores its own polyline so the list can draw a mini preview and
/// so hazard matching measures distance to the *path*, not just the endpoints.
class SavedRoute {
  const SavedRoute({
    required this.id,
    required this.label,
    required this.startLabel,
    required this.endLabel,
    required this.start,
    required this.end,
    this.waypoints = const <LatLng>[],
    this.createdAt,
  });

  final String id;
  final String label;
  final String startLabel;
  final String endLabel;
  final LatLng start;
  final LatLng end;

  /// Intermediate points between [start] and [end].
  final List<LatLng> waypoints;

  final DateTime? createdAt;

  /// Full polyline including both endpoints.
  List<LatLng> get path => <LatLng>[start, ...waypoints, end];

  SavedRoute copyWith({String? label}) => SavedRoute(
    id: id,
    label: label ?? this.label,
    startLabel: startLabel,
    endLabel: endLabel,
    start: start,
    end: end,
    waypoints: waypoints,
    createdAt: createdAt,
  );

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'label': label,
    'startLabel': startLabel,
    'endLabel': endLabel,
    'start': start.toJson(),
    'end': end.toJson(),
    'waypoints': waypoints.map((LatLng w) => w.toJson()).toList(),
    'createdAt': createdAt?.toIso8601String(),
  };

  factory SavedRoute.fromJson(Map<String, dynamic> json) => SavedRoute(
    id: json['id'] as String,
    label: json['label'] as String? ?? '',
    startLabel: json['startLabel'] as String? ?? '',
    endLabel: json['endLabel'] as String? ?? '',
    start: LatLng.fromJson(
      Map<String, dynamic>.from(json['start'] as Map<dynamic, dynamic>),
    ),
    end: LatLng.fromJson(
      Map<String, dynamic>.from(json['end'] as Map<dynamic, dynamic>),
    ),
    waypoints: (json['waypoints'] as List<dynamic>? ?? <dynamic>[])
        .map(
          (dynamic e) => LatLng.fromJson(
            Map<String, dynamic>.from(e as Map<dynamic, dynamic>),
          ),
        )
        .toList(),
    createdAt: json['createdAt'] == null
        ? null
        : DateTime.parse(json['createdAt'] as String),
  );
}
