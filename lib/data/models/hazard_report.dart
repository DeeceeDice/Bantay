import '../../core/geo/lat_lng.dart';
import 'enums.dart';

/// A hazard reported by the community.
///
/// A report is the single source of truth that the map, the alerts feed, the
/// verification panel, saved-route status and profile stats all read from, so
/// a change here propagates everywhere the spec requires.
class HazardReport {
  const HazardReport({
    required this.id,
    required this.type,
    required this.severity,
    required this.status,
    required this.location,
    required this.addressLabel,
    required this.reportedAt,
    required this.reporterId,
    required this.reporterName,
    this.description = '',
    this.photoPath,
    this.confirmCount = 0,
    this.denyCount = 0,
    this.flagCount = 0,
    this.verifiedBy,
    this.verifiedAt,
    this.votedUserIds = const <String>[],
    this.flaggedUserIds = const <String>[],
  });

  final String id;
  final HazardType type;
  final HazardSeverity severity;
  final ReportStatus status;
  final LatLng location;

  /// Reverse-geocoded street label shown on pins and cards.
  final String addressLabel;

  final DateTime reportedAt;
  final String reporterId;
  final String reporterName;
  final String description;

  /// Local file path (device) or asset/seed key for the hazard photo.
  final String? photoPath;

  final int confirmCount;
  final int denyCount;
  final int flagCount;

  final String? verifiedBy;
  final DateTime? verifiedAt;

  /// Users who already voted, so the UI can stop double counting.
  final List<String> votedUserIds;
  final List<String> flaggedUserIds;

  bool get isVerified => status == ReportStatus.verified;
  bool get isPending => status == ReportStatus.pending;

  /// Net community signal, used to sort and to decide if a hazard is stale.
  int get netConfirmations => confirmCount - denyCount;

  bool hasVoted(String userId) => votedUserIds.contains(userId);
  bool hasFlagged(String userId) => flaggedUserIds.contains(userId);

  HazardReport copyWith({
    HazardType? type,
    HazardSeverity? severity,
    ReportStatus? status,
    LatLng? location,
    String? addressLabel,
    String? description,
    String? photoPath,
    int? confirmCount,
    int? denyCount,
    int? flagCount,
    String? verifiedBy,
    DateTime? verifiedAt,
    List<String>? votedUserIds,
    List<String>? flaggedUserIds,
  }) {
    return HazardReport(
      id: id,
      type: type ?? this.type,
      severity: severity ?? this.severity,
      status: status ?? this.status,
      location: location ?? this.location,
      addressLabel: addressLabel ?? this.addressLabel,
      reportedAt: reportedAt,
      reporterId: reporterId,
      reporterName: reporterName,
      description: description ?? this.description,
      photoPath: photoPath ?? this.photoPath,
      confirmCount: confirmCount ?? this.confirmCount,
      denyCount: denyCount ?? this.denyCount,
      flagCount: flagCount ?? this.flagCount,
      verifiedBy: verifiedBy ?? this.verifiedBy,
      verifiedAt: verifiedAt ?? this.verifiedAt,
      votedUserIds: votedUserIds ?? this.votedUserIds,
      flaggedUserIds: flaggedUserIds ?? this.flaggedUserIds,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'type': type.id,
    'severity': severity.id,
    'status': status.id,
    'location': location.toJson(),
    'addressLabel': addressLabel,
    'reportedAt': reportedAt.toIso8601String(),
    'reporterId': reporterId,
    'reporterName': reporterName,
    'description': description,
    'photoPath': photoPath,
    'confirmCount': confirmCount,
    'denyCount': denyCount,
    'flagCount': flagCount,
    'verifiedBy': verifiedBy,
    'verifiedAt': verifiedAt?.toIso8601String(),
    'votedUserIds': votedUserIds,
    'flaggedUserIds': flaggedUserIds,
  };

  factory HazardReport.fromJson(Map<String, dynamic> json) => HazardReport(
    id: json['id'] as String,
    type: HazardType.fromId(json['type'] as String?),
    severity: HazardSeverity.fromId(json['severity'] as String?),
    status: ReportStatus.fromId(json['status'] as String?),
    location: LatLng.fromJson(
      Map<String, dynamic>.from(json['location'] as Map<dynamic, dynamic>),
    ),
    addressLabel: json['addressLabel'] as String? ?? '',
    reportedAt: DateTime.parse(json['reportedAt'] as String),
    reporterId: json['reporterId'] as String? ?? '',
    reporterName: json['reporterName'] as String? ?? '',
    description: json['description'] as String? ?? '',
    photoPath: json['photoPath'] as String?,
    confirmCount: json['confirmCount'] as int? ?? 0,
    denyCount: json['denyCount'] as int? ?? 0,
    flagCount: json['flagCount'] as int? ?? 0,
    verifiedBy: json['verifiedBy'] as String?,
    verifiedAt: json['verifiedAt'] == null
        ? null
        : DateTime.parse(json['verifiedAt'] as String),
    votedUserIds: (json['votedUserIds'] as List<dynamic>? ?? <dynamic>[])
        .map((dynamic e) => e as String)
        .toList(),
    flaggedUserIds: (json['flaggedUserIds'] as List<dynamic>? ?? <dynamic>[])
        .map((dynamic e) => e as String)
        .toList(),
  );
}
