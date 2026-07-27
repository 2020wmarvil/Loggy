import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

interface SubTabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}

export function SubTabs<T extends string>({ tabs, active, onChange }: SubTabsProps<T>) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            style={[
              styles.pill,
              { borderColor: on ? theme.border2 : theme.border, backgroundColor: on ? theme.s2 : 'transparent' },
            ]}
          >
            <Text style={[styles.label, { color: on ? theme.text : theme.muted }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 14, gap: 4 },
  pill: { paddingVertical: 6, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1 },
  label: { fontSize: 12.5, fontWeight: '500' },
});
