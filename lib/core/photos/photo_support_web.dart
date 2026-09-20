import 'package:flutter/widgets.dart';

/// On web there is no filesystem to copy into; the object URL that
/// `image_picker` returns is already the durable handle for this session.
Future<String> persistPickedPhoto(String sourcePath) async => sourcePath;

/// Renders a photo from a blob or network URL.
Widget buildLocalPhoto(
  String path, {
  BoxFit fit = BoxFit.cover,
  Widget Function(BuildContext context)? onError,
}) {
  return Image.network(
    path,
    fit: fit,
    errorBuilder: (BuildContext context, Object error, StackTrace? stack) =>
        onError?.call(context) ?? const SizedBox.shrink(),
  );
}
