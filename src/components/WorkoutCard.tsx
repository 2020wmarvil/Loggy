import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { ProgressBar } from '@/components/ProgressBar';
import { Program, Session, LogEntry } from '@/data/types';
import { LastLog, calcGoal } from '@/lib/progression';
import { Theme } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import { radii, weight650 } from '@/theme/tokens';

interface WorkoutCardProps {
  program: Program;
  session: Session;
  lastLog: LastLog | null;
  todayLog?: LogEntry;
  onPress: () => void;
}

export function WorkoutCard({ program, session, lastLog, todayLog, onPress }: WorkoutCardProps) {
  const theme = useTheme();
  const completedSets = todayLog ? Object.values(todayLog.exercises || {}).flat().length : 0;
  const totalSets = session.exercises.reduce((a, e) => a + e.sets, 0);
  const progress = todayLog?.completed ? 1 : totalSets ? completedSets / totalSets : 0;
  const started = completedSets > 0 && !todayLog?.completed;
  const accent = theme.green;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}>
      <View
        style={[
          styles.body,
          { backgroundColor: theme.s1, borderColor: todayLog?.completed ? accent : theme.border },
        ]}
      >
        <View style={styles.top}>
          <View>
            <Text style={[styles.name, { color: theme.text }]}>{program.name}</Text>
            <Text style={[styles.day, { color: theme.muted }]}>{session.name}</Text>
          </View>
          {todayLog?.completed ? (
            <Badge label="Done ✓" background={theme.greenDim} color={accent} />
          ) : started ? (
            <Badge label="In progress" background={theme.s3} color={theme.muted} />
          ) : null}
        </View>

        <LiftingPreview session={session} lastLog={lastLog} accent={accent} theme={theme} />

        <View style={[styles.foot, { borderTopColor: theme.border }]}>
          <View style={styles.barWrap}>
            <ProgressBar progress={progress} color={accent} />
            <Text style={[styles.barLabel, { color: theme.muted }]}>
              {todayLog?.completed
                ? 'Complete'
                : started
                  ? `${completedSets} / ${totalSets} sets`
                  : `${session.exercises.length} exercises`}
            </Text>
          </View>
          <View style={[styles.goBtn, { backgroundColor: todayLog?.completed ? theme.s3 : theme.greenMid }]}>
            <Text style={[styles.goBtnText, { color: todayLog?.completed ? theme.muted : accent }]}>
              {todayLog?.completed ? 'Review' : started ? 'Continue →' : 'Start →'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function LiftingPreview({
  session,
  lastLog,
  accent,
  theme,
}: {
  session: Session;
  lastLog: LastLog | null;
  accent: string;
  theme: Theme;
}) {
  return (
    <View>
      {session.exercises.map((ex, i) => {
        const g = calcGoal(ex, lastLog);
        const goalText =
          ex.type === 'weighted'
            ? `${ex.sets}×${g.targetReps} @ ${g.weight} lbs`
            : ex.type === 'time'
              ? `${ex.sets}×${g.targetReps}${ex.unit || 's'}`
              : `${ex.sets}×${g.targetReps}`;
        return (
          <View
            key={ex.id}
            style={[
              styles.exRow,
              i < session.exercises.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.border2 } : null,
            ]}
          >
            <Text style={[styles.exName, { color: theme.muted }]}>{ex.name}</Text>
            <Text style={[styles.exGoal, { color: theme.muted2 }]}>
              {goalText}
              {g.progressed ? <Text style={{ color: accent }}> ↑</Text> : null}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  body: { borderRadius: radii.card, borderWidth: 1, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 14 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 13 },
  name: { fontSize: 16, fontWeight: weight650, letterSpacing: -0.02 * 16 },
  day: { fontSize: 12, marginTop: 2 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 3 },
  exName: { fontSize: 12.5 },
  exGoal: { fontSize: 11.5, fontVariant: ['tabular-nums'] },
  foot: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  barWrap: { flex: 1 },
  barLabel: { fontSize: 10.5, marginTop: 5 },
  goBtn: { paddingVertical: 7, paddingHorizontal: 15, borderRadius: 20 },
  goBtnText: { fontSize: 12.5, fontWeight: '600' },
});
