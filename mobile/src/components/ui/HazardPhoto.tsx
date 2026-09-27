import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { HazardType } from '../../data/models/enums';
import { Colors, Radius } from '../../core/theme/colors';
import { hazardIcon } from '../../core/utils/hazardVisuals';

const SEED_PREFIX = 'seed:';

/**
 * Displays a hazard's photo.
 *
 * Handles three cases: a real photo the user captured, one of the bundled
 * sample scenes (`seed:` prefix), and no photo at all. Sample scenes are
 * drawn rather than shipped as fake JPEGs, so the app never passes off an
 * illustration as a real photograph of a real place.
 *
 * A photo that will not load - an older report whose photo is a path on the
 * reporter's own phone - falls back to the illustration instead of an empty
 * box.
 */
export function HazardPhoto({
  uri,
  type,
  height,
  radius = Radius.md,
}: {
  uri: string | null;
  type: HazardType;
  height?: number;
  radius?: number;
}): React.ReactElement {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const failed = uri !== null && uri === failedUri;
  const isSample = !uri || uri.startsWith(SEED_PREFIX) || failed;

  if (isSample) {
    return (
      <View
        style={[
          styles.sample,
          { height, borderRadius: radius, width: height ? undefined : '100%' },
        ]}
      >
        <MaterialIcons name={hazardIcon(type)} size={36} color={Colors.brandBlue} />
        <Text style={styles.sampleLabel}>
          {failed ? 'Photo unavailable' : uri ? 'Sample photo' : 'No photo'}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.photo, { height, borderRadius: radius }]}
      resizeMode="cover"
      accessibilityLabel="Hazard photo"
      onError={() => setFailedUri(uri)}
    />
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', backgroundColor: Colors.surfaceAlt },
  sample: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.brandBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.brandBlue,
    marginTop: 6,
  },
});
