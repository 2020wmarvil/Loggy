import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { TimeStepperField } from '@/components/TimeStepperField';
import { formatTime12 } from '@/lib/routine';
import { useRoutine } from '@/store/useRoutine';
import { useTheme } from '@/theme/ThemeContext';
import { radii, weight650 } from '@/theme/tokens';

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DLET: Record<number, string> = { 0: 'Su', 1: 'Mo', 2: 'Tu', 3: 'We', 4: 'Th', 5: 'Fr', 6: 'Sa' };
const DFULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ScheduleEditor() {
  const theme = useTheme();
  const { getDay, updateItem, deleteItem, addItem, sortDay } = useRoutine();
  const todayDow = new Date().getDay();
  const [selDow, setSelDow] = useState(todayDow);
  const [editing, setEditing] = useState(false);
  const items = getDay(selDow);

  const toggleEditing = () => {
    if (editing) sortDay(selDow);
    setEditing((e) => !e);
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>Daily Schedule</Text>
        <Pressable
          onPress={toggleEditing}
          style={[
            styles.editBtn,
            { backgroundColor: editing ? theme.greenDim : theme.s2, borderColor: editing ? theme.greenMid : theme.border },
          ]}
        >
          <Icon name={editing ? 'check' : 'pencil'} size={12} color={editing ? theme.green : theme.muted} />
          <Text style={[styles.editBtnText, { color: editing ? theme.green : theme.muted }]}>{editing ? 'Done' : 'Edit'}</Text>
        </Pressable>
      </View>

      <View style={styles.dayPills}>
        {DAY_ORDER.map((d) => {
          const isSel = selDow === d;
          const isToday = d === todayDow;
          return (
            <Pressable
              key={d}
              onPress={() => setSelDow(d)}
              style={[
                styles.dayPill,
                {
                  backgroundColor: isSel ? theme.s2 : theme.s1,
                  borderColor: isToday ? theme.greenMid : isSel ? theme.border2 : theme.border,
                },
              ]}
            >
              <Text style={[styles.dayPillLabel, { color: isSel ? theme.text : theme.muted }]}>{DLET[d]}</Text>
              <View style={[styles.dayPillDot, { backgroundColor: isToday ? theme.green : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: theme.s1, borderColor: theme.border }]}>
        {editing ? (
          <View>
            {items.map((item, idx) => (
              <View
                key={item.id}
                style={[styles.editRow, idx < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
              >
                <TimeStepperField
                  time={item.time}
                  onChange={(v) => updateItem(selDow, idx, 'time', v)}
                  onClose={() => sortDay(selDow)}
                />
                <TextInput
                  value={item.activity}
                  onChangeText={(v) => updateItem(selDow, idx, 'activity', v)}
                  placeholder="Activity"
                  placeholderTextColor={theme.muted2}
                  style={[styles.input, styles.inputGrow, { backgroundColor: theme.s2, borderColor: theme.border2, color: theme.text }]}
                />
                <Pressable onPress={() => deleteItem(selDow, idx)} style={styles.delBtn} hitSlop={6}>
                  <Icon name="x" size={14} color={theme.muted} />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={() => addItem(selDow)} style={[styles.addBtn, { borderColor: theme.border2 }]}>
              <Text style={[styles.addBtnText, { color: theme.muted }]}>+ Add item</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.muted }]}>No items for {DFULL[selDow]}.</Text>
        ) : (
          items.map((item, idx) => (
            <View
              key={item.id}
              style={[styles.viewRow, idx < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
            >
              <Text style={[styles.viewName, { color: theme.text }]}>{item.activity}</Text>
              <Text style={[styles.viewTime, { color: theme.muted }]}>{formatTime12(item.time)}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: weight650, letterSpacing: -0.32, flex: 1 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1 },
  editBtnText: { fontSize: 12, fontWeight: '600' },
  dayPills: { flexDirection: 'row', gap: 5, marginBottom: 12 },
  dayPill: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  dayPillLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  dayPillDot: { width: 4, height: 4, borderRadius: 2 },
  card: { borderRadius: radii.card, borderWidth: 1, overflow: 'hidden' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 },
  input: { fontSize: 12.5, borderRadius: 6, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 8 },
  inputGrow: { flex: 1 },
  delBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  addBtn: { margin: 10, padding: 9, borderRadius: radii.sm, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  addBtnText: { fontSize: 12.5, fontWeight: '500' },
  emptyText: { padding: 16, fontSize: 12.5 },
  viewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, paddingHorizontal: 14 },
  viewName: { fontSize: 13, fontWeight: '500' },
  viewTime: { fontSize: 12.5, fontVariant: ['tabular-nums'] },
});
