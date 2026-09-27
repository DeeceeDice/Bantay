import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthScaffold, Field } from '../src/components/ui/AuthScaffold';
import { Button } from '../src/components/ui';
import { Colors, Spacing } from '../src/core/theme/colors';
import { Alert } from '../src/core/utils/alert';
import { useApp } from '../src/state/appStore';
import { useUserLocation } from '../src/state/LocationProvider';

const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;

/**
 * Email and password log-in against Supabase Auth. The only way in: there is
 * no guest mode and no social button that does not reach a real provider.
 */
export default function LoginScreen(): React.ReactElement {
  const { s, logIn, settings } = useApp();
  const location = useUserLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);

  /** A returning user who already granted location skips the prompt. */
  const proceed = async (): Promise<void> => {
    if (!settings.locationGranted) {
      router.replace('/location');
      return;
    }
    await location.requestAndLocate();
    router.replace('/(tabs)');
  };

  const submit = async (): Promise<void> => {
    const next: Record<string, string | null> = {
      email: !email.trim()
        ? s('emailRequired')
        : EMAIL_RE.test(email.trim())
          ? null
          : s('emailInvalid'),
      password: password ? null : s('passwordRequired'),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setBusy(true);
    const error = await logIn({ email, password });
    setBusy(false);
    if (error) {
      Alert.alert(s('somethingWentWrong'), error);
      return;
    }
    await proceed();
  };

  return (
    <AuthScaffold
      title={s('welcomeBack')}
      subtitle={s('tagline')}
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>{s('noAccountYet')}</Text>
          <Pressable onPress={() => router.replace('/signup')} hitSlop={10}>
            <Text style={styles.footerLink}>{s('signUp')}</Text>
          </Pressable>
        </View>
      }
    >
      <Field
        label={s('email')}
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        icon="mail-outline"
        keyboardType="email-address"
        autoComplete="email"
        testID="login-email"
      />
      <Field
        label={s('password')}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        icon="lock-outline"
        secureTextEntry
        autoComplete="password"
        onSubmitEditing={submit}
        testID="login-password"
      />
      <Button label={s('logIn')} onPress={submit} loading={busy} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerText: { color: Colors.inkMuted, fontSize: 14.5 },
  footerLink: {
    color: Colors.brandBlue,
    fontWeight: '700',
    fontSize: 15,
    marginLeft: Spacing.sm,
  },
});
