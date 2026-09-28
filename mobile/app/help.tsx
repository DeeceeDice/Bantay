import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Divider } from '../src/components/ui';
import { Colors, Spacing } from '../src/core/theme/colors';
import { StringKey } from '../src/core/i18n/strings';
import { useApp } from '../src/state/appStore';

const FAQS: [StringKey, StringKey][] = [
  ['faqQ1', 'faqA1'],
  ['faqQ2', 'faqA2'],
  ['faqQ3', 'faqA3'],
  ['faqQ4', 'faqA4'],
  ['faqQ5', 'faqA5'],
];

/** Answers to the questions people ask first, one tap to open each. */
export default function HelpScreen(): React.ReactElement {
  const { s } = useApp();

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card padded={false}>
        {FAQS.map(([question, answer], i) => (
          <React.Fragment key={question}>
            {i > 0 && <Divider />}
            <FaqRow question={s(question)} answer={s(answer)} />
          </React.Fragment>
        ))}
      </Card>
    </ScrollView>
  );
}

function FaqRow({ question, answer }: { question: string; answer: string }): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        onPress={() => setOpen(!open)}
        style={styles.question}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.questionText}>{question}</Text>
        <MaterialIcons
          name={open ? 'expand-less' : 'expand-more'}
          size={24}
          color={open ? Colors.brandBlue : Colors.inkMuted}
        />
      </Pressable>
      {open && <Text style={styles.answer}>{answer}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  questionText: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.ink, marginRight: Spacing.sm },
  answer: {
    fontSize: 14.5,
    lineHeight: 21,
    color: Colors.inkMuted,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
});
