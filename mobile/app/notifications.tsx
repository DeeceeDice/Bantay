import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, NavRow, SectionHeader } from '../src/components/ui';
import { Sheet } from '../src/components/ui/Sheet';
import { Geo } from '../src/core/geo/latLng';
import { Colors, Spacing } from '../src/core/theme/colors';
import { useApp } from '../src/state/appStore';

/** Which area's broadcasts reach you, and how close a hazard must be to alert you. */
export default function NotificationsScreen(): React.ReactElement {
  const app = useApp();
  const { s, user, data, settings } = app;
  const [areaOpen, setAreaOpen] = useState(false);
  // Where the thumb is while it is dragged; the setting is saved on release.
  const [draggedKm, setDraggedKm] = useState<number | null>(null);
  const radiusKm = draggedKm ?? settings.alertRadiusKm;

  const homeZone = data.zones.find((z) => z.id === user?.homeZoneId) ?? null;

  const chooseArea = (zoneId: string | null): void => {
    setAreaOpen(false);
    void app.setHomeZone(zoneId).catch((e: unknown) => {
      Alert.alert(s('somethingWentWrong'), e instanceof Error ? e.message : String(e));
    });
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card padded={false}>
          <NavRow
            icon="place"
            label={s('myArea')}
            description={s('myAreaDesc')}
            trailing={homeZone?.name ?? s('noAreaChosen')}
            onPress={() => setAreaOpen(true)}
          />
        </Card>

        <SectionHeader title={s('alertRadius')} />
        <Card>
          <View style={styles.radiusHeader}>
            <Text style={styles.radiusDesc}>{s('alertRadiusDesc')}</Text>
            <Badge label={Geo.formatRadius(radiusKm)} color={Colors.brandBlue} filled />
          </View>
          <Slider
            style={styles.slider}
            value={settings.alertRadiusKm}
            minimumValue={0.5}
            maximumValue={10}
            // Stops of 500 m: fine enough to tune, coarse enough to hit a
            // value with a thumb while walking.
            step={0.5}
            minimumTrackTintColor={Colors.brandBlue}
            maximumTrackTintColor={Colors.brandBlueLight}
            thumbTintColor={Colors.brandBlue}
            onValueChange={setDraggedKm}
            onSlidingComplete={(km) => {
              setDraggedKm(null);
              void app.updateSettings({ alertRadiusKm: km });
            }}
            accessibilityLabel={s('alertRadius')}
          />
          <View style={styles.scale}>
            <Text style={styles.scaleText}>500 m</Text>
            <Text style={styles.scaleText}>10 km</Text>
          </View>
        </Card>
      </ScrollView>

      <Sheet visible={areaOpen} onClose={() => setAreaOpen(false)}>
        <Text style={styles.sheetTitle}>{s('myArea')}</Text>
        <Text style={styles.sheetSub}>{s('myAreaDesc')}</Text>
        {[null, ...data.zones.map((z) => z.id)].map((id) => {
          const zone = data.zones.find((z) => z.id === id) ?? null;
          const on = (user?.homeZoneId ?? null) === id;
          return (
            <Pressable
              key={id ?? 'none'}
              onPress={() => chooseArea(id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={styles.areaRow}
            >
              <MaterialIcons
                name={on ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={22}
                color={on ? Colors.brandBlue : Colors.inkFaint}
              />
              <View style={styles.areaBody}>
                <Text style={styles.areaName}>{zone ? zone.name : s('clearArea')}</Text>
                {zone && <Text style={styles.areaCity}>{zone.city}</Text>}
              </View>
            </Pressable>
          );
        })}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  radiusHeader: { flexDirection: 'row', alignItems: 'center' },
  radiusDesc: { flex: 1, fontSize: 12.5, lineHeight: 17.5, color: Colors.inkFaint, marginRight: Spacing.md },
  slider: { height: 40, marginTop: Spacing.sm },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleText: { fontSize: 12.5, color: Colors.inkFaint },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: Colors.ink },
  sheetSub: { fontSize: 13.5, color: Colors.inkMuted, marginTop: Spacing.xs, marginBottom: Spacing.md },
  areaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  areaBody: { marginLeft: Spacing.md },
  areaName: { fontSize: 15, fontWeight: '600', color: Colors.ink },
  areaCity: { fontSize: 12, color: Colors.inkMuted },
});
