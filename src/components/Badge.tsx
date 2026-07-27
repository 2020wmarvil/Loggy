import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function Badge({ label, background, color }: { label: string; background: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
