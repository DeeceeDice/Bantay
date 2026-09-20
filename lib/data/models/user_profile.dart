import '../../core/geo/lat_lng.dart';
import 'enums.dart';

/// The signed-in user.
///
/// [trustScore] is derived from report history rather than stored blindly, so
/// it can never drift out of sync with the reports the user actually filed.
class UserProfile {
  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.avatarPath,
    this.barangay = 'Sampaloc, Manila',
    this.reportsSubmitted = 0,
    this.reportsVerified = 0,
    this.reportsRejected = 0,
    this.verificationsPerformed = 0,
    this.authProvider = 'email',
    this.joinedAt,
    this.areaCenter = const LatLng(14.6096, 120.9925),
    this.areaRadiusMeters = 3000,
  });

  final String id;
  final String name;
  final String email;
  final UserRole role;
  final String? avatarPath;

  /// Assigned area. Officials only see pending reports inside their area.
  final String barangay;

  final int reportsSubmitted;
  final int reportsVerified;
  final int reportsRejected;
  final int verificationsPerformed;

  /// 'email', 'google' or 'facebook'.
  final String authProvider;

  final DateTime? joinedAt;

  /// Centre of an official's assigned area. Pending reports outside
  /// [areaRadiusMeters] of this point are another barangay's to moderate.
  ///
  /// This is a radius stand-in for real barangay boundaries; swapping in an
  /// LGU polygon later only changes [BantayRepository.pendingForOfficial].
  final LatLng areaCenter;
  final double areaRadiusMeters;

  /// Community trust score out of 100.
  ///
  /// Starts at a neutral 50 and moves with the user's verified-to-rejected
  /// ratio, so a new account is neither trusted nor punished.
  int get trustScore {
    if (reportsSubmitted == 0) return 50;
    final int judged = reportsVerified + reportsRejected;
    if (judged == 0) return 50;
    final double ratio = reportsVerified / judged;
    // Volume bonus caps at +15 so a prolific reporter cannot outrank accuracy.
    final int volumeBonus = (reportsVerified * 1.5).clamp(0, 15).round();
    return (35 + ratio * 50 + volumeBonus).clamp(0, 100).round();
  }

  /// One or two letters for the avatar placeholder.
  String get initials {
    final List<String> parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((String p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts.first[0] + parts.last[0]).toUpperCase();
  }

  UserProfile copyWith({
    String? name,
    String? email,
    UserRole? role,
    String? avatarPath,
    String? barangay,
    int? reportsSubmitted,
    int? reportsVerified,
    int? reportsRejected,
    int? verificationsPerformed,
  }) {
    return UserProfile(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role ?? this.role,
      avatarPath: avatarPath ?? this.avatarPath,
      barangay: barangay ?? this.barangay,
      reportsSubmitted: reportsSubmitted ?? this.reportsSubmitted,
      reportsVerified: reportsVerified ?? this.reportsVerified,
      reportsRejected: reportsRejected ?? this.reportsRejected,
      verificationsPerformed:
          verificationsPerformed ?? this.verificationsPerformed,
      authProvider: authProvider,
      joinedAt: joinedAt,
      areaCenter: areaCenter,
      areaRadiusMeters: areaRadiusMeters,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'name': name,
    'email': email,
    'role': role.id,
    'avatarPath': avatarPath,
    'barangay': barangay,
    'reportsSubmitted': reportsSubmitted,
    'reportsVerified': reportsVerified,
    'reportsRejected': reportsRejected,
    'verificationsPerformed': verificationsPerformed,
    'authProvider': authProvider,
    'joinedAt': joinedAt?.toIso8601String(),
    'areaCenter': areaCenter.toJson(),
    'areaRadiusMeters': areaRadiusMeters,
  };

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    id: json['id'] as String,
    name: json['name'] as String? ?? '',
    email: json['email'] as String? ?? '',
    role: UserRole.fromId(json['role'] as String?),
    avatarPath: json['avatarPath'] as String?,
    barangay: json['barangay'] as String? ?? 'Sampaloc, Manila',
    reportsSubmitted: json['reportsSubmitted'] as int? ?? 0,
    reportsVerified: json['reportsVerified'] as int? ?? 0,
    reportsRejected: json['reportsRejected'] as int? ?? 0,
    verificationsPerformed: json['verificationsPerformed'] as int? ?? 0,
    authProvider: json['authProvider'] as String? ?? 'email',
    joinedAt: json['joinedAt'] == null
        ? null
        : DateTime.parse(json['joinedAt'] as String),
    areaCenter: json['areaCenter'] == null
        ? const LatLng(14.6096, 120.9925)
        : LatLng.fromJson(
            Map<String, dynamic>.from(
              json['areaCenter'] as Map<dynamic, dynamic>,
            ),
          ),
    areaRadiusMeters: (json['areaRadiusMeters'] as num?)?.toDouble() ?? 3000,
  );
}
