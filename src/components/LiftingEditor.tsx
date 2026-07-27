import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useLiftingProgram } from '@/store/useLiftingProgram';
import { Exercise, ExerciseType } from '@/data/types';
import { useTheme } from '@/theme/ThemeContext';
import { Theme } from '@/theme/colors';
import { radii, weight650 } from '@/theme/tokens';

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DLET: Record<number, string> = { 0: 'Su', 1: 'Mo', 2: 'Tu', 3: 'We', 4: 'Th', 5: 'Fr', 6: 'Sa' };
const DFULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EX_TYPES: ExerciseType[] = ['weighted', 'bodyweight', 'time'];
const TYPE_LABEL: Record<ExerciseType, string> = { weighted: 'Wt', bodyweight: 'BW', time: 'Time' };

export function LiftingEditor() {
  const theme = useTheme();
  const { program, addSession, removeSession, addExercise, updateExercise, deleteExercise } = useLiftingProgram();
  const todayDow = new Date().getDay();
  const [selDow, setSelDow] = useState(todayDow);
  const [editing, setEditing] = useState(false);
  const sess = program.sessions.find((s) => s.dayOfWeek === selDow);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>Lifting</Text>
        <Pressable
          onPress={() => setEditing((e) => !e)}
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
        {!sess ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: theme.muted, marginBottom: editing ? 10 : 0 }]}>
              No lifting session on {DFULL[selDow]}.
            </Text>
            {editing && (
              <Pressable
                onPress={() => addSession(selDow, DFULL[selDow])}
                style={[styles.addBtn, { margin: 0, borderColor: theme.border2 }]}
              >
                <Text style={[styles.addBtnText, { color: theme.muted }]}>+ Add session</Text>
              </Pressable>
            )}
          </View>
        ) : editing ? (
          <View>
            {sess.exercises.map((ex, exIdx) => (
              <ExerciseEditRow
                key={ex.id}
                ex={ex}
                theme={theme}
                isLast={exIdx === sess.exercises.length - 1}
                onChange={(field, val) => updateExercise(selDow, exIdx, field, val)}
                onDelete={() => deleteExercise(selDow, exIdx)}
              />
            ))}
            <Pressable onPress={() => addExercise(selDow)} style={[styles.addBtn, { borderColor: theme.border2 }]}>
              <Text style={[styles.addBtnText, { color: theme.muted }]}>+ Add exercise</Text>
            </Pressable>
            <Pressable onPress={() => removeSession(selDow)} style={styles.removeSessionBtn}>
              <Text style={[styles.removeSessionText, { color: theme.red }]}>Remove {DFULL[selDow]} session</Text>
            </Pressable>
          </View>
        ) : (
          sess.exercises.map((ex, idx) => (
            <View
              key={ex.id}
              style={[styles.viewRow, idx < sess.exercises.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
            >
              <View>
                <Text style={[styles.viewName, { color: theme.text }]}>{ex.name}</Text>
                <Text style={[styles.viewDetail, { color: theme.muted }]}>
                  {ex.sets} sets · {ex.repMin}–{ex.repMax} {ex.type === 'time' ? ex.unit || 's' : 'reps'}
                </Text>
              </View>
              {ex.type === 'weighted' && (
                <Text style={[styles.viewWeight, { color: theme.text }]}>{ex.startWeight} lbs</Text>
              )}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function ExerciseEditRow({
  ex,
  theme,
  isLast,
  onChange,
  onDelete,
}: {
  ex: Exercise;
  theme: Theme;
  isLast: boolean;
  onChange: (field: keyof Exercise, val: Exercise[keyof Exercise]) => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.exRow, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <View style={styles.exTop}>
        <TextInput
          value={ex.name}
          onChangeText={(v) => onChange('name', v)}
          placeholder="Exercise name"
          placeholderTextColor={theme.muted2}
          style={[styles.input, styles.inputGrow, { backgroundColor: theme.s2, borderColor: theme.border2, color: theme.text }]}
        />
        <Pressable onPress={onDelete} style={styles.delBtn} hitSlop={6}>
          <Icon name="x" size={14} color={theme.muted} />
        </Pressable>
      </View>
      <View style={styles.exNums}>
        <NumField label="Sets" value={ex.sets} onChange={(v) => onChange('sets', v)} theme={theme} />
        <NumField label="Min" value={ex.repMin} onChange={(v) => onChange('repMin', v)} theme={theme} />
        <NumField label="Max" value={ex.repMax} onChange={(v) => onChange('repMax', v)} theme={theme} />
        <NumField label="Incr" value={ex.increment} onChange={(v) => onChange('increment', v)} theme={theme} />
        <NumField label="Start" value={ex.startWeight} onChange={(v) => onChange('startWeight', v)} theme={theme} />
        <View style={styles.typeField}>
          <Text style={[styles.fieldLabel, { color: theme.muted2 }]}>Type</Text>
          <View style={styles.typeChips}>
            {EX_TYPES.map((t) => {
              const on = ex.type === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => onChange('type', t)}
                  style={[styles.typeChip, { backgroundColor: on ? theme.greenDim : theme.s2, borderColor: on ? theme.greenMid : theme.border2 }]}
                >
                  <Text style={[styles.typeChipText, { color: on ? theme.green : theme.muted }]}>{TYPE_LABEL[t]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function NumField({
  label,
  value,
  onChange,
  theme,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  theme: Theme;
}) {
  return (
    <View style={styles.numField}>
      <Text style={[styles.fieldLabel, { color: theme.muted2 }]}>{label}</Text>
      <TextInput
        value={String(value)}
        onChangeText={(v) => onChange(Number(v.replace(/[^0-9.]/g, '')) || 0)}
        keyboardType="numeric"
        style={[styles.input, styles.inputNum, { backgroundColor: theme.s2, borderColor: theme.border2, color: theme.text }]}
      />
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
  emptyWrap: { padding: 16 },
  emptyText: { fontSize: 12.5 },
  addBtn: { margin: 10, padding: 9, borderRadius: radii.sm, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  addBtnText: { fontSize: 12.5, fontWeight: '500' },
  removeSessionBtn: { alignItems: 'center', paddingVertical: 12 },
  removeSessionText: { fontSize: 12, fontWeight: '500' },
  exRow: { padding: 12, gap: 9 },
  exTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exNums: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' },
  input: { fontSize: 12.5, borderRadius: 6, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 8 },
  inputGrow: { flex: 1 },
  inputNum: { width: 48, textAlign: 'center' },
  delBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  numField: { gap: 3 },
  fieldLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  typeField: { gap: 3 },
  typeChips: { flexDirection: 'row', gap: 4 },
  typeChip: { paddingVertical: 6, paddingHorizontal: 7, borderRadius: 6, borderWidth: 1 },
  typeChipText: { fontSize: 11, fontWeight: '600' },
  viewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, paddingHorizontal: 14 },
  viewName: { fontSize: 13, fontWeight: '500' },
  viewDetail: { fontSize: 11, marginTop: 1 },
  viewWeight: { fontSize: 13, fontWeight: '600' },
});
