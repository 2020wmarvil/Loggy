import Constants from 'expo-constants';

import { RoutineData } from '@/data/types';
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
