import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  LiftingProgram: '@loggy/lifting_program',
  Routine: '@loggy/routine',
  RoutineChecks: '@loggy/routine_checks',
  Logs: '@loggy/logs',
  Settings: '@loggy/settings',
  Notes: '@loggy/notes',
  Philosophy: '@loggy/philosophy',
  Maxes: '@loggy/maxes',
  NotificationIds: '@loggy/notification_ids',
} as const;

// Mirrors the prototype's localStorage-per-key model: one JSON blob per
// domain, hydrated once on mount and written through on every update.
export function useAsyncStorageState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!cancelled && raw != null) setValue(JSON.parse(raw));
      } catch {
        // corrupt or unavailable storage — fall back to the default value
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        AsyncStorage.setItem(key, JSON.stringify(resolved)).catch(() => {});
        return resolved;
      });
    },
    [key]
  );

  return [value, update, hydrated] as const;
}
