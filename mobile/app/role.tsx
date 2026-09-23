import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Button } from '../src/components/ui';
import { Colors, Radius, Spacing } from '../src/core/theme/colors';
import { roleDescKey, roleIcon, roleLabelKey } from '../src/core/utils/hazardVisuals';
import { USER_ROLES, UserRole, canVerify } from '../src/data/models/enums';
import { useApp } from '../src/state/appStore';

/**
 * Role picker shown straight after sign-up.
 *
 * The role decides whether the user can verify other people's reports, so it
 * is a deliberate explicit choice rather than a default buried in settings.
 */
export default function RoleScreen(): React.ReactElement {
  const { s, selectRole } = useApp();
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [busy, setBusy] = useState(false);

  const advance = async (): Promise<void> => {
    if (!selected) return;
    setBusy(true);
    await selectRole(selected);
    setBusy(false);
    router.replace('/location');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{s('chooseRole')}</Text>
        <Text style={styles.subtitle}>{s('chooseRoleSub')}</Text>

        {USER_ROLES.map((role) => {
          const isSelected = selected === role;
          return (
            <Pressable
              key={role}
              onPress={() => setSelected(role)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.card,
                {
                  backgroundColor: isSelected ? Colors.brandBlueLight : Colors.surface,
                  borderColor: isSelected ? Colors.brandBlue : Colors.line,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: isSelected ? Colors.brandBlue : Colors.brandBlueLight },
                ]}
              >
                <MaterialIcons
                  name={roleIcon(role)}
                  size={24}
                  color={isSelected ? Colors.white : Colors.brandBlue}
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{s(roleLabelKey(role))}</Text>
                <Text style={styles.cardDesc}>{s(roleDescKey(role))}</Text>
                {canVerify(role) && (
                  <View style={styles.badgeRow}>
                    <Badge
                      label={s('verificationPanel')}
                      color={Colors.safe}
                      icon="verified"
                      compact
                    />
                  </View>
                )}
              </View>
              <MaterialIcons
                name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={24}
                color={isSelected ? Colors.brandBlue : Colors.inkFaint}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button label={s('next')} onPress={advance} disabled={!selected} loading={busy} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.xxl, paddingBottom: Spacing.md },
  title: { fontSize: 26, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 14.5, color: Colors.inkMuted, marginTop: Spacing.sm, lineHeight: 21 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, marginHorizontal: Spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  cardDesc: { fontSize: 12.5, color: Colors.inkMuted, marginTop: 3, lineHeight: 18 },
  badgeRow: { flexDirection: 'row', marginTop: Spacing.sm },
  footer: { padding: Spacing.xxl, paddingTop: Spacing.md },
});
