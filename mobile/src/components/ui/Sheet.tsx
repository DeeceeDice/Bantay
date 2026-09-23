import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '../../core/theme/colors';

/**
 * A bottom sheet.
 *
 * React Native has no built-in sheet, and a Modal with a slide animation
 * behaves identically on Android, iOS and web without pulling in a native
 * dependency that would break Expo Go.
 */
export function Sheet({
  visible,
  onClose,
  children,
  scrollable = true,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  scrollable?: boolean;
}): React.ReactElement {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* Tapping the scrim dismisses, matching platform convention. */}
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />
          {scrollable ? (
            <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  scrim: { flex: 1 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.line,
    alignSelf: 'center',
    marginTop: Spacing.md,
  },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
});
