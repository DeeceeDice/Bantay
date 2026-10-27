import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { HazardType } from '../../data/models/enums';
import { HazardReport } from '../../data/models/types';
import { Colors, Radius } from '../../core/theme/colors';
import { hazardIcon } from '../../core/utils/hazardVisuals';
import { useReportPhoto } from '../../state/useReportPhoto';

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
  loading = false,
}: {
  uri: string | null;
  type: HazardType;
  height?: number;
  radius?: number;
  /** The photo is still being fetched. */
  loading?: boolean;
}): React.ReactElement {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const failed = uri !== null && uri === failedUri;
  const isSample = !uri || uri.startsWith(SEED_PREFIX) || failed;

  if (loading) {
    return (
      <View
        style={[
          styles.sample,
          { height, borderRadius: radius, width: height ? undefined : '100%' },
        ]}
        accessibilityLabel="Loading photo"
      >
        <ActivityIndicator color={Colors.brandBlue} />
      </View>
    );
  }

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
          {uri && !failed ? 'Sample photo' : 'No photo'}
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

/**
 * A report's photo, fetched when this is first shown (reports are read
 * without their photos). Use this for any report that came from the database.
 */
export function ReportPhoto({
  report,
  height,
  radius,
}: {
  report: Pick<HazardReport, 'id' | 'type' | 'photoUri' | 'hasPhoto'>;
  height?: number;
  radius?: number;
}): React.ReactElement {
  const { uri, loading } = useReportPhoto(report);
  return <HazardPhoto uri={uri} type={report.type} height={height} radius={radius} loading={loading} />;
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
