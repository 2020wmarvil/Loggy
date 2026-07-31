import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RoutineItem } from '@/data/types';
import { formatTime12, isTimePast } from '@/lib/routine';
import { useTheme } from '@/theme/ThemeContext';
import { radii } from '@/theme/tokens';

interface TimelineProps {
  items: RoutineItem[];
  now: Date;
}

// Ports the prototype's embedded "Today's Schedule" timeline. Status moves
// through each item's window automatically based on the clock — there's
// nothing here for the user to tap or toggle. An item is "current" while
// `now` falls between its time and the next item's (or indefinitely, for
// the last item of the day), and "done" once the next item's time arrives.
export function Timeline({ items, now }: TimelineProps) {
  const theme = useTheme();
  return (
    <View>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const started = isTimePast(item.time, now);
        const ended = !isLast && isTimePast(items[i + 1].time, now);
        const isCurrent = started && !ended;
        const isDone = started && ended;

        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.left}>
              <Text style={[styles.time, { color: isCurrent ? theme.green : theme.muted }]}>
                {formatTime12(item.time)}
              </Text>
            </View>
            <View style={styles.rail}>
              <View
                style={[
                  styles.node,
                  isDone
                    ? { backgroundColor: theme.green, borderColor: theme.green }
                    : { backgroundColor: theme.bg, borderColor: isCurrent ? theme.green : theme.border2 },
                ]}
              />
              {!isLast && <View style={[styles.line, { backgroundColor: theme.border }]} />}
            </View>
            <View style={styles.body}>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: isCurrent ? theme.greenDim : theme.s1,
                    borderColor: isCurrent ? theme.greenMid : theme.border,
                    opacity: isDone ? 0.5 : 1,
                  },
                ]}
              >
                <View style={styles.cardMain}>
                  <Text
                    style={[
                      styles.activity,
                      { color: theme.text },
                      isDone && styles.activityDone,
                    ]}
                  >
                    {item.activity}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 13 },
  left: { width: 58, flexShrink: 0 },
  time: { fontSize: 11, fontWeight: '500', fontVariant: ['tabular-nums'], paddingTop: 14 },
  rail: { alignItems: 'center', flexShrink: 0, alignSelf: 'stretch' },
  node: { width: 11, height: 11, borderRadius: 5.5, borderWidth: 2, marginTop: 15 },
  line: { width: 2, flex: 1, marginTop: 4 },
  body: { flex: 1, paddingTop: 8, paddingBottom: 10, minWidth: 0 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardMain: { flex: 1, minWidth: 0 },
  activity: { fontSize: 13.5, fontWeight: '500', letterSpacing: -0.14 },
  activityDone: { textDecorationLine: 'line-through' },
});
