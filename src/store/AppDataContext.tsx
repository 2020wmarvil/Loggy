import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAsyncStorageState, StorageKeys } from '@/lib/storage';
import { Session, RoutineData, Logs, Settings, NoteEntry, MaxEntry, Quote } from '@/data/types';
import { toDateStr } from '@/lib/date';
import { logNotifEvent } from '@/lib/notifLog';
import {
  cancelAphorismNotifications,
  cancelRoutineNotifications,
  clearAllScheduledNotifications,
  requestNotificationPermission,
  rescheduleMorningAphorisms,
  rescheduleRoutineNotifications,
  scheduleMorningAphorisms,
  scheduleRoutineNotifications,
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
  aphorismNotifScheduledDate: string | null; setAphorismNotifScheduledDate: Updater<string | null>;
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
  const [aphorismNotifScheduledDate, setAphorismNotifScheduledDate, h9c] = useAsyncStorageState<string | null>(StorageKeys.AphorismNotifScheduledDate, null);
  const [aphorisms, setAphorisms, h10] = useAsyncStorageState<Quote[]>(StorageKeys.Aphorisms, []);
  const [aphorismSheetUrl, setAphorismSheetUrl, h11] = useAsyncStorageState<string | null>(StorageKeys.AphorismSheetUrl, null);
  const [aphorismSyncedAt, setAphorismSyncedAt, h12] = useAsyncStorageState<string | null>(StorageKeys.AphorismSyncedAt, null);

  // Single mutex across every path that cancels+reschedules notifications:
  // the toggle, the manual clear-all, the debounced routine/aphorisms sync
  // effect, and the daily aphorism-window refresh. This state must live
  // here (in the single app-wide provider) rather than in useSettings —
  // useSettings is a plain hook called from five different screens, and a
  // ref/effect defined inside a plain hook is re-created independently per
  // call site. Multiple independent copies of these effects were all
  // reacting to the same routine/aphorisms changes in parallel, each with
  // its own private mutex blind to the others, which is what produced
  // duplicate scheduled notifications for the same routine item.
  const notifOpRef = useRef(false);
  const [notifPending, setNotifPending] = useState(false);
  // Turning alerts on already does a full schedule in toggleNotifications;
  // without this, the routine/aphorisms-sync effect below (which also
  // reacts to notifEnabled) fires ~800ms later and redundantly reschedules
  // the same batch a second time.
  const skipNextSyncRef = useRef(false);

  const toggleNotifications = useCallback(async () => {
    if (notifOpRef.current) return;
    notifOpRef.current = true;
    setNotifPending(true);
    try {
      const next = !settings.notifEnabled;
      if (next) {
        const granted = await requestNotificationPermission();
        if (!granted) return;
        skipNextSyncRef.current = true;
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
    } finally {
      notifOpRef.current = false;
      setNotifPending(false);
    }
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

  const [notifClearing, setNotifClearing] = useState(false);

  // Manual reset for when scheduling has fallen behind Android's alarm cap
  // (see clearAllScheduledNotifications) — wipes every alarm the app has
  // registered, tracked or orphaned, and turns alerts off so the id state
  // stays consistent with what's actually scheduled (nothing).
  const clearAllNotifications = useCallback(async () => {
    if (notifOpRef.current) return;
    notifOpRef.current = true;
    setNotifClearing(true);
    try {
      await clearAllScheduledNotifications();
      setNotificationIds({});
      setAphorismNotificationIds({});
      setAphorismNotifScheduledDate(null);
      setSettings((s) => ({ ...s, notifEnabled: false }));
    } finally {
      notifOpRef.current = false;
      setNotifClearing(false);
    }
  }, [setNotificationIds, setAphorismNotificationIds, setAphorismNotifScheduledDate, setSettings]);

  // Keep scheduled notifications in sync whenever the routine (or the linked
  // aphorisms) is edited while alerts are enabled. Debounced so that typing
  // in an activity/time field doesn't reschedule on every keystroke —
  // without this, rapid overlapping reschedules race on setNotificationIds
  // (last write wins) and orphan the losing batches, which still fire since
  // nothing ever cancels them.
  useEffect(() => {
    if (!settings.notifEnabled) return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        if (notifOpRef.current) {
          logNotifEvent('routine/aphorisms sync skipped — another notification operation was in progress');
          return;
        }
        notifOpRef.current = true;
        try {
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
        } finally {
          notifOpRef.current = false;
        }
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
      if (notifOpRef.current) {
        logNotifEvent('aphorism window refresh skipped — another notification operation was in progress');
        return;
      }
      notifOpRef.current = true;
      try {
        const aphIds = await rescheduleMorningAphorisms(aphorismNotificationIds, routine, aphorisms);
        setAphorismNotificationIds(aphIds);
        setAphorismNotifScheduledDate(today);
      } finally {
        notifOpRef.current = false;
      }
    };
    refreshIfStale();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshIfStale();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.notifEnabled]);

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
    aphorismNotifScheduledDate, setAphorismNotifScheduledDate,
    aphorisms, setAphorisms,
    aphorismSheetUrl, setAphorismSheetUrl,
    aphorismSyncedAt, setAphorismSyncedAt,
    hydrated: h1 && h2 && h4 && h5 && h6 && h7 && h8 && h9 && h9b && h9c && h10 && h11 && h12,
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
