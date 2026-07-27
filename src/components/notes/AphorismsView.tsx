import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Quote } from '@/data/types';
import { QUOTES } from '@/data/quotes';
import { useTheme } from '@/theme/ThemeContext';
import { radii } from '@/theme/tokens';

const PAGE_SIZE = 20;

export function AphorismsView() {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [spotlight, setSpotlight] = useState<Quote | null>(null);
  const totalPages = Math.ceil(QUOTES.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const shown = QUOTES.slice(start, start + PAGE_SIZE);

  const goRandom = () => setSpotlight(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  if (spotlight) {
    return (
      <View>
        <View style={[styles.quoteCard, { backgroundColor: theme.s1, borderColor: theme.border, borderLeftColor: theme.green }]}>
          <Text style={[styles.quoteLabel, { color: theme.muted }]}>Random Aphorism</Text>
          <Text style={[styles.quoteText, { color: theme.text }]}>&quot;{spotlight.text}&quot;</Text>
          {spotlight.attr && <Text style={[styles.quoteAttr, { color: theme.muted }]}>— {spotlight.attr}</Text>}
        </View>
        <View style={styles.spotlightActions}>
          <Pressable onPress={goRandom} style={[styles.randomBtn, { backgroundColor: theme.s2, borderColor: theme.border }]}>
            <Text style={[styles.randomBtnText, { color: theme.text }]}>🎲 Another</Text>
          </Pressable>
          <Pressable onPress={() => setSpotlight(null)} hitSlop={6}>
            <Text style={[styles.backText, { color: theme.muted }]}>Back to list</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.toolbar}>
        <Pressable disabled={page === 0} onPress={() => setPage((p) => Math.max(0, p - 1))} style={{ opacity: page === 0 ? 0.35 : 1 }} hitSlop={6}>
          <Icon name="left" size={14} color={theme.muted} />
        </Pressable>
        <Text style={[styles.pageLabel, { color: theme.muted }]}>
          {start + 1}–{Math.min(start + PAGE_SIZE, QUOTES.length)} of {QUOTES.length}
        </Text>
        <Pressable
          disabled={page >= totalPages - 1}
          onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          style={{ opacity: page >= totalPages - 1 ? 0.35 : 1 }}
          hitSlop={6}
        >
          <Icon name="right" size={14} color={theme.muted} />
        </Pressable>
        <Pressable onPress={goRandom} style={[styles.randomBtn, styles.randomBtnAuto, { backgroundColor: theme.s2, borderColor: theme.border }]}>
          <Text style={[styles.randomBtnText, { color: theme.text }]}>🎲 Random</Text>
        </Pressable>
      </View>
      <View style={styles.list}>
        {shown.map((q, i) => (
          <View key={start + i} style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowText, { color: theme.text }]}>
              &quot;{q.text}&quot;
              {q.attr ? <Text style={[styles.rowAttr, { color: theme.muted }]}> — {q.attr}</Text> : null}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  pageLabel: { fontSize: 12, fontVariant: ['tabular-nums'] },
  randomBtn: { paddingVertical: 6, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1 },
  randomBtnAuto: { marginLeft: 'auto' },
  randomBtnText: { fontSize: 12.5, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 20 },
  row: { paddingVertical: 11, borderBottomWidth: 1 },
  rowText: { fontSize: 13, fontStyle: 'italic', lineHeight: 20.2 },
  rowAttr: { fontStyle: 'normal', fontSize: 12 },
  quoteCard: {
    marginHorizontal: 20,
    marginTop: 14,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 16,
    borderWidth: 1,
    borderLeftWidth: 2,
    borderRadius: radii.card,
  },
  quoteLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 },
  quoteText: { fontSize: 13.5, fontStyle: 'italic', lineHeight: 21.6 },
  quoteAttr: { fontSize: 11, marginTop: 7 },
  spotlightActions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 20 },
  backText: { fontSize: 11, fontWeight: '500' },
});
