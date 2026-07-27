import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LiftingEditor } from '@/components/LiftingEditor';
import { ScheduleEditor } from '@/components/ScheduleEditor';
import { ACCENTS, AccentKey } from '@/theme/colors';
import { useSettings } from '@/store/useSettings';
import { useTheme } from '@/theme/ThemeContext';
import { radii, tabBarHeight } from '@/theme/tokens';

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, setAccent, toggleWeather, toggleNotifications } = useSettings();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: tabBarHeight + 16 }}>
        <View style={[styles.prefCard, { backgroundColor: theme.s1, borderColor: theme.border }]}>
          <View style={[styles.prefRow, { borderBottomColor: theme.border }]}>
            <View style={styles.prefText}>
              <Text style={[styles.prefLabel, { color: theme.text }]}>Schedule alerts</Text>
              <Text style={[styles.prefDesc, { color: theme.muted }]}>Notify when moving between schedule blocks</Text>
            </View>
            <Toggle on={settings.notifEnabled} onPress={toggleNotifications} theme={{ green: theme.green, border2: theme.border2 }} />
          </View>
          <View style={[styles.prefRow, { borderBottomColor: theme.border }]}>
            <View style={styles.prefText}>
              <Text style={[styles.prefLabel, { color: theme.text }]}>Weather widget</Text>
              <Text style={[styles.prefDesc, { color: theme.muted }]}>Show today&apos;s forecast on the Today tab</Text>
            </View>
            <Toggle on={settings.showWeather} onPress={toggleWeather} theme={{ green: theme.green, border2: theme.border2 }} />
          </View>
          <View style={styles.accentRow}>
            {(Object.entries(ACCENTS) as [AccentKey, (typeof ACCENTS)[AccentKey]][]).map(([key, a]) => (
              <Pressable
                key={key}
                onPress={() => setAccent(key)}
                style={[
                  styles.swatch,
                  { backgroundColor: a.hex, borderColor: settings.accent === key ? theme.text : 'transparent' },
                ]}
              />
            ))}
          </View>
        </View>

        <ScheduleEditor />
        <LiftingEditor />
      </ScrollView>
    </View>
  );
}

function Toggle({ on, onPress, theme }: { on: boolean; onPress: () => void; theme: { green: string; border2: string } }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.toggle, { backgroundColor: on ? theme.green : theme.border2 }]}
    >
      <View style={[styles.toggleThumb, on && styles.toggleThumbOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingTop: 22 },
  title: { fontSize: 27, fontWeight: '700', letterSpacing: -0.945 },
  prefCard: { borderRadius: radii.card, borderWidth: 1, marginBottom: 22, overflow: 'hidden' },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: 1 },
  prefText: { flex: 1 },
  prefLabel: { fontSize: 13, fontWeight: '500' },
  prefDesc: { fontSize: 11.5, marginTop: 2, lineHeight: 15.4 },
  accentRow: { paddingVertical: 13, paddingHorizontal: 14, flexDirection: 'row', gap: 11, flexWrap: 'wrap' },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 2 },
  toggle: { width: 34, height: 18, borderRadius: 9, justifyContent: 'center' },
  toggleThumb: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', marginLeft: 2 },
  toggleThumbOn: { marginLeft: 18 },
});
