import 'package:flutter/foundation.dart';

/// Where [BantayMap] fetches its raster tiles.
///
/// Bantay defaults to OpenStreetMap so the app is fully functional the moment
/// it is installed, with no API key to obtain and no billing account to set
/// up. Swapping in a commercial provider (MapTiler, Thunderforest, Stadia,
/// Google) is a one-line change here and requires no code changes anywhere
/// else in the app.
///
/// IMPORTANT before you distribute this app: [openStreetMap] points at the
/// OpenStreetMap Foundation's volunteer-run tile servers, and their usage
/// policy forbids distributing a consumer app that uses them by default
/// without prior permission from the Operations Working Group. This is a
/// licensing rule, not just a capacity one - it applies at any traffic
/// level. The default exists so the app runs the moment you clone it.
///
/// For any real release, point [urlTemplate] at a commercial OSM provider
/// (MapTiler, Stadia Maps, Geoapify, Thunderforest) or self-host. That is a
/// one-line change and nothing else in the app has to move.
/// See https://operations.osmfoundation.org/policies/tiles/
@immutable
class MapTileSource {
  const MapTileSource({
    required this.urlTemplate,
    required this.attribution,
    this.minZoom = 3,
    this.maxZoom = 19,
    this.subdomains = const <String>['a', 'b', 'c'],
    this.headers = const <String, String>{},
  });

  /// Template with `{z}`, `{x}`, `{y}` and optional `{s}` placeholders.
  final String urlTemplate;

  /// Credit line shown in the map corner. Most providers require this.
  final String attribution;

  final int minZoom;
  final int maxZoom;
  final List<String> subdomains;

  /// Extra request headers. Tile providers generally require a descriptive
  /// User-Agent; browsers set their own, so this only applies on mobile.
  final Map<String, String> headers;

  static const MapTileSource openStreetMap = MapTileSource(
    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'Map data (c) OpenStreetMap contributors',
    subdomains: <String>[],
    headers: <String, String>{
      'User-Agent': 'Bantay/1.0 (community hazard mapping; contact via app store listing)',
    },
  );

  String urlFor(int x, int y, int z) {
    String url = urlTemplate
        .replaceAll('{z}', '$z')
        .replaceAll('{x}', '$x')
        .replaceAll('{y}', '$y');
    if (subdomains.isNotEmpty) {
      url = url.replaceAll('{s}', subdomains[(x + y) % subdomains.length]);
    }
    return url;
  }
}
