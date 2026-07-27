import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LogView } from '@/components/history/LogView';
import { MaxesView } from '@/components/history/MaxesView';
import { ProgressView } from '@/components/history/ProgressView';
import { SubTabs } from '@/components/SubTabs';
import { useLogs } from '@/store/useLogs';
import { useTheme } from '@/theme/ThemeContext';
import { tabBarHeight } from '@/theme/tokens';

type SubTab = 'log' | 'progress' | 'maxes';

export default function HistoryScreen() {
  const theme = useTheme();
  const { logs } = useLogs();
  const [subtab, setSubtab] = useState<SubTab>('log');

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: theme.text }]}>History</Text>
      </View>
      <SubTabs
        tabs={[
          { id: 'log', label: 'Log' },
          { id: 'progress', label: 'Progress' },
          { id: 'maxes', label: 'Maxes' },
        ]}
        active={subtab}
        onChange={setSubtab}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}>
        {subtab === 'log' && <LogView logs={logs} />}
        {subtab === 'progress' && <ProgressView logs={logs} />}
        {subtab === 'maxes' && <MaxesView />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingTop: 22 },
  title: { fontSize: 27, fontWeight: '700', letterSpacing: -0.945 },
});
