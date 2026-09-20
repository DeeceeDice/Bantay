/// Platform-specific photo handling.
///
/// Mobile copies the picked file into the app's documents directory so the
/// photo survives the OS clearing its image-picker cache, and renders it with
/// `Image.file`. Web has no filesystem, so it keeps the object URL that
/// `image_picker` hands back and renders it with `Image.network`.
///
/// The conditional export keeps `dart:io` out of the web build entirely,
/// which is what lets one codebase target both.
library;

export 'photo_support_web.dart' if (dart.library.io) 'photo_support_io.dart';
