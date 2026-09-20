import '../../core/geo/lat_lng.dart';
import 'enums.dart';

/// A verified place people can shelter in: mall, school, evacuation centre or
/// covered terminal.
class SafeSpot {
  const SafeSpot({
    required this.id,
    required this.name,
    required this.category,
    required this.location,
    required this.addressLabel,
    this.description = '',
    this.openingHours = 'Open 24 hours',
    this.isOpenNow = true,
    this.capacity,
    this.imageKey,
    this.contactNumber,
    this.lastUpdated,
  });

  final String id;
  final String name;
  final SafeSpotCategory category;
  final LatLng location;
  final String addressLabel;
  final String description;
  final String openingHours;
  final bool isOpenNow;

  /// Shelter capacity, where the barangay publishes one.
  final int? capacity;

  /// Key into the bundled illustration set; safe spots have no user photos.
  final String? imageKey;

  final String? contactNumber;
  final DateTime? lastUpdated;

  SafeSpot copyWith({bool? isOpenNow, DateTime? lastUpdated}) => SafeSpot(
    id: id,
    name: name,
    category: category,
    location: location,
    addressLabel: addressLabel,
    description: description,
    openingHours: openingHours,
    isOpenNow: isOpenNow ?? this.isOpenNow,
    capacity: capacity,
    imageKey: imageKey,
    contactNumber: contactNumber,
    lastUpdated: lastUpdated ?? this.lastUpdated,
  );

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'name': name,
    'category': category.id,
    'location': location.toJson(),
    'addressLabel': addressLabel,
    'description': description,
    'openingHours': openingHours,
    'isOpenNow': isOpenNow,
    'capacity': capacity,
    'imageKey': imageKey,
    'contactNumber': contactNumber,
    'lastUpdated': lastUpdated?.toIso8601String(),
  };

  factory SafeSpot.fromJson(Map<String, dynamic> json) => SafeSpot(
    id: json['id'] as String,
    name: json['name'] as String? ?? '',
    category: SafeSpotCategory.fromId(json['category'] as String?),
    location: LatLng.fromJson(
      Map<String, dynamic>.from(json['location'] as Map<dynamic, dynamic>),
    ),
    addressLabel: json['addressLabel'] as String? ?? '',
    description: json['description'] as String? ?? '',
    openingHours: json['openingHours'] as String? ?? 'Open 24 hours',
    isOpenNow: json['isOpenNow'] as bool? ?? true,
    capacity: json['capacity'] as int?,
    imageKey: json['imageKey'] as String?,
    contactNumber: json['contactNumber'] as String?,
    lastUpdated: json['lastUpdated'] == null
        ? null
        : DateTime.parse(json['lastUpdated'] as String),
  );
}
