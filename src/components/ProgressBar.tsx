import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

export function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { backgroundColor: theme.border2 }]}>
      <View style={[styles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
