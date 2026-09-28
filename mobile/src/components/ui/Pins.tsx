import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { HazardType, ReportStatus, SafeSpotCategory } from '../../data/models/enums';
import { Colors } from '../../core/theme/colors';
import { hazardIcon, safeSpotIcon, statusColor } from '../../core/utils/hazardVisuals';

/**
 * The outline of a map pin in a `width` x `width * 1.2` box: a round head
 * with a short pointed tail whose tip marks the spot. `scale` shrinks it about
 * the middle of the head, which is how the white rim is drawn.
 */
function pinPath(width: number, scale = 1): string {
  const h = width * 1.2;
  const cx = width / 2;
  const cy = h * 0.52;
  const x = (v: number): number => cx + (v - cx) * scale;
  const y = (v: number): number => cy + (v - cy) * scale;
  const r = (width / 2) * scale;
  const headY = y(width / 2);
  // The head runs clockwise and the tail the other way, so where they overlap
  // cancels out: the tail shows as a notch cut up into the head.
  const head = `M${cx - r} ${headY}A${r} ${r} 0 1 1 ${cx + r} ${headY}A${r} ${r} 0 1 1 ${cx - r} ${headY}Z`;
  const tail =
    `M${x(width * 0.18)} ${y(h * 0.62)}` +
    `Q${x(cx)} ${y(h * 0.78)} ${x(cx)} ${y(h)}` +
    `Q${x(cx)} ${y(h * 0.78)} ${x(width * 0.82)} ${y(h * 0.62)}Z`;
  return head + tail;
}

/** A coloured pin with a white rim and a soft shadow, holding `children`. */
function PinShape({
  color,
  size,
  iconInset,
  children,
}: {
  color: string;
  size: number;
  /** Space kept free under the icon so it sits in the round head. */
  iconInset: number;
  children: React.ReactNode;
}): React.ReactElement {
  const height = size * 1.2;
  return (
    <View style={{ width: size, height }}>
      <Svg width={size} height={height + 2} style={StyleSheet.absoluteFill}>
        <G transform="translate(0, 1.5)">
          <Path d={pinPath(size)} fill="rgba(0,0,0,0.22)" />
        </G>
        <Path d={pinPath(size)} fill={Colors.white} />
        <Path d={pinPath(size, 0.86)} fill={color} />
      </Svg>
      <View style={[styles.pinIcon, { width: size, height: height - iconInset }]} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

/**
 * A round map pin carrying a hazard icon, its short tail on the spot.
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
  return (
    <View style={selected ? styles.selected : undefined}>
      <PinShape color={statusColor(status)} size={size} iconInset={size * 0.32}>
        <MaterialIcons name={hazardIcon(type)} size={size * 0.46} color={Colors.white} />
      </PinShape>
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
  return (
    <View
      style={[
        styles.safeSpot,
        { width: size, height: size, borderRadius: size * 0.32 },
        selected && styles.selected,
      ]}
    >
      <MaterialIcons name={safeSpotIcon(category)} size={size * 0.5} color={Colors.white} />
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
      style={[
        styles.userDot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: stale ? Colors.white : Colors.userLocation,
          borderColor: stale ? Colors.userLocation : Colors.white,
        },
      ]}
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
    <PinShape color={color} size={size} iconInset={size * 0.3}>
      <MaterialIcons name="place" size={size * 0.44} color={Colors.white} />
    </PinShape>
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
  selected: { transform: [{ scale: 1.18 }] },
  userDot: {
    borderWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.27,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  safeSpot: {
    backgroundColor: Colors.safe,
    borderWidth: 2.5,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
