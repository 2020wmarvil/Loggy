import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAsyncStorageState, StorageKeys } from '@/lib/storage';
import { Session, RoutineData, Logs, Settings, NoteEntry, MaxEntry, Quote } from '@/data/types';
import {
  cancelNotifications,
  clearAllScheduledNotifications,
  requestNotificationPermission,
  rescheduleMorningAphorisms,
  rescheduleRoutineNotifications,
} from '@/lib/notifications';

type Updater<T> = (next: T | ((prev: T) => T)) => void;

interface AppDataContextValue {
  liftingSessions: Session[]; setLiftingSessions: Updater<Session[]>;
  routine: RoutineData; setRoutine: Updater<RoutineData>;
  logs: Logs; setLogs: Updater<Logs>;
  settings: Settings; setSettings: Updater<Settings>;
  notes: NoteEntry[]; setNotes: Updater<NoteEntry[]>;
  philosophy: NoteEntry[]; setPhilosophy: Updater<NoteEntry[]>;
  maxes: MaxEntry[]; setMaxes: Updater<MaxEntry[]>;
  notificationIds: Record<string, string>; setNotificationIds: Updater<Record<string, string>>;
  aphorismNotificationIds: Record<string, string>; setAphorismNotificationIds: Updater<Record<string, string>>;
  aphorisms: Quote[]; setAphorisms: Updater<Quote[]>;
  aphorismSheetUrl: string | null; setAphorismSheetUrl: Updater<string | null>;
  aphorismSyncedAt: string | null; setAphorismSyncedAt: Updater<string | null>;
  hydrated: boolean;
  toggleNotifications: () => Promise<void>;
  notifPending: boolean;
  clearAllNotifications: () => Promise<void>;
  notifClearing: boolean;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const SETTINGS_DEFAULTS: Settings = { notifEnabled: false, accent: 'green', showWeather: true, notesFontSize: 'medium' };

// Editing a routine item shouldn't reschedule on every keystroke.
const NOTIF_SYNC_DEBOUNCE_MS = 500;

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [liftingSessions, setLiftingSessions, h1] = useAsyncStorageState<Session[]>(StorageKeys.LiftingProgram, []);
  const [routine, setRoutine, h2] = useAsyncStorageState<RoutineData>(StorageKeys.Routine, {});
  const [logs, setLogs, h4] = useAsyncStorageState<Logs>(StorageKeys.Logs, {});
  const [settings, setSettings, h5] = useAsyncStorageState<Settings>(StorageKeys.Settings, SETTINGS_DEFAULTS);
  const [notes, setNotes, h6] = useAsyncStorageState<NoteEntry[]>(StorageKeys.Notes, []);
  const [philosophy, setPhilosophy, h7] = useAsyncStorageState<NoteEntry[]>(StorageKeys.Philosophy, []);
  const [maxes, setMaxes, h8] = useAsyncStorageState<MaxEntry[]>(StorageKeys.Maxes, []);
  const [notificationIds, setNotificationIds, h9] = useAsyncStorageState<Record<string, string>>(StorageKeys.NotificationIds, {});
  const [aphorismNotificationIds, setAphorismNotificationIds, h9b] = useAsyncStorageState<Record<string, string>>(StorageKeys.AphorismNotificationIds, {});
  const [aphorisms, setAphorisms, h10] = useAsyncStorageState<Quote[]>(StorageKeys.Aphorisms, []);
  const [aphorismSheetUrl, setAphorismSheetUrl, h11] = useAsyncStorageState<string | null>(StorageKeys.AphorismSheetUrl, null);
  const [aphorismSyncedAt, setAphorismSyncedAt, h12] = useAsyncStorageState<string | null>(StorageKeys.AphorismSyncedAt, null);

  // The sync effects below read these without listing them as deps —
  // listing them would create a feedback loop, since a successful
  // reschedule assigns fresh native ids, which would immediately re-trigger
  // the effect that just ran. Refs give the latest value without that loop.
  const notificationIdsRef = useRef(notificationIds);
  notificationIdsRef.current = notificationIds;
  const aphorismNotificationIdsRef = useRef(aphorismNotificationIds);
  aphorismNotificationIdsRef.current = aphorismNotificationIds;

  const [notifPendingRoutine, setNotifPendingRoutine] = useState(false);
  const [notifPendingAphorisms, setNotifPendingAphorisms] = useState(false);
  const notifPending = notifPendingRoutine || notifPendingAphorisms;

  // Routine and aphorism notifications are independent categories with
  // disjoint id sets, so each gets its own mutex rather than sharing one —
  // sharing one would mean an aphorism-window refresh could block a routine
  // reschedule (or vice versa) from ever running when both fire together
  // (e.g. right after enabling alerts).
  const routineSyncRef = useRef(false);
  const aphorismSyncRef = useRef(false);

  // Requests permission (must happen in direct response to the user's tap)
  // and flips the setting. All actual scheduling/cancelling happens in the
  // two sync effects below, which react to notifEnabled changing — so
  // there's exactly one place routine notifications get scheduled, and one
  // place aphorism notifications get scheduled, regardless of whether that
  // was triggered by this toggle, a routine edit, or an aphorisms sync.
  const toggleNotifications = useCallback(async () => {
    const next = !settings.notifEnabled;
    if (next) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    setSettings((s) => ({ ...s, notifEnabled: next }));
  }, [settings.notifEnabled, setSettings]);

  // Keeps scheduled routine reminders in sync with `routine` and with
  // whether alerts are enabled.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        if (routineSyncRef.current) return;
        routineSyncRef.current = true;
        setNotifPendingRoutine(true);
        try {
          if (settings.notifEnabled) {
            const ids = await rescheduleRoutineNotifications(notificationIdsRef.current, routine);
            if (cancelled) {
              await cancelNotifications(ids);
              return;
            }
            setNotificationIds(ids);
          } else {
            await cancelNotifications(notificationIdsRef.current);
            if (cancelled) return;
            setNotificationIds({});
          }
        } finally {
          routineSyncRef.current = false;
          setNotifPendingRoutine(false);
        }
      })();
    }, NOTIF_SYNC_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [settings.notifEnabled, routine, setNotificationIds]);

  // Keeps the rolling aphorism notification window in sync with `aphorisms`
  // and with whether alerts are enabled, and tops the window back up
  // whenever the app returns to the foreground — its one-shot notifications
  // drain as they fire (see APHORISM_WINDOW_DAYS in notifications.ts).
  // Always redoing the reschedule on foreground, rather than tracking
  // "did we already refresh today", is what keeps this correct: there's no
  // stale flag that can desync from reality and leave an outdated quote
  // sitting in an already-scheduled notification.
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      if (aphorismSyncRef.current) return;
      aphorismSyncRef.current = true;
      setNotifPendingAphorisms(true);
      try {
        if (settings.notifEnabled) {
          const ids = await rescheduleMorningAphorisms(aphorismNotificationIdsRef.current, aphorisms);
          if (cancelled) {
            await cancelNotifications(ids);
            return;
          }
          setAphorismNotificationIds(ids);
        } else {
          await cancelNotifications(aphorismNotificationIdsRef.current);
          if (cancelled) return;
          setAphorismNotificationIds({});
        }
      } finally {
        aphorismSyncRef.current = false;
        setNotifPendingAphorisms(false);
      }
    };
    const timer = setTimeout(sync, NOTIF_SYNC_DEBOUNCE_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.remove();
    };
  }, [settings.notifEnabled, aphorisms, setAphorismNotificationIds]);

  const [notifClearing, setNotifClearing] = useState(false);

  // Manual reset for when scheduling has fallen behind Android's alarm cap
  // (see clearAllScheduledNotifications) — wipes every alarm the app has
  // registered, tracked or orphaned, and turns alerts off so the id state
  // stays consistent with what's actually scheduled (nothing). Holds both
  // mutexes so it can't race a reschedule that's already in flight.
  const clearAllNotifications = useCallback(async () => {
    if (routineSyncRef.current || aphorismSyncRef.current) return;
    routineSyncRef.current = true;
    aphorismSyncRef.current = true;
    setNotifClearing(true);
    try {
      await clearAllScheduledNotifications();
      setNotificationIds({});
      setAphorismNotificationIds({});
      setSettings((s) => ({ ...s, notifEnabled: false }));
    } finally {
      routineSyncRef.current = false;
      aphorismSyncRef.current = false;
      setNotifClearing(false);
    }
  }, [setNotificationIds, setAphorismNotificationIds, setSettings]);

  const value: AppDataContextValue = {
    liftingSessions, setLiftingSessions,
    routine, setRoutine,
    logs, setLogs,
    settings, setSettings,
    notes, setNotes,
    philosophy, setPhilosophy,
    maxes, setMaxes,
    notificationIds, setNotificationIds,
    aphorismNotificationIds, setAphorismNotificationIds,
    aphorisms, setAphorisms,
    aphorismSheetUrl, setAphorismSheetUrl,
    aphorismSyncedAt, setAphorismSyncedAt,
    hydrated: h1 && h2 && h4 && h5 && h6 && h7 && h8 && h9 && h9b && h10 && h11 && h12,
    toggleNotifications,
    notifPending,
    clearAllNotifications,
    notifClearing,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within an AppDataProvider');
  return ctx;
}
