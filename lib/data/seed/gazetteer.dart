import '../../core/geo/lat_lng.dart';

/// A named place the search bar can resolve.
class Place {
  const Place({required this.name, required this.area, required this.location});

  final String name;
  final String area;
  final LatLng location;

  String get fullLabel => '$name, $area';
}

/// A small built-in gazetteer of Manila landmarks.
///
/// Search resolves against this list plus the user's own safe spots, saved
/// routes and reported hazards, which means the search bar keeps working with
/// no connection at all. A production deployment would layer a geocoding API
/// on top for addresses outside this set, but the offline path has to exist
/// first: this app is most needed exactly when the network is worst.
class Gazetteer {
  const Gazetteer._();

  static const List<Place> places = <Place>[
    Place(
      name: 'España Boulevard',
      area: 'Sampaloc, Manila',
      location: LatLng(14.6096, 120.9925),
    ),
    Place(
      name: 'University of Santo Tomas',
      area: 'Sampaloc, Manila',
      location: LatLng(14.6091, 120.9892),
    ),
    Place(
      name: 'Dapitan Street',
      area: 'Sampaloc, Manila',
      location: LatLng(14.6138, 120.9895),
    ),
    Place(
      name: 'Lacson Avenue',
      area: 'Sampaloc, Manila',
      location: LatLng(14.6150, 120.9910),
    ),
    Place(
      name: 'Morayta (Nicanor Reyes St)',
      area: 'Sampaloc, Manila',
      location: LatLng(14.6042, 120.9866),
    ),
    Place(
      name: 'Far Eastern University',
      area: 'Sampaloc, Manila',
      location: LatLng(14.6042, 120.9880),
    ),
    Place(
      name: 'Vicente Cruz Street',
      area: 'Sampaloc, Manila',
      location: LatLng(14.6120, 120.9860),
    ),
    Place(
      name: 'Bustillos',
      area: 'Sampaloc, Manila',
      location: LatLng(14.6070, 120.9930),
    ),
    Place(
      name: 'Legarda Street',
      area: 'Sampaloc, Manila',
      location: LatLng(14.6005, 120.9905),
    ),
    Place(
      name: 'Mendiola',
      area: 'San Miguel, Manila',
      location: LatLng(14.5992, 120.9905),
    ),
    Place(
      name: 'Nagtahan Bridge',
      area: 'Santa Mesa, Manila',
      location: LatLng(14.5960, 121.0010),
    ),
    Place(
      name: 'Quiapo Church',
      area: 'Quiapo, Manila',
      location: LatLng(14.5985, 120.9836),
    ),
    Place(
      name: 'Quezon Boulevard',
      area: 'Quiapo, Manila',
      location: LatLng(14.6010, 120.9840),
    ),
    Place(
      name: 'Blumentritt',
      area: 'Santa Cruz, Manila',
      location: LatLng(14.6248, 120.9836),
    ),
    Place(
      name: 'Divisoria',
      area: 'Tondo, Manila',
      location: LatLng(14.6020, 120.9720),
    ),
    Place(name: 'Binondo', area: 'Manila', location: LatLng(14.6000, 120.9750)),
    Place(
      name: 'Manila City Hall',
      area: 'Ermita, Manila',
      location: LatLng(14.5915, 120.9812),
    ),
    Place(
      name: 'SM City Manila',
      area: 'Ermita, Manila',
      location: LatLng(14.5896, 120.9817),
    ),
    Place(
      name: 'Robinsons Place Manila',
      area: 'Ermita, Manila',
      location: LatLng(14.5776, 120.9847),
    ),
    Place(
      name: 'Rizal Park',
      area: 'Ermita, Manila',
      location: LatLng(14.5826, 120.9787),
    ),
    Place(
      name: 'Pedro Gil Street',
      area: 'Ermita, Manila',
      location: LatLng(14.5790, 120.9860),
    ),
    Place(
      name: 'Taft Avenue',
      area: 'Malate, Manila',
      location: LatLng(14.5720, 120.9930),
    ),
    Place(
      name: 'Pandacan',
      area: 'Manila',
      location: LatLng(14.5920, 121.0060),
    ),
    Place(
      name: 'Santa Mesa',
      area: 'Manila',
      location: LatLng(14.6010, 121.0130),
    ),
    Place(
      name: 'Tayuman Street',
      area: 'Tondo, Manila',
      location: LatLng(14.6190, 120.9780),
    ),
  ];

  /// Case- and accent-tolerant prefix/substring search.
  static List<Place> search(String query, {int limit = 6}) {
    final String q = _normalize(query);
    if (q.isEmpty) return const <Place>[];

    final List<Place> starts = <Place>[];
    final List<Place> contains = <Place>[];

    for (final Place place in places) {
      final String name = _normalize(place.name);
      final String area = _normalize(place.area);
      if (name.startsWith(q)) {
        starts.add(place);
      } else if (name.contains(q) || area.contains(q)) {
        contains.add(place);
      }
    }
    // Prefix matches first: typing "esp" should surface España before a
    // street that merely mentions it further along.
    return <Place>[...starts, ...contains].take(limit).toList();
  }

  /// Lowercases and strips the accents Philippine place names carry, so
  /// "espana" finds "España".
  static String _normalize(String input) {
    const Map<String, String> folds = <String, String>{
      'á': 'a',
      'à': 'a',
      'ä': 'a',
      'â': 'a',
      'é': 'e',
      'è': 'e',
      'ë': 'e',
      'ê': 'e',
      'í': 'i',
      'ì': 'i',
      'ï': 'i',
      'î': 'i',
      'ó': 'o',
      'ò': 'o',
      'ö': 'o',
      'ô': 'o',
      'ú': 'u',
      'ù': 'u',
      'ü': 'u',
      'û': 'u',
      'ñ': 'n',
    };
    final StringBuffer out = StringBuffer();
    for (final String char in input.toLowerCase().split('')) {
      out.write(folds[char] ?? char);
    }
    return out.toString().trim();
  }
}
