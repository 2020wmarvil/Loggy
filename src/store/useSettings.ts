import { useCallback, useEffect } from 'react';

import { useAppData } from '@/store/AppDataContext';
import { NotesFontSize } from '@/data/types';
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
  const setNotesFontSize = useCallback(
    (notesFontSize: NotesFontSize) => setSettings((s) => ({ ...s, notesFontSize })),
    [setSettings]
  );

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
  // while alerts are enabled (adding/removing/retiming items). Debounced so
  // that typing in an activity/time field doesn't reschedule on every
  // keystroke — without this, rapid overlapping reschedules race on
  // setNotificationIds (last write wins) and orphan the losing batches,
  // which still fire since nothing ever cancels them.
  useEffect(() => {
    if (!settings.notifEnabled) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        const ids = await rescheduleRoutineNotifications(notificationIds, routine);
        if (cancelled) {
          await cancelRoutineNotifications(ids);
          return;
        }
        setNotificationIds(ids);
      })();
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.notifEnabled, routine]);

  return { settings, setAccent, toggleWeather, toggleNotifications, setNotesFontSize };
}
