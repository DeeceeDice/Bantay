import '../../core/geo/lat_lng.dart';
import '../models/alert_item.dart';
import '../models/enums.dart';
import '../models/hazard_report.dart';
import '../models/safe_spot.dart';
import '../models/saved_route.dart';

/// Initial content so a freshly installed app opens onto a live, believable
/// map instead of an empty screen.
///
/// The data is centred on Sampaloc, Manila — the España Blvd corridor named in
/// the product walkthrough — and is written once on first launch. After that
/// the user's own reports and edits own the data.
class SeedData {
  const SeedData._();

  /// Default map centre: España Blvd at Lacson Ave, Sampaloc, Manila.
  static const LatLng defaultCenter = LatLng(14.6096, 120.9925);

  /// Fallback "current location" used when GPS is unavailable or declined.
  static const LatLng fallbackUserLocation = LatLng(14.6078, 120.9901);

  static List<HazardReport> reports(DateTime now) => <HazardReport>[
    HazardReport(
      id: 'seed-hz-1',
      type: HazardType.floodedRoad,
      severity: HazardSeverity.notPassable,
      status: ReportStatus.verified,
      location: const LatLng(14.6096, 120.9925),
      addressLabel: 'España Blvd cor. Lacson Ave, Sampaloc',
      reportedAt: now.subtract(const Duration(minutes: 24)),
      reporterId: 'seed-user-maria',
      reporterName: 'Maria S.',
      description: 'Knee-deep near the underpass. Jeepneys are turning around.',
      photoPath: 'seed:flooded_road',
      confirmCount: 18,
      denyCount: 1,
      verifiedBy: 'Brgy. 395 - Kgd. R. Dela Cruz',
      verifiedAt: now.subtract(const Duration(minutes: 11)),
    ),
    HazardReport(
      id: 'seed-hz-2',
      type: HazardType.floodedRoad,
      severity: HazardSeverity.passableWithCaution,
      status: ReportStatus.verified,
      location: const LatLng(14.6138, 120.9895),
      addressLabel: 'Dapitan St near Bustillos, Sampaloc',
      reportedAt: now.subtract(const Duration(minutes: 52)),
      reporterId: 'seed-user-john',
      reporterName: 'John P.',
      description: 'Ankle-deep. Cars still passing slowly.',
      photoPath: 'seed:flooded_road',
      confirmCount: 7,
      denyCount: 2,
      verifiedBy: 'Brgy. 401 - Official',
      verifiedAt: now.subtract(const Duration(minutes: 40)),
    ),
    HazardReport(
      id: 'seed-hz-3',
      type: HazardType.fallenTree,
      severity: HazardSeverity.notPassable,
      status: ReportStatus.verified,
      location: const LatLng(14.6150, 120.9910),
      addressLabel: 'Lacson Ave near Vicente Cruz, Sampaloc',
      reportedAt: now.subtract(const Duration(hours: 2, minutes: 5)),
      reporterId: 'seed-user-ana',
      reporterName: 'Ana R.',
      description: 'Big acacia branch blocking the outer lane.',
      photoPath: 'seed:fallen_tree',
      confirmCount: 12,
      verifiedBy: 'Brgy. 468 - Official',
      verifiedAt: now.subtract(const Duration(hours: 1, minutes: 48)),
    ),
    HazardReport(
      id: 'seed-hz-4',
      type: HazardType.powerLineDown,
      severity: HazardSeverity.lifeThreatening,
      status: ReportStatus.verified,
      location: const LatLng(14.6042, 120.9866),
      addressLabel: 'Nicanor Reyes St (Morayta), Sampaloc',
      reportedAt: now.subtract(const Duration(minutes: 37)),
      reporterId: 'seed-user-carlo',
      reporterName: 'Carlo D.',
      description: 'Live wire down on the sidewalk. Meralco notified.',
      photoPath: 'seed:power_line_down',
      confirmCount: 23,
      verifiedBy: 'Brgy. 397 - Official',
      verifiedAt: now.subtract(const Duration(minutes: 29)),
    ),
    HazardReport(
      id: 'seed-hz-5',
      type: HazardType.impassableBridge,
      severity: HazardSeverity.notPassable,
      status: ReportStatus.verified,
      location: const LatLng(14.5960, 121.0010),
      addressLabel: 'Nagtahan Bridge, Manila',
      reportedAt: now.subtract(const Duration(hours: 3, minutes: 20)),
      reporterId: 'seed-user-liza',
      reporterName: 'Liza M.',
      description: 'Closed by MMDA while the river is at critical level.',
      photoPath: 'seed:impassable_bridge',
      confirmCount: 31,
      denyCount: 1,
      verifiedBy: 'MMDA Liaison',
      verifiedAt: now.subtract(const Duration(hours: 3)),
    ),
    HazardReport(
      id: 'seed-hz-6',
      type: HazardType.floodedRoad,
      severity: HazardSeverity.passableWithCaution,
      status: ReportStatus.pending,
      location: const LatLng(14.6005, 120.9905),
      addressLabel: 'Legarda St near Mendiola, Manila',
      reportedAt: now.subtract(const Duration(minutes: 8)),
      reporterId: 'seed-user-ramon',
      reporterName: 'Ramon T.',
      description: 'Starting to rise at the corner.',
      photoPath: 'seed:flooded_road',
      confirmCount: 2,
    ),
    HazardReport(
      id: 'seed-hz-7',
      type: HazardType.landslide,
      severity: HazardSeverity.lifeThreatening,
      status: ReportStatus.pending,
      location: const LatLng(14.6250, 120.9830),
      addressLabel: 'Blumentritt Rd embankment, Sta. Cruz',
      reportedAt: now.subtract(const Duration(minutes: 15)),
      reporterId: 'seed-user-grace',
      reporterName: 'Grace V.',
      description: 'Soil collapsed onto the service road after the rain.',
      photoPath: 'seed:landslide',
      confirmCount: 4,
    ),
    HazardReport(
      id: 'seed-hz-8',
      type: HazardType.fallenTree,
      severity: HazardSeverity.passableWithCaution,
      status: ReportStatus.pending,
      location: const LatLng(14.6120, 120.9860),
      addressLabel: 'Vicente Cruz St, Sampaloc',
      reportedAt: now.subtract(const Duration(minutes: 42)),
      reporterId: 'seed-user-nina',
      reporterName: 'Nina F.',
      description: 'Debris on one lane, still passable.',
      photoPath: 'seed:fallen_tree',
      confirmCount: 1,
      denyCount: 1,
    ),
  ];

  static List<SafeSpot> safeSpots(DateTime now) => <SafeSpot>[
    SafeSpot(
      id: 'seed-ss-1',
      name: 'SM City Manila',
      category: SafeSpotCategory.mall,
      location: const LatLng(14.5896, 120.9817),
      addressLabel: 'Natividad Lopez St, Ermita, Manila',
      description:
          'Air-conditioned mall opposite Manila City Hall. Ground floor '
          'atrium is opened to the public during storm signals.',
      openingHours: 'Mon-Sun, 10:00 AM - 9:00 PM',
      capacity: 800,
      imageKey: 'mall',
      contactNumber: '(02) 8528 5088',
      lastUpdated: now.subtract(const Duration(minutes: 20)),
    ),
    SafeSpot(
      id: 'seed-ss-2',
      name: 'Robinsons Place Manila',
      category: SafeSpotCategory.mall,
      location: const LatLng(14.5776, 120.9847),
      addressLabel: 'Pedro Gil cor. Adriatico St, Ermita, Manila',
      description:
          'Large covered mall with elevated parking levels used as '
          'temporary shelter during flooding.',
      openingHours: 'Mon-Sun, 10:00 AM - 9:00 PM',
      capacity: 1200,
      imageKey: 'mall',
      contactNumber: '(02) 8536 7809',
      lastUpdated: now.subtract(const Duration(hours: 1)),
    ),
    SafeSpot(
      id: 'seed-ss-3',
      name: 'University of Santo Tomas',
      category: SafeSpotCategory.school,
      location: const LatLng(14.6091, 120.9892),
      addressLabel: 'España Blvd, Sampaloc, Manila',
      description:
          'Campus gymnasium is activated as an evacuation area by the '
          'Manila DRRMO during typhoon signals 2 and above.',
      openingHours: 'Activated during storm signals',
      capacity: 1500,
      imageKey: 'school',
      contactNumber: '(02) 8406 1611',
      lastUpdated: now.subtract(const Duration(minutes: 35)),
    ),
    SafeSpot(
      id: 'seed-ss-4',
      name: 'Far Eastern University',
      category: SafeSpotCategory.school,
      location: const LatLng(14.6042, 120.9880),
      addressLabel: 'Nicanor Reyes St, Sampaloc, Manila',
      description: 'Covered quadrangle and auditorium on elevated ground.',
      openingHours: 'Activated during storm signals',
      capacity: 900,
      imageKey: 'school',
      lastUpdated: now.subtract(const Duration(hours: 2)),
    ),
    SafeSpot(
      id: 'seed-ss-5',
      name: 'Sampaloc Evacuation Center',
      category: SafeSpotCategory.evacuationCenter,
      location: const LatLng(14.6130, 120.9950),
      addressLabel: 'Bgy. 395 Hall, Sampaloc, Manila',
      description:
          'Barangay-run evacuation centre with cots, potable water and a '
          'generator. Pets are allowed in the covered court.',
      openingHours: 'Open 24 hours',
      capacity: 250,
      imageKey: 'evacuation',
      contactNumber: '0917 555 0143',
      lastUpdated: now.subtract(const Duration(minutes: 12)),
    ),
    SafeSpot(
      id: 'seed-ss-6',
      name: 'Manila City Hall Covered Court',
      category: SafeSpotCategory.evacuationCenter,
      location: const LatLng(14.5915, 120.9812),
      addressLabel: 'Padre Burgos Ave, Ermita, Manila',
      description: 'City-run shelter with medical station on standby.',
      openingHours: 'Open 24 hours',
      capacity: 600,
      imageKey: 'evacuation',
      isOpenNow: true,
      lastUpdated: now.subtract(const Duration(minutes: 55)),
    ),
    SafeSpot(
      id: 'seed-ss-7',
      name: 'Legarda LRT-2 Station',
      category: SafeSpotCategory.terminal,
      location: const LatLng(14.6005, 120.9950),
      addressLabel: 'Legarda St, Sampaloc, Manila',
      description:
          'Elevated covered concourse. Safe waiting area when the street '
          'below is flooded.',
      openingHours: 'Mon-Sun, 5:00 AM - 9:30 PM',
      imageKey: 'terminal',
      lastUpdated: now.subtract(const Duration(minutes: 8)),
    ),
    SafeSpot(
      id: 'seed-ss-8',
      name: 'Blumentritt Covered Terminal',
      category: SafeSpotCategory.terminal,
      location: const LatLng(14.6248, 120.9836),
      addressLabel: 'Blumentritt Rd, Sta. Cruz, Manila',
      description: 'Covered jeepney terminal with a raised waiting bay.',
      openingHours: 'Mon-Sun, 4:00 AM - 11:00 PM',
      imageKey: 'terminal',
      isOpenNow: false,
      lastUpdated: now.subtract(const Duration(minutes: 3)),
    ),
  ];

  /// A starter commute so Saved Routes is not empty on first run.
  static List<SavedRoute> routes(DateTime now) => <SavedRoute>[
    SavedRoute(
      id: 'seed-rt-1',
      label: 'Home to School',
      startLabel: 'Dapitan St, Sampaloc',
      endLabel: 'University of Santo Tomas',
      start: const LatLng(14.6138, 120.9895),
      end: const LatLng(14.6091, 120.9892),
      waypoints: const <LatLng>[
        LatLng(14.6121, 120.9893),
        LatLng(14.6104, 120.9890),
      ],
      createdAt: now.subtract(const Duration(days: 12)),
    ),
  ];

  static List<AlertItem> alerts(DateTime now) => <AlertItem>[
    AlertItem(
      id: 'seed-al-1',
      kind: AlertKind.typhoonWarning,
      title: 'Typhoon Signal No. 2 raised over Metro Manila',
      body:
          'PAGASA raised Signal No. 2. Expect heavy rain through the '
          'evening. Avoid low-lying roads and riverbanks.',
      createdAt: now.subtract(const Duration(minutes: 18)),
    ),
    AlertItem(
      id: 'seed-al-2',
      kind: AlertKind.verifiedHazard,
      title: 'Verified: Flooding on España Blvd',
      body:
          'Not passable at España Blvd cor. Lacson Ave. Confirmed by 18 '
          'commuters and verified by Brgy. 395.',
      createdAt: now.subtract(const Duration(minutes: 11)),
      reportId: 'seed-hz-1',
      onSavedRoute: true,
    ),
    AlertItem(
      id: 'seed-al-3',
      kind: AlertKind.verifiedHazard,
      title: 'Verified: Power line down on Morayta',
      body:
          'Life-threatening hazard reported on Nicanor Reyes St. Keep '
          'clear of the sidewalk until Meralco clears it.',
      createdAt: now.subtract(const Duration(minutes: 29)),
      reportId: 'seed-hz-4',
    ),
    AlertItem(
      id: 'seed-al-4',
      kind: AlertKind.safeSpotUpdate,
      title: 'Blumentritt Covered Terminal is now closed',
      body:
          'The terminal suspended operations for the night. Nearest open '
          'shelter is Sampaloc Evacuation Center.',
      createdAt: now.subtract(const Duration(minutes: 3)),
      safeSpotId: 'seed-ss-8',
    ),
  ];
}
