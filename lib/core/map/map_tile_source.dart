import 'package:flutter/foundation.dart';

/// Where [BantayMap] fetches its raster tiles.
///
/// Bantay defaults to OpenStreetMap so the app is fully functional the moment
/// it is installed, with no API key to obtain and no billing account to set
/// up. Swapping in a commercial provider (MapTiler, Thunderforest, Stadia,
/// Google) is a one-line change here and requires no code changes anywhere
/// else in the app.
///
/// Note for production: the public OSM tile servers are run on donated
/// infrastructure and their usage policy is not suitable for a high-traffic
/// app. Point [urlTemplate] at your own provider before a wide release.
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
