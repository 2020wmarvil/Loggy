import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { DAYS_S, MONTHS_S, parseDate, toDateStr } from '@/lib/date';
import { useTheme } from '@/theme/ThemeContext';
import { radii, weight650 } from '@/theme/tokens';

interface DatePickerFieldProps {
  date: string; // YYYY-MM-DD, may be empty
  onChange: (date: string) => void;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Tap-to-open month-grid calendar. Kept as a small hand-rolled widget (like
// TimeStepperField's wheel) rather than a native date-picker library, since
// this app also targets web and native date pickers don't have web support.
export function DatePickerField({ date, onChange }: DatePickerFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(date ? parseDate(date) : new Date()));

  const openPicker = () => {
    setViewMonth(startOfMonth(date ? parseDate(date) : new Date()));
    setOpen(true);
  };

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const numDays = daysInMonth(year, month);
  const todayStr = toDateStr(new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectDay = (d: number) => {
    onChange(toDateStr(new Date(year, month, d)));
    setOpen(false);
  };

  const selected = date ? parseDate(date) : null;

  return (
    <View>
      <Pressable
        onPress={openPicker}
        style={[styles.pill, { backgroundColor: theme.s2, borderColor: theme.border2 }]}
      >
        <Text style={[styles.pillText, { color: date ? theme.text : theme.muted2 }]}>
          {selected ? `${MONTHS_S[selected.getMonth()]} ${selected.getDate()}, ${selected.getFullYear()}` : 'Select date'}
        </Text>
      </Pressable>
      <Modal transparent visible={open} animationType="none" onRequestClose={() => setOpen(false)}>
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={() => setOpen(false)} />
          <View style={styles.centerWrap} pointerEvents="box-none">
            <View style={[styles.card, { backgroundColor: theme.s1, borderColor: theme.border }]}>
              <View style={styles.monthRow}>
                <Pressable onPress={() => setViewMonth(new Date(year, month - 1, 1))} hitSlop={8} style={styles.navBtn}>
                  <Text style={[styles.navBtnText, { color: theme.muted }]}>‹</Text>
                </Pressable>
                <Text style={[styles.monthLabel, { color: theme.text }]}>
                  {MONTHS_S[month]} {year}
                </Text>
                <Pressable onPress={() => setViewMonth(new Date(year, month + 1, 1))} hitSlop={8} style={styles.navBtn}>
                  <Text style={[styles.navBtnText, { color: theme.muted }]}>›</Text>
                </Pressable>
              </View>
              <View style={styles.weekdayRow}>
                {DAYS_S.map((w) => (
                  <Text key={w} style={[styles.weekdayText, { color: theme.muted }]}>
                    {w[0]}
                  </Text>
                ))}
              </View>
              <View style={styles.grid}>
                {cells.map((d, i) => {
                  if (d == null) return <View key={i} style={styles.cell} />;
                  const cellDateStr = toDateStr(new Date(year, month, d));
                  const isSelected = cellDateStr === date;
                  const isToday = cellDateStr === todayStr;
                  return (
                    <Pressable key={i} onPress={() => selectDay(d)} style={styles.cell}>
                      <View
                        style={[
                          styles.dayCircle,
                          isSelected && { backgroundColor: theme.green },
                          !isSelected && isToday && { borderWidth: 1.5, borderColor: theme.greenMid },
                        ]}
                      >
                        <Text style={[styles.dayText, { color: isSelected ? theme.white : theme.text }]}>{d}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CELL_SIZE = 38;

const styles = StyleSheet.create({
  pill: { alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10 },
  pillText: { fontSize: 12.5, fontVariant: ['tabular-nums'], fontWeight: '500' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.6)' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { borderRadius: radii.card, borderWidth: 1, padding: 16, width: CELL_SIZE * 7 + 32 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthLabel: { fontSize: 15, fontWeight: weight650, letterSpacing: -0.15 },
  navBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 20, fontWeight: '600' },
  weekdayRow: { flexDirection: 'row' },
  weekdayText: { width: CELL_SIZE, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 13, fontVariant: ['tabular-nums'], fontWeight: '500' },
});
