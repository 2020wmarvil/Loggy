import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getDailyQuote } from '@/lib/progression';
import { useAppData } from '@/store/AppDataContext';
import { useTheme } from '@/theme/ThemeContext';
import { radii } from '@/theme/tokens';

export function QuoteCard({ today }: { today: Date }) {
  const theme = useTheme();
  const { aphorisms } = useAppData();
  const q = getDailyQuote(today, aphorisms);

  if (!q) return null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.s1, borderColor: theme.border, borderLeftColor: theme.green },
      ]}
    >
      <Text style={[styles.label, { color: theme.muted }]}>TODAY&apos;S FOCUS</Text>
      <Text style={[styles.text, { color: theme.text }]}>&quot;{q.text}&quot;</Text>
      {q.attr && <Text style={[styles.attr, { color: theme.muted }]}>— {q.attr}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 14,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 16,
    borderWidth: 1,
    borderLeftWidth: 2,
    borderRadius: radii.card,
  },
  label: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  text: {
    fontSize: 13.5,
    fontStyle: 'italic',
    lineHeight: 21.6,
  },
  attr: {
    fontSize: 11,
    marginTop: 7,
  },
});
