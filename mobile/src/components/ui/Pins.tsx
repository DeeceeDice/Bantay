import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

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

/** Height over width of each artwork file, so the logo reserves its space. */
const MARK_ASPECT = 0.502;
const LOCKUP_ASPECT = 0.703;

/**
 * The Bantay mark: a blue eye whose iris holds a red map pin.
 *
 * Rendered from the brand artwork in `assets/` so every screen shows exactly
 * the logo the app icons are cut from. `size` is the mark's width; with
 * `wordmark` the full lockup, eye over the BANTAY wordmark, is drawn at twice
 * that width so the lettering stays legible.
 */
export function BantayLogo({
  size = 64,
  wordmark = false,
}: {
  size?: number;
  wordmark?: boolean;
}): React.ReactElement {
  if (wordmark) {
    const width = size * 2;
    return (
      <Image
        source={require('../../../assets/bantay-logo.png')}
        style={{ width, height: width * LOCKUP_ASPECT }}
        accessibilityRole="image"
        accessibilityLabel="Bantay"
      />
    );
  }
  return (
    <Image
      source={require('../../../assets/bantay-mark.png')}
      style={{ width: size, height: size * MARK_ASPECT }}
      accessible={false}
    />
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
