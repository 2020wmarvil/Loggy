import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Quote } from '@/data/types';
import { fmtRelativeTime } from '@/lib/date';
import { useAphorisms } from '@/store/useAphorisms';
import { useTheme } from '@/theme/ThemeContext';
import { radii } from '@/theme/tokens';

const PAGE_SIZE = 20;

export function AphorismsView() {
  const theme = useTheme();
  const { aphorisms, sheetUrl, syncedAt, hydrated, syncing, error, link, sync, unlink } = useAphorisms();
  const [page, setPage] = useState(0);
  const [spotlight, setSpotlight] = useState<Quote | null>(null);
  const [linking, setLinking] = useState(false);
  const [draftUrl, setDraftUrl] = useState('');

  useEffect(() => {
    if (hydrated && sheetUrl) sync({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const totalPages = Math.ceil(aphorisms.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const shown = aphorisms.slice(start, start + PAGE_SIZE);

  const goRandom = () => setSpotlight(aphorisms[Math.floor(Math.random() * aphorisms.length)]);

  const submitLink = async () => {
    const url = draftUrl.trim();
    if (!url) return;
    const ok = await link(url);
    if (ok) {
      setDraftUrl('');
      setLinking(false);
    }
  };

  if (!sheetUrl) {
    return (
      <View style={styles.linkWrap}>
        {linking ? (
          <View>
            <TextInput
              value={draftUrl}
              onChangeText={setDraftUrl}
              placeholder="Paste Google Sheet link…"
              placeholderTextColor={theme.muted2}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.urlInput, { backgroundColor: theme.s2, borderColor: theme.border2, color: theme.text }]}
            />
            <Text style={[styles.helper, { color: theme.muted }]}>
              Sheet must be shared as &quot;Anyone with the link can view&quot;. Column A = aphorism, column B =
              attribution — the first row is treated as a header and skipped.
            </Text>
            {error && <Text style={[styles.error, { color: theme.red }]}>{error}</Text>}
            <View style={styles.linkActions}>
              <Pressable
                onPress={submitLink}
                disabled={syncing}
                style={[styles.submitBtn, { backgroundColor: theme.green, opacity: syncing ? 0.6 : 1 }]}
              >
                <Text style={styles.submitBtnText}>{syncing ? 'Linking…' : 'Link'}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setLinking(false);
                  setDraftUrl('');
                }}
              >
                <Text style={[styles.actionText, { color: theme.muted }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Text style={[styles.empty, { color: theme.muted }]}>No aphorisms yet — link a Google Sheet to import them.</Text>
            <Pressable onPress={() => setLinking(true)} style={[styles.newBtn, { backgroundColor: theme.greenMid }]}>
              <Text style={[styles.newBtnText, { color: theme.green }]}>Link Google Sheet</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

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
      <View style={styles.syncRow}>
        <Text style={[styles.syncText, { color: theme.muted }]}>
          {syncing ? 'Syncing…' : syncedAt ? `Synced ${fmtRelativeTime(syncedAt)}` : 'Not synced yet'}
        </Text>
        <View style={styles.syncActions}>
          <Pressable onPress={() => sync()} disabled={syncing} hitSlop={6}>
            <Text style={[styles.syncActionText, { color: theme.green }]}>Sync now</Text>
          </Pressable>
          <Pressable onPress={unlink} hitSlop={6}>
            <Text style={[styles.syncActionText, { color: theme.red }]}>Unlink</Text>
          </Pressable>
        </View>
      </View>
      {error && <Text style={[styles.error, styles.errorInline, { color: theme.red }]}>{error}</Text>}

      {aphorisms.length === 0 ? (
        <Text style={[styles.empty, { color: theme.muted }]}>This sheet doesn&apos;t have any aphorisms yet.</Text>
      ) : (
        <>
          <View style={styles.toolbar}>
            <Pressable disabled={page === 0} onPress={() => setPage((p) => Math.max(0, p - 1))} style={{ opacity: page === 0 ? 0.35 : 1 }} hitSlop={6}>
              <Icon name="left" size={14} color={theme.muted} />
            </Pressable>
            <Text style={[styles.pageLabel, { color: theme.muted }]}>
              {start + 1}–{Math.min(start + PAGE_SIZE, aphorisms.length)} of {aphorisms.length}
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { padding: 40, textAlign: 'center', fontSize: 13.5 },
  linkWrap: { paddingHorizontal: 20, paddingTop: 20 },
  newBtn: { marginTop: 14, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  newBtnText: { fontSize: 12.5, fontWeight: '600' },
  urlInput: { fontSize: 13.5, borderRadius: radii.sm, borderWidth: 1, padding: 10 },
  helper: { fontSize: 11.5, lineHeight: 17, marginTop: 8 },
  error: { fontSize: 12, marginTop: 8 },
  errorInline: { paddingHorizontal: 20 },
  linkActions: { flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 12 },
  submitBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  submitBtnText: { fontSize: 12.5, fontWeight: '600', color: '#000' },
  actionText: { fontSize: 12, fontWeight: '500' },
  syncRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14 },
  syncText: { fontSize: 11.5 },
  syncActions: { flexDirection: 'row', gap: 14 },
  syncActionText: { fontSize: 12, fontWeight: '600' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
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
