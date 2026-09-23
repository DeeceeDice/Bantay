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
  style,
}: {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'text';
  icon?: IconName;
  color?: string;
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
          borderColor: variant === 'outline' ? Colors.line : 'transparent',
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
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityLabel="Dismiss">
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

const styles = StyleSheet.create({
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
    padding: Spacing.md,
    ...Shadow.floating,
  },
  bannerBody: { flex: 1, marginHorizontal: Spacing.md },
  bannerTitle: { color: Colors.white, fontWeight: '700', fontSize: 15, lineHeight: 19 },
  bannerMessage: { color: 'rgba(255,255,255,0.92)', fontSize: 13, lineHeight: 18, marginTop: 3 },
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
