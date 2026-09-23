import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { HazardType, ReportStatus, SafeSpotCategory } from '../../data/models/enums';
import { Colors } from '../../core/theme/colors';
import { hazardIcon, safeSpotIcon, statusColor } from '../../core/utils/hazardVisuals';

/**
 * A teardrop map pin carrying a hazard icon.
 *
 * Colour is the primary signal (red verified, orange pending) and the icon is
 * the secondary one, so the map stays readable for users who cannot rely on
 * colour alone.
 */
export function HazardPin({
  type,
  status,
  selected = false,
  size = 44,
}: {
  type: HazardType;
  status: ReportStatus;
  selected?: boolean;
  size?: number;
}): React.ReactElement {
  const color = statusColor(status);
  const width = selected ? size * 1.15 : size;
  const height = width * 1.2;

  return (
    <View style={{ width: size, height: size * 1.2, alignItems: 'center' }}>
      <Svg width={width} height={height} viewBox="0 0 44 53">
        <Path
          d="M22 0C10.4 0 1 9.4 1 21c0 14.7 18.2 30.3 19 31a3 3 0 0 0 4 0c.8-.7 19-16.3 19-31C43 9.4 33.6 0 22 0z"
          fill={Colors.white}
        />
        <Path
          d="M22 3C12.1 3 4 11.1 4 21c0 12.4 14.7 26.2 18 29.1 3.3-2.9 18-16.7 18-29.1C40 11.1 31.9 3 22 3z"
          fill={color}
        />
      </Svg>
      <View style={[styles.pinIcon, { width, height: width }]} pointerEvents="none">
        <MaterialIcons name={hazardIcon(type)} size={size * 0.42} color={Colors.white} />
      </View>
    </View>
  );
}

/**
 * A rounded square pin for safe spots, visually distinct from hazard
 * teardrops so the two never blur together at a glance.
 */
export function SafeSpotPin({
  category,
  selected = false,
  size = 38,
}: {
  category: SafeSpotCategory;
  selected?: boolean;
  size?: number;
}): React.ReactElement {
  const dimension = selected ? size * 1.15 : size;
  return (
    <View
      style={[
        styles.safeSpot,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension * 0.32,
        },
      ]}
    >
      <MaterialIcons name={safeSpotIcon(category)} size={dimension * 0.5} color={Colors.white} />
    </View>
  );
}

/**
 * The blue dot showing the user's own position. Drawn hollow when the
 * position is the Manila fallback rather than a real fix, so the user is
 * never misled about accuracy.
 */
export function UserLocationDot({
  size = 20,
  stale = false,
}: {
  size?: number;
  stale?: boolean;
}): React.ReactElement {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: stale ? Colors.white : Colors.userLocation,
        borderWidth: 3,
        borderColor: stale ? Colors.userLocation : Colors.white,
      }}
    />
  );
}

/** The draggable pin used while placing a report or a route endpoint. */
export function PlacementPin({
  color = Colors.brandRed,
  size = 52,
}: {
  color?: string;
  size?: number;
}): React.ReactElement {
  return (
    <View style={{ width: size, height: size * 1.2, alignItems: 'center' }}>
      <Svg width={size} height={size * 1.2} viewBox="0 0 44 53">
        <Path
          d="M22 0C10.4 0 1 9.4 1 21c0 14.7 18.2 30.3 19 31a3 3 0 0 0 4 0c.8-.7 19-16.3 19-31C43 9.4 33.6 0 22 0z"
          fill={Colors.white}
        />
        <Path
          d="M22 3C12.1 3 4 11.1 4 21c0 12.4 14.7 26.2 18 29.1 3.3-2.9 18-16.7 18-29.1C40 11.1 31.9 3 22 3z"
          fill={color}
        />
      </Svg>
      <View style={[styles.pinIcon, { width: size, height: size }]} pointerEvents="none">
        <MaterialIcons name="place" size={size * 0.4} color={Colors.white} />
      </View>
    </View>
  );
}

/**
 * The Bantay mark: a blue eye whose pupil is a red map pin.
 *
 * Drawn as vector rather than shipped as a raster so it stays crisp at every
 * size and the brand colours come from one source of truth.
 */
export function BantayLogo({ size = 64 }: { size?: number }): React.ReactElement {
  const height = size * 0.72;
  return (
    <Svg width={size} height={height} viewBox="0 0 100 72">
      <Path d="M0 36 Q50 -6 100 36 Q50 78 0 36 Z" fill={Colors.brandBlue} />
      <Path d="M10 36 Q50 6 90 36 Q50 66 10 36 Z" fill={Colors.white} />
      <Circle cx="50" cy="32" r="19" fill={Colors.brandRed} />
      <Path d="M36 44 L50 68 L64 44 Z" fill={Colors.brandRed} />
      <Circle cx="44" cy="26" r="6" fill={Colors.white} opacity={0.92} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  pinIcon: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeSpot: {
    backgroundColor: Colors.safe,
    borderWidth: 2.5,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
