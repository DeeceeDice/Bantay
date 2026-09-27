import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BantayLogo } from '../src/components/ui/Pins';
import { Button } from '../src/components/ui';
import { IconName } from '../src/core/utils/hazardVisuals';
import { Colors, Spacing } from '../src/core/theme/colors';
import { StoreKeys } from '../src/data/repositories/storeKeys';
import { useApp } from '../src/state/appStore';

const { width } = Dimensions.get('window');

/** Three skippable slides explaining what Bantay does before asking to sign up. */
export default function OnboardingScreen(): React.ReactElement {
  const { s } = useApp();
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const slides: { icon: IconName; accent: string; title: string; body: string }[] = [
    {
      icon: 'travel-explore',
      accent: Colors.brandRed,
      title: s('onboardTitle1'),
      body: s('onboardBody1'),
    },
    {
      icon: 'verified-user',
      accent: Colors.brandBlue,
      title: s('onboardTitle2'),
      body: s('onboardBody2'),
    },
    {
      icon: 'notifications-active',
      accent: Colors.safe,
      title: s('onboardTitle3'),
      body: s('onboardBody3'),
    },
  ];

  const finish = async (): Promise<void> => {
    await AsyncStorage.setItem(StoreKeys.onboardingSeen, 'true');
    router.replace('/signup');
  };

  const next = (): void => {
    if (index >= slides.length - 1) {
      void finish();
      return;
    }
    scroller.current?.scrollTo({ x: width * (index + 1), animated: true });
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BantayLogo size={44} />
        <Text style={styles.brand}>Bantay</Text>
        <View style={styles.spacer} />
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={styles.skip}>{s('skip')}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.pager}
      >
        {slides.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <View style={[styles.iconOuter, { backgroundColor: `${slide.accent}1A` }]}>
              <View style={[styles.iconInner, { backgroundColor: `${slide.accent}29` }]}>
                <MaterialIcons name={slide.icon} size={52} color={slide.accent} />
              </View>
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((slide, i) => (
            <View
              key={slide.title}
              style={[
                styles.dot,
                {
                  width: i === index ? 26 : 8,
                  backgroundColor: i === index ? Colors.brandRed : Colors.line,
                },
              ]}
            />
          ))}
        </View>
        <Button
          label={index >= slides.length - 1 ? s('getStarted') : s('next')}
          onPress={next}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  brand: { fontSize: 19, fontWeight: '800', color: Colors.brandBlue, marginLeft: Spacing.sm },
  spacer: { flex: 1 },
  skip: { fontSize: 15.5, fontWeight: '700', color: Colors.brandBlue },
  pager: { flex: 1 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconOuter: {
    width: 168,
    height: 168,
    borderRadius: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
    textAlign: 'center',
    marginTop: 44,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    color: Colors.inkMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  footer: { paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.xxl },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: Spacing.xxl },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
});
