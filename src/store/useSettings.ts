import { useCallback, useEffect } from 'react';

import { useAppData } from '@/store/AppDataContext';
import {
  cancelRoutineNotifications,
  requestNotificationPermission,
  rescheduleRoutineNotifications,
  scheduleRoutineNotifications,
} from '@/lib/notifications';

export function useSettings() {
  const { settings, setSettings, routine, notificationIds, setNotificationIds } = useAppData();

  const setAccent = useCallback((accent: string) => setSettings((s) => ({ ...s, accent })), [setSettings]);
  const toggleWeather = useCallback(() => setSettings((s) => ({ ...s, showWeather: !s.showWeather })), [setSettings]);

  const toggleNotifications = useCallback(async () => {
    const next = !settings.notifEnabled;
    if (next) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      const ids = await scheduleRoutineNotifications(routine);
      setNotificationIds(ids);
    } else {
      await cancelRoutineNotifications(notificationIds);
      setNotificationIds({});
    }
    setSettings((s) => ({ ...s, notifEnabled: next }));
  }, [settings.notifEnabled, routine, notificationIds, setNotificationIds, setSettings]);

  // Keep scheduled notifications in sync whenever the routine is edited
  // while alerts are enabled (adding/removing/retiming items).
  useEffect(() => {
    if (!settings.notifEnabled) return;
    let cancelled = false;
    (async () => {
      const ids = await rescheduleRoutineNotifications(notificationIds, routine);
      if (!cancelled) setNotificationIds(ids);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.notifEnabled, routine]);

  return { settings, setAccent, toggleWeather, toggleNotifications };
}
