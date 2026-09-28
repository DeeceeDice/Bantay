import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import React from 'react';
import { ColorValue, Platform, Text } from 'react-native';

import { Colors } from '../../src/core/theme/colors';
import { unreadCount } from '../../src/data/repositories/logic';
import { useApp } from '../../src/state/appStore';

type Glyph =
  | { set: 'material'; name: React.ComponentProps<typeof MaterialIcons>['name'] }
  | { set: 'community'; name: React.ComponentProps<typeof MaterialCommunityIcons>['name'] };

/** Outlined when the tab is not selected, filled when it is. */
function tabIcon(outlined: Glyph, filled: Glyph) {
  return function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    const glyph = focused ? filled : outlined;
    return glyph.set === 'community' ? (
      <MaterialCommunityIcons name={glyph.name} size={24} color={color} />
    ) : (
      <MaterialIcons name={glyph.name} size={24} color={color} />
    );
  };
}

function TabLabel({ focused, color, children }: { focused: boolean; color: ColorValue; children: string }) {
  return (
    <Text
      numberOfLines={1}
      style={{ fontSize: 10.5, fontWeight: focused ? '700' : '600', color, marginTop: 3 }}
    >
      {children}
    </Text>
  );
}

/**
 * The signed-in app: five tabs with a persistent bottom navigation bar.
 *
 * The Report tab pushes a full-screen flow rather than swapping the body, so
 * the map keeps its camera position while a report is being filed.
 */
export default function TabsLayout(): React.ReactElement {
  const { s, data } = useApp();
  const unread = unreadCount(data.alerts);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.brandRed,
        tabBarInactiveTintColor: Colors.inkMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.line,
          height: Platform.OS === 'ios' ? 86 : 62,
          paddingTop: 6,
        },
        tabBarLabel: TabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: s('tabMap'),
          tabBarIcon: tabIcon({ set: 'community', name: 'map-outline' }, { set: 'material', name: 'map' }),
        }}
      />
      <Tabs.Screen
        name="report-tab"
        options={{
          title: s('tabReport'),
          tabBarIcon: tabIcon(
            { set: 'material', name: 'add-circle-outline' },
            { set: 'material', name: 'add-circle' },
          ),
        }}
        listeners={{
          tabPress: (event) => {
            // Intercept: the report flow is a pushed screen, not a tab body.
            event.preventDefault();
            router.push('/report');
          },
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: s('tabAlerts'),
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors.brandRed,
            color: Colors.white,
            fontSize: 10,
            fontWeight: '800',
            minWidth: 17,
            height: 17,
            lineHeight: 14,
            borderWidth: 1.5,
            borderColor: Colors.surface,
          },
          tabBarIcon: tabIcon(
            { set: 'material', name: 'notifications-none' },
            { set: 'material', name: 'notifications' },
          ),
        }}
      />
      <Tabs.Screen
        name="safe-spots"
        options={{
          title: s('tabSafeSpots'),
          tabBarIcon: tabIcon({ set: 'community', name: 'shield-outline' }, { set: 'material', name: 'shield' }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: s('tabProfile'),
          tabBarIcon: tabIcon(
            { set: 'material', name: 'person-outline' },
            { set: 'material', name: 'person' },
          ),
        }}
      />
    </Tabs>
  );
}
