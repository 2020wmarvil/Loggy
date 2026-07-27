import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { NoteEntry } from '@/data/types';
import { fmtShort } from '@/lib/date';
import { useTheme } from '@/theme/ThemeContext';
import { radii, weight650 } from '@/theme/tokens';

interface EditableNotesListProps {
  list: NoteEntry[];
  startNew: () => string;
  save: (id: string, title: string, text: string) => void;
  remove: (id: string) => void;
  move: (idx: number, dir: 1 | -1) => void;
  emptyText: string;
  newLabel: string;
  placeholder: string;
}

export function EditableNotesList({ list, startNew, save, remove, move, emptyText, newLabel, placeholder }: EditableNotesListProps) {
  const theme = useTheme();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftText, setDraftText] = useState('');

  const beginNew = () => {
    const id = startNew();
    setEditingId(id);
    setDraftTitle('');
    setDraftText('');
  };

  const beginEdit = (n: NoteEntry) => {
    setEditingId(n.id);
    setDraftTitle(n.title || '');
    setDraftText(n.text);
  };

  const commit = (id: string) => {
    const text = draftText.trim();
    const title = draftTitle.trim();
    if (!text && !title) remove(id);
    else save(id, title, text);
    setEditingId(null);
  };

  const cancel = (n: NoteEntry) => {
    if (!n.text.trim() && !(n.title || '').trim()) remove(n.id);
    setEditingId(null);
  };

  return (
    <View>
      <View style={styles.toolbar}>
        <Pressable onPress={beginNew} style={[styles.newBtn, { backgroundColor: theme.greenMid }]}>
          <Text style={[styles.newBtnText, { color: theme.green }]}>{newLabel}</Text>
        </Pressable>
      </View>

      {list.length === 0 && editingId === null ? (
        <Text style={[styles.empty, { color: theme.muted }]}>{emptyText}</Text>
      ) : (
        <View style={styles.list}>
          {list.map((n, idx) => {
            const isEditing = editingId === n.id;
            return (
              <View key={n.id} style={[styles.card, { backgroundColor: theme.s1, borderColor: theme.border }]}>
                {isEditing ? (
                  <View>
                    <TextInput
                      value={draftTitle}
                      onChangeText={setDraftTitle}
                      placeholder="Title"
                      placeholderTextColor={theme.muted2}
                      autoFocus
                      style={[styles.titleInput, { backgroundColor: theme.s2, borderColor: theme.border2, color: theme.text }]}
                    />
                    <TextInput
                      value={draftText}
                      onChangeText={setDraftText}
                      placeholder={placeholder}
                      placeholderTextColor={theme.muted2}
                      multiline
                      style={[styles.textArea, { backgroundColor: theme.s2, borderColor: theme.border2, color: theme.text }]}
                    />
                    <View style={styles.editActions}>
                      <Pressable onPress={() => commit(n.id)} style={[styles.submitBtn, { backgroundColor: theme.green }]}>
                        <Text style={styles.submitBtnText}>Save</Text>
                      </Pressable>
                      <Pressable onPress={() => cancel(n)}>
                        <Text style={[styles.actionText, { color: theme.muted }]}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={() => remove(n.id)} style={styles.deleteAction}>
                        <Text style={[styles.actionText, { color: theme.red }]}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => beginEdit(n)}>
                    {!!n.title && <Text style={[styles.cardTitle, { color: theme.text }]}>{n.title}</Text>}
                    <Text style={[styles.cardText, { color: theme.text }]}>{n.text}</Text>
                    <View style={styles.meta}>
                      <Text style={[styles.metaDate, { color: theme.muted }]}>{fmtShort(n.updatedAt)}</Text>
                      <View style={styles.metaActions}>
                        <Pressable disabled={idx === 0} onPress={() => move(idx, -1)} hitSlop={6} style={{ opacity: idx === 0 ? 0.3 : 1 }}>
                          <View style={{ transform: [{ rotate: '-90deg' }] }}>
                            <Icon name="chev" size={12} color={theme.muted} strokeWidth={2} />
                          </View>
                        </Pressable>
                        <Pressable
                          disabled={idx === list.length - 1}
                          onPress={() => move(idx, 1)}
                          hitSlop={6}
                          style={{ opacity: idx === list.length - 1 ? 0.3 : 1 }}
                        >
                          <View style={{ transform: [{ rotate: '90deg' }] }}>
                            <Icon name="chev" size={12} color={theme.muted} strokeWidth={2} />
                          </View>
                        </Pressable>
                        <Pressable onPress={() => remove(n.id)} hitSlop={6}>
                          <Text style={[styles.actionText, { color: theme.red }]}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
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
  empty: { padding: 50, textAlign: 'center', fontSize: 13.5 },
  list: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, gap: 8 },
  card: { borderRadius: radii.card, borderWidth: 1, padding: 14 },
  cardTitle: { fontSize: 14.5, fontWeight: weight650, letterSpacing: -0.14, marginBottom: 5 },
  cardText: { fontSize: 13.5, lineHeight: 21.6 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 },
  metaDate: { fontSize: 11 },
  metaActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  actionText: { fontSize: 11, fontWeight: '500' },
  titleInput: { fontSize: 13.5, fontWeight: weight650, borderRadius: radii.sm, borderWidth: 1, padding: 8, marginBottom: 8 },
  textArea: { fontSize: 13.5, borderRadius: radii.sm, borderWidth: 1, padding: 10, minHeight: 80, textAlignVertical: 'top', lineHeight: 21 },
  editActions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
  submitBtn: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20 },
  submitBtnText: { fontSize: 12, fontWeight: '600', color: '#000' },
  deleteAction: { marginLeft: 'auto' },
});
