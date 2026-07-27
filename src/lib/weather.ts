import * as Location from 'expo-location';

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy';

export interface WeatherData {
  high: number;
  low: number;
  precip: number;
  condition: WeatherCondition;
}

function mapWeatherCode(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'sunny';
  if ([2, 3, 45, 48].includes(code)) return 'cloudy';
  return 'rainy';
}

// Free, keyless forecast API — https://open-meteo.com. Fails soft: any
// permission denial or network error just hides the weather widget.
export async function fetchTodayWeather(): Promise<WeatherData | null> {
  try {
    const perms = await Location.getForegroundPermissionsAsync();
    let granted = perms.status === Location.PermissionStatus.GRANTED;
    if (!granted) {
      const req = await Location.requestForegroundPermissionsAsync();
      granted = req.status === Location.PermissionStatus.GRANTED;
    }
    if (!granted) return null;

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const { latitude, longitude } = pos.coords;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      '&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&temperature_unit=fahrenheit&timezone=auto&forecast_days=1';
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const daily = json?.daily;
    if (!daily?.temperature_2m_max?.length) return null;

    return {
      high: Math.round(daily.temperature_2m_max[0]),
      low: Math.round(daily.temperature_2m_min[0]),
      precip: Math.round(daily.precipitation_probability_max?.[0] ?? 0),
      condition: mapWeatherCode(daily.weathercode?.[0] ?? 0),
    };
  } catch {
    return null;
  }
}
