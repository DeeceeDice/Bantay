import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:path_provider/path_provider.dart';

/// Copies a freshly picked photo somewhere durable and returns the new path.
///
/// `image_picker` writes into a cache directory the OS may clear at any time,
/// so a report's photo has to be moved out of it or it can vanish before an
/// official ever reviews the report.
Future<String> persistPickedPhoto(String sourcePath) async {
  try {
    final Directory documents = await getApplicationDocumentsDirectory();
    final Directory photos = Directory(
      '${documents.path}${Platform.pathSeparator}hazard_photos',
    );
    if (!photos.existsSync()) {
      photos.createSync(recursive: true);
    }

    final int dot = sourcePath.lastIndexOf('.');
    final String extension = dot > 0 && sourcePath.length - dot <= 5
        ? sourcePath.substring(dot)
        : '.jpg';
    final String destination =
        '${photos.path}${Platform.pathSeparator}'
        '${DateTime.now().millisecondsSinceEpoch}$extension';

    await File(sourcePath).copy(destination);
    return destination;
  } on Object {
    // If the copy fails, the original path is still displayable for now.
    return sourcePath;
  }
}

/// Renders a photo stored on the device filesystem.
Widget buildLocalPhoto(
  String path, {
  BoxFit fit = BoxFit.cover,
  Widget Function(BuildContext context)? onError,
}) {
  return Image.file(
    File(path),
    fit: fit,
    errorBuilder: (BuildContext context, Object error, StackTrace? stack) =>
        onError?.call(context) ?? const SizedBox.shrink(),
  );
}
