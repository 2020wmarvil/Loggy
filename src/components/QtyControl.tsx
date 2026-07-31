import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';
import { radii } from '@/theme/tokens';

interface QtyControlProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}

export function QtyControl({ value, onChange, min = 0, max = 9999, step = 1, unit, disabled }: QtyControlProps) {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: theme.s2, borderColor: theme.border, opacity: disabled ? 0.55 : 1 }]}>
      <Pressable hitSlop={8} disabled={disabled} onPress={() => onChange(Math.max(min, value - step))}>
        <Text style={[styles.btn, { color: theme.muted }]}>−</Text>
      </Pressable>
      <Text style={[styles.val, { color: theme.text }]}>{value}</Text>
      {unit ? <Text style={[styles.unit, { color: theme.muted }]}>{unit}</Text> : null}
      <Pressable hitSlop={8} disabled={disabled} onPress={() => onChange(Math.min(max, value + step))}>
        <Text style={[styles.btn, { color: theme.muted }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.sm,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderWidth: 1,
  },
  btn: {
    width: 20,
    height: 20,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '300',
    lineHeight: 20,
  },
  val: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 28,
    textAlign: 'center',
  },
  unit: {
    fontSize: 10.5,
  },
});
