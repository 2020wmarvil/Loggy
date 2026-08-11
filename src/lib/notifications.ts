import Constants from 'expo-constants';

import { Quote, RoutineData } from '@/data/types';
import { toDateStr } from '@/lib/date';
import { getDailyQuote } from '@/lib/progression';
import { getRoutineForDay, parseTime, timeToMinutes } from '@/lib/routine';

// expo-notifications registers a push-token-change listener as a top-level
// side effect of merely importing it, and that registration itself throws
// on Android in Expo Go (remote notifications were removed from Expo Go in
// SDK 53). So the module can't even be statically imported here — it must
// be required lazily, only when notifications are actually usable, or the
// throw happens during import and crashes every screen that (transitively)
// imports this file. A development build is required for real notification
// testing; this file is a no-op in Expo Go.
const notificationsAvailable = Constants.executionEnvironment !== 'storeClient';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Notifications: typeof import('expo-notifications') | null = notificationsAvailable
  ? require('expo-notifications')
  : null;

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch {
    return false;
  }
}

export async function cancelRoutineNotifications(ids: Record<string, string>): Promise<void> {
  if (!Notifications) return;
  try {
    await Promise.all(Object.values(ids).map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  } catch {
    // best-effort — nothing to do if cancellation isn't supported (e.g. web)
  }
}

// Schedules one weekly-repeating local notification per routine item so
// reminders fire even when the app isn't open. Returns the routine-item-id ->
// notification-id map to persist for later cancellation/rescheduling.
export async function scheduleRoutineNotifications(routine: RoutineData): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  if (!Notifications) return ids;
  try {
    for (let dow = 0; dow <= 6; dow++) {
      for (const item of getRoutineForDay(routine, dow)) {
        const parsed = parseTime(item.time);
        if (!parsed) continue;
        const { hour, minute } = parsed;
        const id = await Notifications.scheduleNotificationAsync({
          content: { title: 'Loggy', body: item.activity },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: dow + 1, // expo-notifications: 1 = Sunday
            hour,
            minute,
          },
        });
        ids[item.id] = id;
      }
    }
  } catch {
    // scheduling unavailable on this platform (e.g. web) — return what succeeded
  }
  return ids;
}

export async function rescheduleRoutineNotifications(
  prevIds: Record<string, string>,
  routine: RoutineData
): Promise<Record<string, string>> {
  await cancelRoutineNotifications(prevIds);
  return scheduleRoutineNotifications(routine);
}

// Local notifications can't compute their content at fire time, so an
// aphorism that changes daily can't be attached to a weekly-repeating
// trigger — that would show the same quote every occurrence forever.
// Instead this precomputes a rolling window of one-shot triggers, one per
// upcoming day that has a routine item, each carrying that specific day's
// quote. The window needs periodic refreshing as it drains (see useSettings).
const APHORISM_WINDOW_DAYS = 14;

export async function cancelAphorismNotifications(ids: Record<string, string>): Promise<void> {
  if (!Notifications) return;
  try {
    await Promise.all(Object.values(ids).map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  } catch {
    // best-effort — nothing to do if cancellation isn't supported (e.g. web)
  }
}

// Fires alongside the first routine notification of each day, pairing that
// day's aphorism with the day's earliest scheduled activity.
export async function scheduleMorningAphorisms(
  routine: RoutineData,
  aphorisms: Quote[],
  from: Date = new Date()
): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  if (!Notifications || !aphorisms.length) return ids;
  try {
    for (let d = 0; d < APHORISM_WINDOW_DAYS; d++) {
      const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + d);
      const items = getRoutineForDay(routine, date.getDay());
      if (!items.length) continue;
      const first = [...items].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))[0];
      const parsed = parseTime(first.time);
      if (!parsed) continue;
      const fireDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), parsed.hour, parsed.minute, 0, 0);
      if (fireDate.getTime() <= from.getTime()) continue;
      const quote = getDailyQuote(date, aphorisms);
      if (!quote) continue;
      const body = quote.attr ? `"${quote.text}" — ${quote.attr}` : `"${quote.text}"`;
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: "Today's Aphorism", body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
      });
      ids[toDateStr(date)] = id;
    }
  } catch {
    // scheduling unavailable on this platform (e.g. web) — return what succeeded
  }
  return ids;
}

export async function rescheduleMorningAphorisms(
  prevIds: Record<string, string>,
  routine: RoutineData,
  aphorisms: Quote[]
): Promise<Record<string, string>> {
  await cancelAphorismNotifications(prevIds);
  return scheduleMorningAphorisms(routine, aphorisms);
}
