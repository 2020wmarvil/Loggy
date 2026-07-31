import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { QuoteCard } from '@/components/QuoteCard';
import { Timeline } from '@/components/Timeline';
import { WeatherPill } from '@/components/WeatherPill';
import { WorkoutCard } from '@/components/WorkoutCard';
import { toDateStr, fmtDate } from '@/lib/date';
import { getLastLog, getTodaySchedule } from '@/lib/progression';
import { getRoutineForDay, isTimePast } from '@/lib/routine';
import { useLiftingProgram } from '@/store/useLiftingProgram';
import { useLogs } from '@/store/useLogs';
import { useRoutine } from '@/store/useRoutine';
import { useSettings } from '@/store/useSettings';
import { useTheme } from '@/theme/ThemeContext';
import { tabBarHeight } from '@/theme/tokens';

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayStr = toDateStr(today);

  const { program } = useLiftingProgram();
  const { logs } = useLogs();
  const { routine } = useRoutine();
  const { settings } = useSettings();

  const schedule = getTodaySchedule(program, today);
  const routineItems = getRoutineForDay(routine, today.getDay());

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Today</Text>
          <Text style={[styles.sub, { color: theme.muted }]}>{fmtDate(today)}</Text>
        </View>
        {settings.showWeather && <WeatherPill />}
      </View>

      <QuoteCard today={today} />

      {routineItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.scheduleHeader}>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>Today&apos;s Schedule</Text>
            <Text style={[styles.scheduleCount, { color: theme.muted }]}>
              {routineItems.filter((i) => isTimePast(i.time, today)).length} / {routineItems.length}
            </Text>
          </View>
          <Timeline items={routineItems} now={today} />
        </View>
      )}

      {schedule.length === 0 ? (
        <View style={styles.restDay}>
          <Text style={styles.restEmoji}>🛋️</Text>
          <Text style={[styles.restTitle, { color: theme.text }]}>Rest day</Text>
          <Text style={[styles.restSub, { color: theme.muted }]}>Recovery is part of the program.</Text>
        </View>
      ) : (
        <View style={styles.cards}>
          {schedule.map(({ program: prog, session: sess }) => {
            const lastLog = getLastLog(logs, prog.id, sess.id, todayStr);
            const todayLog = logs[todayStr]?.[prog.id]?.[sess.id];
            return (
              <WorkoutCard
                key={`${prog.id}-${sess.id}`}
                program={prog}
                session={sess}
                lastLog={lastLog}
                todayLog={todayLog}
                onPress={() => router.push(`/logger/${prog.id}/${sess.id}`)}
              />
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 22 },
  title: { fontSize: 27, fontWeight: '700', letterSpacing: -0.945 },
  sub: { fontSize: 13, marginTop: 3 },
  section: { paddingHorizontal: 20, paddingTop: 18 },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  sectionLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.85, textTransform: 'uppercase' },
  scheduleCount: { fontSize: 11.5 },
  cards: { paddingHorizontal: 20, paddingTop: 14 },
  restDay: { paddingVertical: 60, paddingHorizontal: 20, alignItems: 'center' },
  restEmoji: { fontSize: 40, marginBottom: 12 },
  restTitle: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
  restSub: { fontSize: 13 },
});
