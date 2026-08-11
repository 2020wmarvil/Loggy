import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useAppData } from '@/store/AppDataContext';
import { NotesFontSize } from '@/data/types';
import { toDateStr } from '@/lib/date';
import {
  cancelAphorismNotifications,
  cancelRoutineNotifications,
  requestNotificationPermission,
  rescheduleMorningAphorisms,
  rescheduleRoutineNotifications,
  scheduleMorningAphorisms,
  scheduleRoutineNotifications,
} from '@/lib/notifications';

export function useSettings() {
  const {
    settings,
    setSettings,
    routine,
    notificationIds,
    setNotificationIds,
    aphorisms,
    aphorismNotificationIds,
    setAphorismNotificationIds,
    aphorismNotifScheduledDate,
    setAphorismNotifScheduledDate,
  } = useAppData();

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
      const aphIds = await scheduleMorningAphorisms(routine, aphorisms);
      setAphorismNotificationIds(aphIds);
      setAphorismNotifScheduledDate(toDateStr(new Date()));
    } else {
      await cancelRoutineNotifications(notificationIds);
      setNotificationIds({});
      await cancelAphorismNotifications(aphorismNotificationIds);
      setAphorismNotificationIds({});
      setAphorismNotifScheduledDate(null);
    }
    setSettings((s) => ({ ...s, notifEnabled: next }));
  }, [
    settings.notifEnabled,
    routine,
    notificationIds,
    setNotificationIds,
    aphorisms,
    aphorismNotificationIds,
    setAphorismNotificationIds,
    setAphorismNotifScheduledDate,
    setSettings,
  ]);

  // Keep scheduled notifications in sync whenever the routine (or the linked
  // aphorisms) is edited while alerts are enabled. Debounced so that typing
  // in an activity/time field doesn't reschedule on every keystroke —
  // without this, rapid overlapping reschedules race on setNotificationIds
  // (last write wins) and orphan the losing batches, which still fire since
  // nothing ever cancels them.
  useEffect(() => {
    if (!settings.notifEnabled) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        const [ids, aphIds] = await Promise.all([
          rescheduleRoutineNotifications(notificationIds, routine),
          rescheduleMorningAphorisms(aphorismNotificationIds, routine, aphorisms),
        ]);
        if (cancelled) {
          await Promise.all([cancelRoutineNotifications(ids), cancelAphorismNotifications(aphIds)]);
          return;
        }
        setNotificationIds(ids);
        setAphorismNotificationIds(aphIds);
        setAphorismNotifScheduledDate(toDateStr(new Date()));
      })();
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.notifEnabled, routine, aphorisms]);

  // The aphorism window is a fixed number of days precomputed in advance
  // (see scheduleMorningAphorisms) — it drains as days pass, and nothing
  // else touches it while the app sits in the background. Top it back up
  // whenever the app is reopened on a day it hasn't already been refreshed.
  useEffect(() => {
    if (!settings.notifEnabled) return;
    const refreshIfStale = async () => {
      const today = toDateStr(new Date());
      if (aphorismNotifScheduledDate === today) return;
      const aphIds = await rescheduleMorningAphorisms(aphorismNotificationIds, routine, aphorisms);
      setAphorismNotificationIds(aphIds);
      setAphorismNotifScheduledDate(today);
    };
    refreshIfStale();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshIfStale();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.notifEnabled]);

  return { settings, setAccent, toggleWeather, toggleNotifications, setNotesFontSize };
}
