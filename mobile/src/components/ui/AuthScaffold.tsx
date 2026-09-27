import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
                <BantayLogo size={62} wordmark />
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

/** Email / password field with Bantay's validation messages. */
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
}): React.ReactElement {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        {icon && (
          <MaterialIcons
            name={icon}
            size={20}
            color={Colors.inkFaint}
            style={styles.fieldIcon}
          />
        )}
        <TextInput
          style={[styles.input, multiline ? styles.inputMultiline : null]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          placeholder={placeholder}
          placeholderTextColor={Colors.inkFaint}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          multiline={multiline}
          accessibilityLabel={label}
          testID={testID}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xxl },
  inner: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  logo: { alignItems: 'center', marginBottom: Spacing.xxl },
  title: { fontSize: 26, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 14.5, color: Colors.inkMuted, marginTop: Spacing.sm },
  body: { marginTop: Spacing.xxl },
  field: { marginBottom: Spacing.lg },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.inkMuted,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm + 2,
    borderWidth: 1,
    borderColor: Colors.line,
    minHeight: MIN_TAP_TARGET,
    paddingHorizontal: Spacing.md,
  },
  inputError: { borderColor: Colors.brandRed, borderWidth: 1.5 },
  fieldIcon: { marginRight: Spacing.sm },
  input: { flex: 1, fontSize: 16, color: Colors.ink, paddingVertical: Spacing.md },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  errorText: { fontSize: 12.5, color: Colors.brandRedDark, marginTop: 5, fontWeight: '600' },
});
