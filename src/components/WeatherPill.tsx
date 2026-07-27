import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeContext';
import { fetchTodayWeather, WeatherData } from '@/lib/weather';

export function WeatherPill() {
  const theme = useTheme();
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTodayWeather().then((w) => {
      if (!cancelled) setWeather(w);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!weather) return null;

  const iconName = weather.condition === 'sunny' ? 'sun' : weather.condition === 'rainy' ? 'rain' : 'cloud';

  return (
    <View style={styles.row}>
      <Icon name={iconName} size={16} color={theme.muted} />
      <Text style={[styles.hilo, { color: theme.text }]}>
        {weather.high}° / {weather.low}°
      </Text>
      <Text style={[styles.precip, { color: theme.muted }]}>{weather.precip}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexShrink: 0,
  },
  hilo: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  precip: {
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
});
