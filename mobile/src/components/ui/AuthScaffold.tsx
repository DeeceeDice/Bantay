import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, MIN_TAP_TARGET, Radius, Spacing } from '../../core/theme/colors';
import { IconName } from '../../core/utils/hazardVisuals';
import { BantayLogo } from './Pins';

/** Shared chrome for the sign-up, log-in and password-reset screens. */
export function AuthScaffold({
  title,
  subtitle,
  children,
  footer,
  showLogo = true,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showLogo?: boolean;
}): React.ReactElement {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Constrained so the form centres on tablets instead of stretching. */}
          <View style={styles.inner}>
            {showLogo && (
              <View style={styles.logo}>
                <BantayLogo size={96} />
                <Text style={styles.wordmark}>Bantay</Text>
              </View>
            )}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <View style={styles.body}>{children}</View>
            {footer}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Email / password field with Bantay's validation messages.
 *
 * Material's filled, outlined text field: the label sits inside the box until
 * the field is focused or filled, then floats up onto the border. Password
 * fields get an eye button that shows what was typed.
 */
export function Field({
  label,
  value,
  onChangeText,
  error,
  icon,
  secureTextEntry,
  keyboardType,
  autoComplete,
  placeholder,
  onSubmitEditing,
  maxLength,
  multiline,
  testID,
  floatingLabel = true,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  icon?: IconName;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default';
  autoComplete?: 'email' | 'password' | 'name' | 'new-password' | 'off';
  placeholder?: string;
  onSubmitEditing?: () => void;
  maxLength?: number;
  multiline?: boolean;
  testID?: string;
  /** False for a field with its own heading: then only `placeholder` shows. */
  floatingLabel?: boolean;
}): React.ReactElement {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const floating = floatingLabel && (focused || value.length > 0);
  const tint = error ? Colors.brandRed : focused ? Colors.brandBlue : Colors.inkMuted;

  return (
    <View style={styles.field}>
      <View
        style={[
          styles.inputWrap,
          { paddingLeft: icon ? Spacing.md : Spacing.lg },
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          focused && error ? styles.inputFocused : null,
        ]}
      >
        {icon && (
          <MaterialIcons
            name={icon}
            size={20}
            color={error ? Colors.brandRed : Colors.inkMuted}
            style={styles.fieldIcon}
          />
        )}
        <TextInput
          style={[styles.input, multiline ? styles.inputMultiline : null]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secureTextEntry && hidden}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          // Emails and passwords are typed exactly: a keyboard that capitalizes
          // or corrects a password makes it differ from the one Bantay Admin
          // and other phones receive.
          autoCapitalize={keyboardType === 'email-address' || secureTextEntry ? 'none' : 'sentences'}
          autoCorrect={!(keyboardType === 'email-address' || secureTextEntry)}
          placeholder={floating || !floatingLabel ? placeholder : label}
          placeholderTextColor={floating || !floatingLabel ? Colors.inkFaint : Colors.inkMuted}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          multiline={multiline}
          accessibilityLabel={label}
          testID={testID}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setHidden(!hidden)}
            hitSlop={10}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <MaterialCommunityIcons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={Colors.inkMuted}
            />
          </Pressable>
        )}
        {floating && (
          // The label cuts into the top border: white above the line, the
          // field's fill below it.
          <View style={styles.floatLabel} pointerEvents="none">
            <View style={styles.floatLabelFill} />
            <Text style={[styles.floatLabelText, { color: tint }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  inner: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  logo: { alignItems: 'center', marginTop: Spacing.md, marginBottom: 30 },
  wordmark: {
    fontSize: 21,
    fontWeight: '800',
    color: Colors.brandBlue,
    marginTop: Spacing.sm,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 14.5, lineHeight: 21, color: Colors.inkMuted, marginTop: Spacing.sm },
  body: { marginTop: Spacing.xxl },
  field: { marginBottom: 14 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm + 2,
    borderWidth: 1,
    borderColor: Colors.line,
    minHeight: 56,
    paddingRight: Spacing.md,
  },
  inputFocused: { borderColor: Colors.brandBlue, borderWidth: 2 },
  inputError: { borderColor: Colors.brandRed, borderWidth: 1.5 },
  fieldIcon: { marginRight: Spacing.md },
  input: { flex: 1, fontSize: 16, color: Colors.ink, paddingVertical: 15 },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top', paddingTop: 18 },
  eye: { width: MIN_TAP_TARGET - 8, height: MIN_TAP_TARGET - 8, alignItems: 'center', justifyContent: 'center' },
  floatLabel: {
    position: 'absolute',
    top: -9,
    left: 10,
    paddingHorizontal: 4,
    backgroundColor: Colors.surface,
  },
  floatLabelFill: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surfaceAlt,
  },
  floatLabelText: { fontSize: 12, lineHeight: 16 },
  errorText: { fontSize: 12, color: Colors.brandRed, marginTop: 5, marginLeft: Spacing.lg },
});
