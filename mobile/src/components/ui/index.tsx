import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { IconName } from '../../core/utils/hazardVisuals';
import { Colors, MIN_TAP_TARGET, Radius, Shadow, Spacing } from '../../core/theme/colors';

/** A small pill label, used for verification state, severity and categories. */
export function Badge({
  label,
  color,
  icon,
  filled = false,
  compact = false,
}: {
  label: string;
  color: string;
  icon?: IconName;
  filled?: boolean;
  compact?: boolean;
}): React.ReactElement {
  const foreground = filled ? Colors.white : color;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: filled ? color : `${color}1F`,
          borderColor: filled ? 'transparent' : `${color}4D`,
          paddingHorizontal: compact ? 8 : 10,
          paddingVertical: compact ? 4 : 6,
        },
      ]}
    >
      {icon && (
        <MaterialIcons name={icon} size={compact ? 12 : 14} color={foreground} />
      )}
      <Text
        style={[
          styles.badgeText,
          { color: foreground, fontSize: compact ? 11 : 12.5, marginLeft: icon ? 5 : 0 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/** A white card with the app's standard border and padding. */
export function Card({
  children,
  onPress,
  style,
  borderColor,
  padded = true,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  borderColor?: string;
  padded?: boolean;
}): React.ReactElement {
  const content = (
    <View
      style={[
        styles.card,
        { borderColor: borderColor ?? Colors.line, padding: padded ? Spacing.lg : 0 },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      {content}
    </Pressable>
  );
}

/** Heading used above grouped settings and list sections. */
export function SectionHeader({ title }: { title: string }): React.ReactElement {
  return <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>;
}

/**
 * A button that shows a spinner while its action runs.
 *
 * Disabling during load is what actually prevents a double submission on a
 * slow network, which is exactly when this app gets used.
 */
export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  color,
  borderColor,
  style,
}: {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'text';
  icon?: IconName;
  color?: string;
  borderColor?: string;
  style?: ViewStyle;
}): React.ReactElement {
  const isDisabled = disabled || loading;
  const background =
    variant === 'primary' ? (isDisabled ? Colors.line : (color ?? Colors.brandRed)) : 'transparent';
  const foreground =
    variant === 'primary'
      ? isDisabled
        ? Colors.inkFaint
        : Colors.white
      : (color ?? Colors.brandBlue);

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: variant === 'outline' ? (borderColor ?? Colors.line) : 'transparent',
          borderWidth: variant === 'outline' ? 1.5 : 0,
          opacity: pressed && !isDisabled ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.buttonRow}>
          {icon && (
            <MaterialIcons
              name={icon}
              size={20}
              color={foreground}
              style={{ marginRight: Spacing.sm }}
            />
          )}
          <Text style={[styles.buttonLabel, { color: foreground }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * The white bar across the top of a screen: optional back or close button,
 * the title, and an optional text action on the right. Material's app bar, as
 * the app has always drawn it.
 */
export function AppBar({
  title,
  leading,
  onLeading,
  actionLabel,
  onAction,
  right,
}: {
  title: string;
  leading?: 'back' | 'close';
  onLeading?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  /** Any other control for the right-hand end, such as a view toggle. */
  right?: React.ReactNode;
}): React.ReactElement {
  return (
    <View style={styles.appBar}>
      {leading && (
        <Pressable
          onPress={onLeading}
          hitSlop={8}
          style={styles.appBarLeading}
          accessibilityRole="button"
          accessibilityLabel={leading === 'close' ? 'Close' : 'Back'}
        >
          <MaterialIcons name={leading === 'close' ? 'close' : 'arrow-back'} size={24} color={Colors.ink} />
        </Pressable>
      )}
      <Text style={[styles.appBarTitle, leading && styles.appBarTitleIndented]} numberOfLines={1}>
        {title}
      </Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8} style={styles.appBarAction} accessibilityRole="button">
          <Text style={styles.appBarActionText}>{actionLabel}</Text>
        </Pressable>
      )}
      {right}
    </View>
  );
}

/** Material's outlined segmented button: a centred pill of equal segments. */
export function SegmentedButton<T extends string | boolean>({
  segments,
  value,
  onChange,
  compact = false,
}: {
  segments: { value: T; label?: string; icon?: React.ReactNode; accessibilityLabel?: string }[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
}): React.ReactElement {
  return (
    <View style={[styles.segmented, compact && styles.segmentedCompact]}>
      {segments.map((segment, i) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={String(segment.value)}
            onPress={() => onChange(segment.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={segment.accessibilityLabel ?? segment.label}
            style={[
              styles.segment,
              compact && styles.segmentCompact,
              i > 0 && styles.segmentDivider,
              selected && styles.segmentSelected,
            ]}
          >
            {segment.icon}
            {segment.label !== undefined && (
              <Text style={styles.segmentText} numberOfLines={1}>
                {segment.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * One tappable line in a grouped settings card: icon, label, an optional
 * value on the right, and a chevron.
 */
export function NavRow({
  icon,
  label,
  description,
  trailing,
  onPress,
  highlight = false,
}: {
  icon: IconName;
  label: string;
  description?: string;
  trailing?: string;
  onPress: () => void;
  highlight?: boolean;
}): React.ReactElement {
  return (
    <Pressable
      style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <MaterialIcons name={icon} size={20} color={highlight ? Colors.safe : Colors.inkMuted} />
      <View style={styles.navRowBody}>
        <Text
          style={[styles.navRowLabel, { color: highlight ? Colors.safeDark : Colors.ink }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {description && <Text style={styles.navRowDesc}>{description}</Text>}
      </View>
      {trailing && <Text style={styles.navRowTrailing}>{trailing}</Text>}
      <MaterialIcons name="chevron-right" size={20} color={Colors.inkFaint} />
    </Pressable>
  );
}

/** The hairline between rows of a grouped card. */
export function Divider(): React.ReactElement {
  return <View style={styles.divider} />;
}

/** Shown wherever a list has nothing in it yet. */
export function EmptyState({
  icon,
  title,
  message,
}: {
  icon: IconName;
  title?: string;
  message: string;
}): React.ReactElement {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <MaterialIcons name={icon} size={34} color={Colors.brandBlue} />
      </View>
      {title && <Text style={styles.emptyTitle}>{title}</Text>}
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

/** A full-width banner for safety status and offline notices. */
export function StatusBanner({
  icon,
  title,
  message,
  color,
  action,
  onDismiss,
}: {
  icon: IconName;
  title: string;
  message?: string;
  color: string;
  action?: React.ReactNode;
  onDismiss?: () => void;
}): React.ReactElement {
  return (
    <View style={[styles.banner, { backgroundColor: color }]}>
      <MaterialIcons name={icon} size={22} color={Colors.white} />
      <View style={styles.bannerBody}>
        <Text style={styles.bannerTitle}>{title}</Text>
        {message && <Text style={styles.bannerMessage}>{message}</Text>}
      </View>
      {action}
      {onDismiss && (
        <Pressable onPress={onDismiss} style={styles.bannerClose} accessibilityLabel="Dismiss">
          <MaterialIcons name="close" size={18} color={Colors.white} />
        </Pressable>
      )}
    </View>
  );
}

/** A labelled row of statistics, used on the profile. */
export function StatTile({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}): React.ReactElement {
  return (
    <View style={[styles.statTile, { backgroundColor: `${color}14`, borderColor: `${color}2E` }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/** Material 3's outline and selected-segment tones for the brand blue. */
const OUTLINE = '#74777F';
const SEGMENT_SELECTED = '#DAE2F9';

const styles = StyleSheet.create({
  appBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
  },
  appBarLeading: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  appBarTitle: { flex: 1, fontSize: 19, fontWeight: '700', color: Colors.ink },
  appBarTitleIndented: { marginLeft: Spacing.lg },
  appBarAction: { minHeight: MIN_TAP_TARGET, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  appBarActionText: { fontSize: 15.5, fontWeight: '700', color: Colors.brandBlue },
  segmented: {
    flexDirection: 'row',
    alignSelf: 'center',
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: OUTLINE,
    overflow: 'hidden',
  },
  segmentedCompact: { alignSelf: 'auto', height: 32, borderRadius: 16 },
  segment: { minWidth: 150, paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  segmentCompact: { minWidth: 0 },
  segmentDivider: { borderLeftWidth: 1, borderLeftColor: OUTLINE },
  segmentSelected: { backgroundColor: SEGMENT_SELECTED },
  segmentText: { fontSize: 14.5, fontWeight: '500', color: Colors.ink },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: 14,
    paddingVertical: 15,
  },
  navRowPressed: { backgroundColor: Colors.surfaceAlt },
  navRowBody: { flex: 1, marginLeft: 14 },
  navRowLabel: { fontSize: 16, fontWeight: '700' },
  navRowDesc: { fontSize: 12.5, lineHeight: 17.5, color: Colors.inkFaint, marginTop: 2 },
  navRowTrailing: { fontSize: 12.5, color: Colors.inkFaint, marginLeft: Spacing.sm, marginRight: 6 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.line },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  badgeText: { fontWeight: '700' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  pressed: { opacity: 0.85 },
  sectionHeader: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: Colors.inkFaint,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  button: {
    minHeight: MIN_TAP_TARGET + 4,
    borderRadius: Radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  buttonRow: { flexDirection: 'row', alignItems: 'center' },
  buttonLabel: { fontSize: 15.5, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 32 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.brandBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.xs },
  emptyMessage: { fontSize: 14.5, color: Colors.inkMuted, textAlign: 'center', lineHeight: 21 },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radius.md,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: Spacing.md,
    ...Shadow.floating,
  },
  bannerBody: { flex: 1, marginLeft: Spacing.md, marginRight: Spacing.sm },
  bannerClose: {
    width: 32,
    height: 40,
    marginVertical: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { color: Colors.white, fontWeight: '700', fontSize: 15, lineHeight: 19 },
  bannerMessage: { color: 'rgba(255,255,255,0.92)', fontSize: 13, lineHeight: 17.5, marginTop: 3 },
  statTile: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', lineHeight: 28 },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.inkMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
