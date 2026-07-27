import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Logs } from '@/data/types';
import { fmtShort } from '@/lib/date';
import { groupByWeek } from '@/lib/progression';
import { useLiftingProgram } from '@/store/useLiftingProgram';
import { getSession } from '@/lib/progression';
import { useTheme } from '@/theme/ThemeContext';
import { radii, weight650 } from '@/theme/tokens';

export function LogView({ logs }: { logs: Logs }) {
  const theme = useTheme();
  const { program } = useLiftingProgram();
  const weeks = groupByWeek(logs);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (!weeks.length) {
    return <Text style={[styles.empty, { color: theme.muted }]}>No sessions logged yet.</Text>;
  }

  return (
    <View style={styles.wrap}>
      {weeks.map((w) => (
        <View key={w.key} style={styles.weekBlock}>
          <Text style={[styles.weekLabel, { color: theme.muted }]}>{w.label}</Text>
          {w.entries.map((e) => {
            const sess = getSession(program, e.sessionId);
            const k = `${e.date}-${e.programId}-${e.sessionId}`;
            const isOpen = open[k];
            const totalSets = Object.values(e.exercises || {}).flat().length;
            return (
              <View key={k} style={[styles.entry, { backgroundColor: theme.s1, borderColor: theme.border }]}>
                <Pressable style={styles.entryHead} onPress={() => setOpen((p) => ({ ...p, [k]: !p[k] }))}>
                  <View style={styles.entryLeft}>
                    <View style={[styles.dot, { backgroundColor: theme.green }]} />
                    <View>
                      <Text style={[styles.name, { color: theme.text }]}>{program.name} · {sess?.name}</Text>
                      <Text style={[styles.date, { color: theme.muted }]}>{fmtShort(e.date)}</Text>
                    </View>
                  </View>
                  <View style={styles.entryRight}>
                    <Text style={[styles.setCount, { color: theme.muted }]}>{totalSets} sets</Text>
                    <View style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>
                      <Icon name="chev" size={14} color={theme.muted} />
                    </View>
                  </View>
                </Pressable>
                {isOpen && (
                  <View style={[styles.sets, { borderTopColor: theme.border }]}>
                    {sess?.exercises.map((ex) => {
                      const s = e.exercises?.[ex.id] || [];
                      if (!s.length) return null;
                      return (
                        <View key={ex.id} style={[styles.exBlock, { borderBottomColor: theme.border }]}>
                          <Text style={[styles.exName, { color: theme.text }]}>{ex.name}</Text>
                          <View style={styles.pills}>
                            {s.map((set, i) => (
                              <View key={i} style={[styles.pill, { backgroundColor: theme.s2 }]}>
                                <Text style={[styles.pillText, { color: theme.muted }]}>
                                  {ex.type === 'weighted' ? `${set.weight}×${set.reps}` : ex.type === 'time' ? `${set.reps}${ex.unit || 's'}` : `×${set.reps}`}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 14 },
  empty: { padding: 40, textAlign: 'center' },
  weekBlock: { marginBottom: 18 },
  weekLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 9 },
  entry: { borderRadius: radii.card, borderWidth: 1, marginBottom: 7, overflow: 'hidden' },
  entryHead: { padding: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryLeft: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  name: { fontSize: 13.5, fontWeight: '600' },
  date: { fontSize: 11.5, marginTop: 1 },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  setCount: { fontSize: 12 },
  sets: { paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1 },
  exBlock: { paddingVertical: 8, borderBottomWidth: 1 },
  exName: { fontSize: 12.5, fontWeight: '500', marginBottom: 5 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pill: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  pillText: { fontSize: 11, fontVariant: ['tabular-nums'] },
});
