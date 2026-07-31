import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/ProgressBar';
import { QtyControl } from '@/components/QtyControl';
import { Exercise, LogEntry, Session } from '@/data/types';
import { toDateStr, fmtDate, formatDuration } from '@/lib/date';
import { calcGoal, getLastLog, getSession } from '@/lib/progression';
import { useLiftingProgram } from '@/store/useLiftingProgram';
import { useLogs } from '@/store/useLogs';
import { useTheme } from '@/theme/ThemeContext';
import { Theme } from '@/theme/colors';
import { radii, weight650 } from '@/theme/tokens';

function confirmFinish(onConfirm: () => void, remaining: number) {
  const message = `Finish this workout with ${remaining} set${remaining === 1 ? '' : 's'} not marked done?`;
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Finish workout?', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Finish', style: 'destructive', onPress: onConfirm },
  ]);
}

type SetInput = { reps: number; weight: number; done: boolean };
type Inputs = Record<string, Record<number, SetInput>>;

export default function WorkoutLoggerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { programId, sessionId } = useLocalSearchParams<{ programId: string; sessionId: string }>();
  const { program } = useLiftingProgram();
  const { logs, saveSession, hydrated } = useLogs();

  const today = useMemo(() => new Date(), []);
  const todayStr = toDateStr(today);
  const pid = String(programId);
  const sid = String(sessionId);
  const sess = getSession(program, sid);
  const existing = logs[todayStr]?.[pid]?.[sid];
  const lastLog = getLastLog(logs, pid, sid, todayStr);
  const readOnly = !!existing?.completed;

  const [inputs, setInputs] = useState<Inputs>(() => initInputs(sess, existing, lastLog));
  const [showDone, setShowDone] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // The session "starts" — and its timer begins — the first time it's opened
  // for the day. Waiting on `hydrated` avoids racing AsyncStorage's async read:
  // without it, a fresh app launch would see `existing` as undefined for a
  // moment and stamp a bogus new startedAt over a real one from earlier today.
  useEffect(() => {
    if (!hydrated || existing?.completed || existing?.startedAt) return;
    saveSession(todayStr, pid, sid, { startedAt: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const startedAtIso = existing?.startedAt;
  useEffect(() => {
    if (!startedAtIso || existing?.completed) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAtIso, existing?.completed]);

  const elapsedSeconds = existing?.completed
    ? existing.durationSeconds ?? 0
    : startedAtIso
      ? Math.max(0, Math.floor((nowTick - new Date(startedAtIso).getTime()) / 1000))
      : 0;

  if (!sess) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.text }}>Session not found.</Text>
      </View>
    );
  }

  const buildExercises = (current: Inputs): LogEntry['exercises'] => {
    const exercises: LogEntry['exercises'] = {};
    for (const ex of sess.exercises) {
      exercises[ex.id] = Object.values(current[ex.id] || {})
        .filter((s) => s.done)
        .map((s) => ({ reps: s.reps, weight: s.weight }));
    }
    return exercises;
  };

  const persist = (current: Inputs, patch: Partial<LogEntry> = {}) => {
    saveSession(todayStr, pid, sid, { exercises: buildExercises(current), ...patch });
  };

  const update = (exId: string, si: number, field: 'reps' | 'weight', val: number) => {
    if (readOnly) return;
    setInputs((p) => ({ ...p, [exId]: { ...p[exId], [si]: { ...p[exId][si], [field]: val } } }));
  };

  const toggle = (exId: string, si: number) => {
    if (readOnly) return;
    // Compute the next value from the current render's `inputs` and persist it as two
    // plain effects of this event handler — persisting from inside the setInputs updater
    // itself would call another component's setState mid-render, which React disallows.
    const next: Inputs = { ...inputs, [exId]: { ...inputs[exId], [si]: { ...inputs[exId][si], done: !inputs[exId][si].done } } };
    setInputs(next);
    persist(next, { completed: false });
  };

  const completedSets = sess.exercises.reduce((a, ex) => a + Object.values(inputs[ex.id] || {}).filter((s) => s.done).length, 0);
  const totalSets = sess.exercises.reduce((a, ex) => a + ex.sets, 0);
  const allDone = completedSets === totalSets;

  const handleBack = () => {
    if (!readOnly) persist(inputs, { completed: false });
    router.back();
  };

  const handleFinish = () => {
    persist(inputs, { completed: true, durationSeconds: elapsedSeconds });
    setShowDone(true);
  };

  const handleFinishPress = () => {
    if (allDone) handleFinish();
    else confirmFinish(handleFinish, totalSets - completedSets);
  };

  const accent = theme.green;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.headRow}>
        <Pressable onPress={handleBack} style={[styles.backBtn, { backgroundColor: theme.s2 }]}>
          <Icon name="back" size={17} color={theme.text} strokeWidth={2} />
        </Pressable>
        <View style={styles.headTitle}>
          <Text style={[styles.headName, { color: accent }]}>
            {program.name} · {sess.name}
          </Text>
          <Text style={[styles.headSub, { color: theme.muted }]}>
            {completedSets} / {totalSets} sets
          </Text>
        </View>
        <Text style={[styles.timerText, { color: readOnly ? theme.muted : accent }]}>{formatDuration(elapsedSeconds)}</Text>
      </View>

      <View style={styles.pbarWrap}>
        <ProgressBar progress={totalSets ? completedSets / totalSets : 0} color={accent} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: readOnly ? 32 : 96 }}>
        {sess.exercises.map((ex) => (
          <ExerciseBlock
            key={ex.id}
            ex={ex}
            lastLog={lastLog}
            inputs={inputs}
            onUpdate={update}
            onToggle={toggle}
            theme={theme}
            accent={accent}
            disabled={readOnly}
          />
        ))}
      </ScrollView>

      {!readOnly && (
        <View style={[styles.footer, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
          <Pressable onPress={handleFinishPress} style={[styles.finishBar, { backgroundColor: accent }]}>
            <Text style={styles.finishBarText}>Finish Workout</Text>
          </Pressable>
        </View>
      )}

      {showDone && (
        <View style={[styles.overlay, { backgroundColor: `${theme.bg}f5` }]}>
          <Text style={styles.overlayIcon}>🏋️</Text>
          <Text style={[styles.overlayTitle, { color: accent }]}>Session Done</Text>
          <Text style={[styles.overlaySub, { color: theme.muted }]}>
            {program.name} · {sess.name}
            {'\n'}
            {fmtDate(today)} · {formatDuration(elapsedSeconds)}
          </Text>
          <Pressable
            onPress={() => {
              setShowDone(false);
              router.back();
            }}
            style={[styles.overlayCta, { backgroundColor: theme.text }]}
          >
            <Text style={[styles.overlayCtaText, { color: theme.bg }]}>Back to Today</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function initInputs(sess: Session | undefined, existing: LogEntry | undefined, lastLog: ReturnType<typeof getLastLog>): Inputs {
  const inp: Inputs = {};
  if (!sess) return inp;
  for (const ex of sess.exercises) {
    const g = calcGoal(ex, lastLog);
    inp[ex.id] = {};
    for (let i = 0; i < ex.sets; i++) {
      const e = existing?.exercises?.[ex.id]?.[i];
      inp[ex.id][i] = e ? { reps: e.reps, weight: e.weight, done: true } : { reps: g.targetReps, weight: g.weight, done: false };
    }
  }
  return inp;
}

function ExerciseBlock({
  ex,
  lastLog,
  inputs,
  onUpdate,
  onToggle,
  theme,
  accent,
  disabled,
}: {
  ex: Exercise;
  lastLog: ReturnType<typeof getLastLog>;
  inputs: Inputs;
  onUpdate: (exId: string, si: number, field: 'reps' | 'weight', val: number) => void;
  onToggle: (exId: string, si: number) => void;
  theme: Theme;
  accent: string;
  disabled: boolean;
}) {
  const g = calcGoal(ex, lastLog);
  const lastSets = lastLog?.exercises?.[ex.id] || [];
  const lastWeight = lastSets[0]?.weight;

  return (
    <View style={[styles.exBlock, { backgroundColor: theme.s1, borderColor: theme.border }]}>
      <View style={[styles.exHead, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.exName, { color: theme.text }]}>{ex.name}</Text>
          <Text style={[styles.exMeta, { color: theme.muted }]}>
            {ex.type === 'time' ? `${ex.sets} sets · ${ex.repMax}${ex.unit || 's'}` : `${ex.sets} sets · ${ex.repMin}–${ex.repMax} reps`}
          </Text>
        </View>
        {g.progressed && (
          <View style={[styles.progTag, { backgroundColor: theme.greenDim }]}>
            <Text style={[styles.progTagText, { color: accent }]}>
              {ex.type === 'weighted' ? `↑ +${ex.increment} lbs` : '↑ Improved'}
            </Text>
          </View>
        )}
        {g.isNew && (
          <View style={[styles.progTag, { backgroundColor: theme.s3 }]}>
            <Text style={[styles.progTagText, { color: theme.muted }]}>First</Text>
          </View>
        )}
      </View>

      {!g.isNew && (
        <View style={[styles.goalStrip, { backgroundColor: theme.s2, borderBottomColor: theme.border }]}>
          <Text style={[styles.goalStripLabel, { color: theme.muted }]}>Last</Text>
          <Text style={[styles.goalStripVal, { color: theme.text }]}>
            {ex.type === 'weighted' ? `${lastWeight} lbs` : ''}
            {lastSets.length ? ` · ${lastSets.map((s) => s.reps).join(', ')}` : '—'}
          </Text>
          <Text style={[styles.goalStripArrow, { color: theme.muted2 }]}>→</Text>
          <Text style={[styles.goalStripLabel, { color: theme.muted }]}>Goal</Text>
          <Text style={[styles.goalStripVal, { color: g.progressed ? accent : theme.text }]}>
            {ex.type === 'weighted' ? `${g.weight} lbs · ${ex.repMin}–${ex.repMax}` : `${ex.repMax}${ex.unit || 's'}`}
          </Text>
        </View>
      )}

      {Array.from({ length: ex.sets }, (_, i) => {
        const s = inputs[ex.id]?.[i] || { reps: g.targetReps, weight: g.weight, done: false };
        const lastSet = lastSets[i];
        return (
          <View
            key={i}
            style={[
              styles.setRow,
              { borderBottomColor: theme.border, opacity: s.done ? 0.55 : 1 },
              i === ex.sets - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.setRowTop}>
              <Text style={[styles.setNum, { color: theme.muted }]}>S{i + 1}</Text>
              {lastSet && (
                <Text style={[styles.setLast, { color: theme.muted }]}>
                  Last: {ex.type === 'weighted' ? `${lastSet.weight}×${lastSet.reps}` : `${lastSet.reps}${ex.type === 'time' ? ex.unit || 's' : ''}`}
                  {'  →  '}
                  <Text style={{ color: theme.muted2 }}>
                    goal {g.targetReps}
                    {ex.type === 'time' ? ex.unit || 's' : ''}
                  </Text>
                </Text>
              )}
            </View>
            <View style={styles.setRowBottom}>
              <View style={styles.setInputs}>
                {ex.type === 'weighted' && (
                  <QtyControl value={s.weight} onChange={(v) => onUpdate(ex.id, i, 'weight', v)} step={2.5} unit="lbs" disabled={disabled} />
                )}
                <QtyControl
                  value={s.reps}
                  onChange={(v) => onUpdate(ex.id, i, 'reps', v)}
                  min={1}
                  unit={ex.type === 'time' ? ex.unit || 's' : 'reps'}
                  disabled={disabled}
                />
              </View>
              <Pressable
                onPress={() => onToggle(ex.id, i)}
                disabled={disabled}
                style={[styles.checkBtn, { borderColor: s.done ? accent : theme.border2, backgroundColor: s.done ? accent : 'transparent' }]}
              >
                {s.done && <Icon name="check" size={13} color={theme.white} strokeWidth={2.5} />}
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16 },
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  headTitle: { flex: 1 },
  headName: { fontSize: 17, fontWeight: weight650, letterSpacing: -0.34 },
  headSub: { fontSize: 11.5, marginTop: 1 },
  timerText: { fontSize: 15, fontWeight: weight650, fontVariant: ['tabular-nums'], letterSpacing: -0.15 },
  pbarWrap: { paddingHorizontal: 20, paddingTop: 10 },
  exBlock: { marginHorizontal: 20, marginTop: 14, borderRadius: radii.card, borderWidth: 1, overflow: 'hidden' },
  exHead: { padding: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  exName: { fontSize: 14.5, fontWeight: '600', letterSpacing: -0.22 },
  exMeta: { fontSize: 11, marginTop: 2 },
  progTag: { paddingVertical: 3, paddingHorizontal: 7, borderRadius: 8 },
  progTagText: { fontSize: 10.5, fontWeight: '600' },
  goalStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1 },
  goalStripLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 0.36, textTransform: 'uppercase' },
  goalStripVal: { fontSize: 12, fontVariant: ['tabular-nums'], fontWeight: '500' },
  goalStripArrow: { fontSize: 12 },
  setRow: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, gap: 6 },
  setRowTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  setNum: { fontSize: 11.5, fontWeight: '500' },
  setLast: { fontSize: 11, fontVariant: ['tabular-nums'] },
  setRowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  checkBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, borderTopWidth: 1 },
  finishBar: { paddingVertical: 14, borderRadius: radii.card, alignItems: 'center' },
  finishBarText: { fontSize: 15, fontWeight: '700', color: '#000' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 40 },
  overlayIcon: { fontSize: 56 },
  overlayTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.78 },
  overlaySub: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  overlayCta: { paddingVertical: 13, paddingHorizontal: 30, borderRadius: 22 },
  overlayCtaText: { fontSize: 14, fontWeight: '600' },
});
