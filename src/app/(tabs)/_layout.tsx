import { ColorValue, Platform } from 'react-native';
import { Tabs } from 'expo-router';

import { Icon, IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeContext';
import { tabBarHeight } from '@/theme/tokens';

export default function TabsLayout() {
  const theme = useTheme();

  const iconFor = (name: IconName) =>
    function TabIcon({ color }: { color: ColorValue }) {
      return <Icon name={name} color={String(color)} size={21} strokeWidth={1.7} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: theme.s1,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: tabBarHeight + (Platform.OS === 'ios' ? 20 : 0),
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '500', letterSpacing: 0.4 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: iconFor('today') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: iconFor('history') }} />
      <Tabs.Screen name="notes" options={{ title: 'Notes', tabBarIcon: iconFor('note') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: iconFor('gear') }} />
    </Tabs>
  );
}
