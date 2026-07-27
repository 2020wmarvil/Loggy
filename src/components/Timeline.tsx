import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { RoutineItem } from '@/data/types';
import { useTheme } from '@/theme/ThemeContext';
import { radii } from '@/theme/tokens';

interface TimelineProps {
  items: RoutineItem[];
  checks?: Record<string, boolean>;
  onToggle?: (id: string) => void;
}

// Ports the prototype's embedded "Today's Schedule" timeline. Completed
// items always use the primary accent (green), matching the actual
// component — routine tag colors aren't rendered here.
export function Timeline({ items, checks, onToggle }: TimelineProps) {
  const theme = useTheme();
  return (
    <View>
      {items.map((item, i) => {
        const done = !!checks?.[item.id];
        const isLast = i === items.length - 1;
        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.left}>
              <Text style={[styles.time, { color: theme.muted }]}>{item.time}</Text>
            </View>
            <View style={styles.rail}>
              <View
                style={[
                  styles.node,
                  { backgroundColor: done ? theme.green : theme.bg, borderColor: done ? theme.green : theme.border2 },
                ]}
              />
              {!isLast && <View style={[styles.line, { backgroundColor: theme.border }]} />}
            </View>
            <View style={styles.body}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.s1, borderColor: theme.border, opacity: done ? 0.5 : 1 },
                ]}
              >
                <View style={styles.cardMain}>
                  <Text style={[styles.activity, { color: theme.text }]}>{item.activity}</Text>
                </View>
                {onToggle && (
                  <Pressable
                    hitSlop={6}
                    onPress={() => onToggle(item.id)}
                    style={[
                      styles.check,
                      { borderColor: done ? theme.green : theme.border2, backgroundColor: done ? theme.green : 'transparent' },
                    ]}
                  >
                    {done && <Icon name="check" size={12} color={theme.white} strokeWidth={2.5} />}
                  </Pressable>
                )}
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
  left: { width: 42, flexShrink: 0 },
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
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
