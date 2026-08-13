import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  LiftingProgram: '@loggy/lifting_program',
  Routine: '@loggy/routine',
  Logs: '@loggy/logs',
  Settings: '@loggy/settings',
  Notes: '@loggy/notes',
  Philosophy: '@loggy/philosophy',
  Maxes: '@loggy/maxes',
  NotificationIds: '@loggy/notification_ids',
  AphorismNotificationIds: '@loggy/aphorism_notification_ids',
  AphorismNotifScheduledDate: '@loggy/aphorism_notif_scheduled_date',
  Aphorisms: '@loggy/aphorisms',
  AphorismSheetUrl: '@loggy/aphorism_sheet_url',
  AphorismSyncedAt: '@loggy/aphorism_synced_at',
  NotifLog: '@loggy/notif_log',
} as const;

// Mirrors the prototype's localStorage-per-key model: one JSON blob per
// domain, hydrated once on mount and written through on every update.
export function useAsyncStorageState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);
  // Chains writes so a slow in-flight write can never resolve after (and clobber)
  // a newer one — AsyncStorage.setItem calls fired back-to-back on native have no
  // ordering guarantee otherwise.
  const writeQueue = useRef(Promise.resolve());
  // If the user edits before the initial read resolves, the read is stale by
  // the time it lands — applying it would silently roll back their edit.
  const hasLocalUpdate = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (cancelled || hasLocalUpdate.current) return;
        if (raw != null) setValue(JSON.parse(raw));
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
      hasLocalUpdate.current = true;
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        const payload = JSON.stringify(resolved);
        writeQueue.current = writeQueue.current.then(() => AsyncStorage.setItem(key, payload).catch(() => {}));
        return resolved;
      });
    },
    [key]
  );

  return [value, update, hydrated] as const;
}
