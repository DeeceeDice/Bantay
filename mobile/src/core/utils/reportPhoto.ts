import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Longest side of a stored report photo, in pixels. */
const MAX_SIDE = 800;

/**
 * A picked photo, made small enough to travel inside the report row.
 *
 * The photo is the evidence an official verifies against - in Bantay Admin or
 * on another phone - so it has to live where every device can read it. The
 * picker's own URI is a path on this device (`file://`, or `blob:` in a
 * browser) and opens nowhere else. Rather than a Storage bucket, which needs a
 * billing account, the photo is downscaled and stored in `reports.photo_uri`
 * as a JPEG data URI: the card-free approach docs/SUPABASE.md describes, and
 * the format Bantay Admin already uses for safe-spot photos. About 100 KB.
 */
export async function compressReportPhoto(uri: string): Promise<string> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const image =
    Math.max(original.width, original.height) > MAX_SIDE
      ? await ImageManipulator.manipulate(original)
          .resize(original.width >= original.height ? { width: MAX_SIDE } : { height: MAX_SIDE })
          .renderAsync()
      : original;

  const saved = await image.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
  if (!saved.base64) throw new Error('Could not read the photo.');
  return `data:image/jpeg;base64,${saved.base64}`;
}
