import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { SetEntry } from '@/data/types';

interface MiniChartProps {
  data: { date: string; sets: SetEntry[] }[];
  color: string;
}

export function MiniChart({ data, color }: MiniChartProps) {
  const weights = data.map((d) => d.sets[0]?.weight || 0);
  if (weights.length === 0) return null;

  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const w = 340;
  const h = 60;
  const pad = 6;
  const denom = weights.length > 1 ? weights.length - 1 : 1;
  const pts: [number, number][] = weights.map((v, i) => [
    pad + (weights.length > 1 ? (i / denom) * (w - pad * 2) : (w - pad * 2) / 2),
    pad + (1 - (v - min) / range) * (h - pad * 2),
  ]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const first = pts[0];
  const last = pts[pts.length - 1];

  return (
    <View style={styles.wrap}>
      <Svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={`${path} L${last[0]},${h} L${first[0]},${h} Z`} fill="url(#cg)" />
        <Path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={2.5} fill={color} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, marginHorizontal: 20, height: 60 },
});
