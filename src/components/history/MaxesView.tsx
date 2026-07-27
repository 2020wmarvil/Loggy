import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MaxEntry } from '@/data/types';
import { fmtShort, toDateStr } from '@/lib/date';
import { useMaxes } from '@/store/useMaxes';
import { useTheme } from '@/theme/ThemeContext';
import { radii, weight650 } from '@/theme/tokens';

type Draft = { name: string; weight: number; date: string };

export function MaxesView() {
  const theme = useTheme();
  const { maxes, add, update, remove } = useMaxes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: '', weight: 0, date: '' });

  const beginNew = () => {
    const id = add();
    setEditingId(id);
    setDraft({ name: '', weight: 0, date: toDateStr(new Date()) });
  };

  const beginEdit = (m: MaxEntry) => {
    setEditingId(m.id);
    setDraft({ name: m.name, weight: m.weight, date: m.date });
  };

  const save = (id: string) => {
    update(id, draft);
    setEditingId(null);
  };

  const cancel = (m: MaxEntry) => {
    if (!m.name.trim()) remove(m.id);
    setEditingId(null);
  };

  return (
    <View>
      <View style={styles.toolbar}>
        <Pressable onPress={beginNew} style={[styles.newBtn, { backgroundColor: theme.greenMid }]}>
          <Text style={[styles.newBtnText, { color: theme.green }]}>+ New max</Text>
        </Pressable>
      </View>

      {maxes.length === 0 ? (
        <Text style={[styles.empty, { color: theme.muted }]}>No maxes recorded yet.</Text>
      ) : (
        <View style={styles.list}>
          {maxes.map((m) => {
            const isEditing = editingId === m.id;
            return (
              <View key={m.id} style={[styles.card, { backgroundColor: theme.s1, borderColor: theme.border }]}>
                {isEditing ? (
                  <View>
                    <View style={styles.editGrid}>
                      <TextInput
                        value={draft.name}
                        onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
                        placeholder="Exercise name"
                        placeholderTextColor={theme.muted2}
                        autoFocus
                        style={[styles.input, styles.inputGrow, { backgroundColor: theme.s2, borderColor: theme.border2, color: theme.text }]}
                      />
                      <View style={styles.weightRow}>
                        <TextInput
                          value={String(draft.weight)}
                          onChangeText={(v) => setDraft((d) => ({ ...d, weight: Number(v.replace(/[^0-9.]/g, '')) || 0 }))}
                          keyboardType="numeric"
                          style={[styles.input, styles.inputNum, { backgroundColor: theme.s2, borderColor: theme.border2, color: theme.text }]}
                        />
                        <Text style={[styles.lbsLabel, { color: theme.muted }]}>lbs</Text>
                      </View>
                      <TextInput
                        value={draft.date}
                        onChangeText={(v) => setDraft((d) => ({ ...d, date: v }))}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={theme.muted2}
                        style={[styles.input, { backgroundColor: theme.s2, borderColor: theme.border2, color: theme.text }]}
                      />
                    </View>
                    <View style={styles.editActions}>
                      <Pressable onPress={() => save(m.id)} style={[styles.submitBtn, { backgroundColor: theme.green }]}>
                        <Text style={styles.submitBtnText}>Save</Text>
                      </Pressable>
                      <Pressable onPress={() => cancel(m)}>
                        <Text style={[styles.actionText, { color: theme.muted }]}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={() => remove(m.id)} style={styles.deleteAction}>
                        <Text style={[styles.actionText, { color: theme.red }]}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => beginEdit(m)} style={styles.viewRow}>
                    <View>
                      <Text style={[styles.name, { color: theme.text }]}>{m.name || 'Untitled'}</Text>
                      <Text style={[styles.date, { color: theme.muted }]}>{fmtShort(m.date)}</Text>
                    </View>
                    <Text style={[styles.weight, { color: theme.green }]}>
                      {m.weight}
                      <Text style={[styles.weightUnit, { color: theme.muted }]}> lbs</Text>
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4, alignItems: 'flex-end' },
  newBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  newBtnText: { fontSize: 12.5, fontWeight: '600' },
  empty: { padding: 40, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingTop: 10, gap: 8 },
  card: { borderRadius: radii.card, borderWidth: 1, padding: 14 },
  viewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 14, fontWeight: '600', letterSpacing: -0.14 },
  date: { fontSize: 11.5, marginTop: 2 },
  weight: { fontSize: 19, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.38 },
  weightUnit: { fontSize: 11, fontWeight: '500' },
  editGrid: { gap: 8 },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { fontSize: 12.5, borderRadius: radii.sm, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10 },
  inputGrow: { flex: 1 },
  inputNum: { width: 90 },
  lbsLabel: { fontSize: 11.5 },
  editActions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10 },
  submitBtn: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20 },
  submitBtnText: { fontSize: 12, fontWeight: '600', color: '#000' },
  actionText: { fontSize: 11, fontWeight: '500' },
  deleteAction: { marginLeft: 'auto' },
});
