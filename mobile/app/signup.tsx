import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthScaffold, Field } from '../src/components/ui/AuthScaffold';
import { Button } from '../src/components/ui';
import { Colors, Spacing } from '../src/core/theme/colors';
import { useApp } from '../src/state/appStore';

const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;

/**
 * Account creation. The account is written to Supabase Auth (`auth.users`)
 * and its profile to `public.profiles` by the sign-up trigger; on success the
 * user is signed in and continues to role selection.
 */
export default function SignUpScreen(): React.ReactElement {
  const { s, signUp } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);

  const validate = (): boolean => {
    const next: Record<string, string | null> = {
      name: name.trim() ? null : s('nameRequired'),
      email: !email.trim()
        ? s('emailRequired')
        : EMAIL_RE.test(email.trim())
          ? null
          : s('emailInvalid'),
      password: !password
        ? s('passwordRequired')
        : password.length < 8
          ? s('passwordTooShort')
          : null,
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const submit = async (): Promise<void> => {
    if (!validate()) return;
    setBusy(true);
    const { error, confirmEmail } = await signUp({ name, email, password });
    setBusy(false);
    if (confirmEmail) {
      // The account exists but cannot log in until the link is opened, so
      // send them to log-in rather than on to a role screen they cannot save.
      Alert.alert(s('checkYourEmail'), error ?? undefined, [
        { text: s('logIn'), onPress: () => router.replace('/login') },
      ]);
      return;
    }
    if (error) {
      Alert.alert(s('somethingWentWrong'), error);
      return;
    }
    router.replace('/role');
  };

  return (
    <AuthScaffold
      title={s('createAccount')}
      subtitle={s('tagline')}
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>{s('alreadyHaveAccount')}</Text>
          <Pressable onPress={() => router.replace('/login')} hitSlop={10}>
            <Text style={styles.footerLink}>{s('logIn')}</Text>
          </Pressable>
        </View>
      }
    >
      <Field
        label={s('fullName')}
        value={name}
        onChangeText={setName}
        error={errors.name}
        icon="person-outline"
        autoComplete="name"
        testID="signup-name"
      />
      <Field
        label={s('email')}
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        icon="mail-outline"
        keyboardType="email-address"
        autoComplete="email"
        testID="signup-email"
      />
      <Field
        label={s('password')}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        icon="lock-outline"
        secureTextEntry
        autoComplete="new-password"
        onSubmitEditing={submit}
        testID="signup-password"
      />
      <Button label={s('signUp')} onPress={submit} loading={busy} />
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
