import Constants from 'expo-constants';

import { Quote, RoutineData } from '@/data/types';
import { toDateStr } from '@/lib/date';
import { clearNotifLog, logNotifEvent } from '@/lib/notifLog';
import { getDailyQuote } from '@/lib/progression';
import { getRoutineForDay, parseTime } from '@/lib/routine';

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

// This module is a singleton that's only ever imported once per app
// process, so its load is a reliable "app just started" signal — reset the
// log here rather than carrying entries over from a previous run, which
// just makes today's log hard to read against yesterday's.
clearNotifLog().then(() => {
  logNotifEvent(
    notificationsAvailable
      ? `module loaded (executionEnvironment=${Constants.executionEnvironment})`
      : `module disabled — running in Expo Go (executionEnvironment=${Constants.executionEnvironment})`
  );
});

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

// Android 8+ requires every notification to belong to a channel, and on
// Android 13+ the OS won't even show the POST_NOTIFICATIONS permission
// prompt until at least one channel exists — so this has to run before
// requestPermissionsAsync, not just before scheduling.
const REMINDERS_CHANNEL_ID = 'reminders';

async function ensureNotificationChannel(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#27b24f',
    });
    logNotifEvent(`notification channel "${REMINDERS_CHANNEL_ID}" ensured`);
  } catch (err) {
    logNotifEvent(`ensureNotificationChannel failed: ${String(err)}`);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    await ensureNotificationChannel();
    const current = await Notifications.getPermissionsAsync();
    logNotifEvent(`getPermissionsAsync -> ${current.status}`);
    if (current.status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    logNotifEvent(`requestPermissionsAsync -> ${req.status}`);
    return req.status === 'granted';
  } catch (err) {
    logNotifEvent(`requestNotificationPermission failed: ${String(err)}`);
    return false;
  }
}

// Manual escape hatch for the alarm-cap scenario, independent of the
// auto-recovery in withAlarmCapRecovery below — cancels every alarm the app
// has registered with Android, including ones this app's own id-tracking
// has lost track of, without needing scheduling to fail first.
export async function clearAllScheduledNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    logNotifEvent('cleared all scheduled notifications (manual)');
  } catch (err) {
    logNotifEvent(`clearAllScheduledNotifications failed: ${String(err)}`);
  }
}

export async function cancelNotifications(ids: Record<string, string>): Promise<void> {
  if (!Notifications) return;
  try {
    await Promise.all(Object.values(ids).map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    logNotifEvent(`cancelled ${Object.keys(ids).length} notification(s)`);
  } catch (err) {
    logNotifEvent(`cancel failed for ${Object.keys(ids).length} notification(s): ${String(err)}`);
  }
}

// Android's AlarmManager hard-caps every app at 500 concurrently scheduled
// alarms. Cancelling only by tracked id can leave orphans behind (e.g. a
// batch that lost a setNotificationIds race before this reschedule guard
// existed), and those never get cleaned up because nothing remembers their
// id. If scheduling ever hits that cap, it means orphans have piled up —
// the only recovery is to wipe every alarm the app has, tracked or not, and
// reschedule the current batch from scratch.
const ALARM_CAP_ERROR = 'Maximum limit of concurrent alarms';

async function withAlarmCapRecovery<T>(label: string, run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (err) {
    if (!Notifications || !String(err).includes(ALARM_CAP_ERROR)) {
      logNotifEvent(`${label} failed: ${String(err)}`);
      return null;
    }
    logNotifEvent(`${label} hit Android's scheduled-alarm cap — clearing all scheduled notifications and retrying`);
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    try {
      return await run();
    } catch (err2) {
      logNotifEvent(`${label} retry after cap recovery failed: ${String(err2)}`);
      return null;
    }
  }
}

async function scheduleRoutineLoop(routine: RoutineData): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (let dow = 0; dow <= 6; dow++) {
    for (const item of getRoutineForDay(routine, dow)) {
      const parsed = parseTime(item.time);
      if (!parsed) continue;
      const { hour, minute } = parsed;
      const id = await Notifications!.scheduleNotificationAsync({
        content: { title: 'Loggy', body: item.activity },
        trigger: {
          type: Notifications!.SchedulableTriggerInputTypes.WEEKLY,
          channelId: REMINDERS_CHANNEL_ID,
          weekday: dow + 1, // expo-notifications: 1 = Sunday
          hour,
          minute,
        },
      });
      ids[item.id] = id;
    }
  }
  return ids;
}

// Schedules one weekly-repeating local notification per routine item so
// reminders fire even when the app isn't open. Returns the routine-item-id ->
// notification-id map to persist for later cancellation/rescheduling.
export async function scheduleRoutineNotifications(routine: RoutineData): Promise<Record<string, string>> {
  if (!Notifications) return {};
  const ids = await withAlarmCapRecovery('scheduleRoutineNotifications', () => scheduleRoutineLoop(routine));
  logNotifEvent(`scheduleRoutineNotifications scheduled ${ids ? Object.keys(ids).length : 0} item(s)`);
  return ids ?? {};
}

export async function rescheduleRoutineNotifications(
  prevIds: Record<string, string>,
  routine: RoutineData
): Promise<Record<string, string>> {
  await cancelNotifications(prevIds);
  return scheduleRoutineNotifications(routine);
}

// Local notifications can't compute their content at fire time, so an
// aphorism that changes daily can't be attached to a repeating trigger —
// that would show the same quote every occurrence forever. Instead this
// precomputes a rolling window of one-shot triggers, each carrying that
// day's quote, fired at a fixed time independent of the routine (so it never
// collides with a routine reminder). The window needs periodic refreshing as
// it drains — see the app-foreground sync in AppDataContext.
const APHORISM_WINDOW_DAYS = 7;
const APHORISM_HOUR = 6;
const APHORISM_MINUTE = 0;

async function scheduleAphorismsLoop(aphorisms: Quote[], from: Date): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (let d = 0; d < APHORISM_WINDOW_DAYS; d++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + d);
    const fireDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), APHORISM_HOUR, APHORISM_MINUTE, 0, 0);
    if (fireDate.getTime() <= from.getTime()) continue;
    const quote = getDailyQuote(date, aphorisms);
    if (!quote) continue;
    const body = quote.attr ? `"${quote.text}" — ${quote.attr}` : `"${quote.text}"`;
    const id = await Notifications!.scheduleNotificationAsync({
      content: { title: "Today's Aphorism", body },
      trigger: { type: Notifications!.SchedulableTriggerInputTypes.DATE, channelId: REMINDERS_CHANNEL_ID, date: fireDate },
    });
    ids[toDateStr(date)] = id;
  }
  return ids;
}

export async function scheduleMorningAphorisms(
  aphorisms: Quote[],
  from: Date = new Date()
): Promise<Record<string, string>> {
  if (!Notifications || !aphorisms.length) return {};
  const ids = await withAlarmCapRecovery('scheduleMorningAphorisms', () => scheduleAphorismsLoop(aphorisms, from));
  logNotifEvent(`scheduleMorningAphorisms scheduled ${ids ? Object.keys(ids).length : 0} item(s)`);
  return ids ?? {};
}

export async function rescheduleMorningAphorisms(
  prevIds: Record<string, string>,
  aphorisms: Quote[]
): Promise<Record<string, string>> {
  await cancelNotifications(prevIds);
  return scheduleMorningAphorisms(aphorisms);
}
