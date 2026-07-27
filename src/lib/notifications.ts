import * as Notifications from 'expo-notifications';

import { RoutineData } from '@/data/types';
import { getRoutineForDay } from '@/lib/routine';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
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
  try {
    for (let dow = 0; dow <= 6; dow++) {
      for (const item of getRoutineForDay(routine, dow)) {
        const [hourStr, minuteStr] = item.time.split(':');
        const hour = Number(hourStr);
        const minute = Number(minuteStr);
        if (Number.isNaN(hour) || Number.isNaN(minute)) continue;
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
