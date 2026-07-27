import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MiniChart } from '@/components/MiniChart';
import { Logs } from '@/data/types';
import { fmtShort } from '@/lib/date';
import { calcVolume, getExerciseHistory, getPRs } from '@/lib/progression';
import { useLiftingProgram } from '@/store/useLiftingProgram';
import { useTheme } from '@/theme/ThemeContext';
import { radii, weight650 } from '@/theme/tokens';

export function ProgressView({ logs }: { logs: Logs }) {
  const theme = useTheme();
  const { program } = useLiftingProgram();

  const uniqueExes = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const s of program.sessions) {
      for (const ex of s.exercises) {
        if (!seen.has(ex.id)) {
          seen.add(ex.id);
          list.push({ id: ex.id, name: ex.name });
        }
      }
    }
    return list;
  }, [program]);

  const [exId, setExId] = useState<string | undefined>(uniqueExes[0]?.id);
  const ex = uniqueExes.find((e) => e.id === exId) || uniqueExes[0];
  const hist = useMemo(() => (ex ? getExerciseHistory(logs, program, ex.id) : []), [logs, program, ex]);
  const prs = useMemo(() => getPRs(logs), [logs]);
  const pr = ex ? prs[`${program.id}/${ex.id}`] : undefined;

  if (!uniqueExes.length) {
    return <Text style={[styles.empty, { color: theme.muted }]}>No exercises yet.</Text>;
  }

  const recent = hist.slice(-12).reverse();

  return (
    <View>
      <View style={styles.filterRow}>
        {uniqueExes.map((e) => {
          const on = e.id === exId;
          return (
            <Pressable
              key={e.id}
              onPress={() => setExId(e.id)}
              style={[styles.chip, { backgroundColor: on ? theme.s2 : theme.s1, borderColor: on ? theme.border2 : theme.border }]}
            >
              <Text style={[styles.chipText, { color: on ? theme.text : theme.muted }]}>{e.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {pr && (
        <View style={[styles.prCard, { backgroundColor: theme.greenDim, borderColor: theme.greenMid }]}>
          <Text style={[styles.prLabel, { color: theme.green }]}>PERSONAL RECORD</Text>
          <Text style={[styles.prVal, { color: theme.text }]}>
            {pr.weight} lbs × {pr.reps}
          </Text>
          <Text style={[styles.prDate, { color: theme.muted }]}>{fmtShort(pr.date)}</Text>
        </View>
      )}

      {hist.length > 1 && <MiniChart data={hist} color={theme.green} />}

      {recent.length > 0 && (
        <View style={[styles.table, { borderColor: theme.border }]}>
          <View style={[styles.row, { backgroundColor: theme.s2, borderBottomColor: theme.border }]}>
            <Text style={[styles.cell, styles.headerText, { color: theme.muted }]}>Date</Text>
            <Text style={[styles.cellNarrow, styles.headerText, { color: theme.muted }]}>Weight</Text>
            <Text style={[styles.cell, styles.headerText, { color: theme.muted }]}>Reps / Vol</Text>
          </View>
          {recent.map((h, i) => {
            const isPR = !!pr && h.date === pr.date;
            const bestReps = Math.max(...h.sets.map((s) => s.reps));
            const vol = calcVolume(h.sets);
            const weight = h.sets[0]?.weight ?? 0;
            return (
              <View
                key={h.date}
                style={[
                  styles.row,
                  { backgroundColor: isPR ? theme.prHighlight : 'transparent', borderBottomColor: theme.border },
                  i === recent.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={[styles.cell, { color: theme.text }]}>
                  {fmtShort(h.date)}
                  {isPR ? <Text style={{ color: theme.yellow }}> ★</Text> : null}
                </Text>
                <Text style={[styles.cellNarrow, { color: theme.text }]}>{weight}</Text>
                <Text style={[styles.cell, { color: theme.text }]}>
                  {bestReps} / {vol}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { padding: 40, textAlign: 'center' },
  filterRow: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: radii.sm, borderWidth: 1 },
  chipText: { fontSize: 12.5 },
  prCard: { marginHorizontal: 20, padding: 14, borderRadius: radii.card, borderWidth: 1 },
  prLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 0.7 },
  prVal: { fontSize: 19, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  prDate: { fontSize: 11.5, marginTop: 2 },
  table: { marginHorizontal: 20, marginTop: 12, borderRadius: radii.card, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1 },
  cell: { flex: 1, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  cellNarrow: { width: 60, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  headerText: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
});
