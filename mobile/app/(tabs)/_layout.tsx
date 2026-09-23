import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { Colors } from '../../src/core/theme/colors';
import { unreadCount } from '../../src/data/repositories/logic';
import { useApp } from '../../src/state/appStore';

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
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: s('tabMap'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report-tab"
        options={{
          title: s('tabReport'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="add-circle-outline" size={size} color={color} />
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
          tabBarBadgeStyle: { backgroundColor: Colors.brandRed, fontSize: 10 },
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="notifications-none" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="safe-spots"
        options={{
          title: s('tabSafeSpots'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="shield" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: s('tabProfile'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
