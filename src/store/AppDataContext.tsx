import React, { createContext, useContext } from 'react';

import { useAsyncStorageState, StorageKeys } from '@/lib/storage';
import { Session, RoutineData, RoutineChecks, Logs, Settings, NoteEntry, MaxEntry, Quote } from '@/data/types';

type Updater<T> = (next: T | ((prev: T) => T)) => void;

interface AppDataContextValue {
  liftingSessions: Session[]; setLiftingSessions: Updater<Session[]>;
  routine: RoutineData; setRoutine: Updater<RoutineData>;
  routineChecks: RoutineChecks; setRoutineChecks: Updater<RoutineChecks>;
  logs: Logs; setLogs: Updater<Logs>;
  settings: Settings; setSettings: Updater<Settings>;
  notes: NoteEntry[]; setNotes: Updater<NoteEntry[]>;
  philosophy: NoteEntry[]; setPhilosophy: Updater<NoteEntry[]>;
  maxes: MaxEntry[]; setMaxes: Updater<MaxEntry[]>;
  notificationIds: Record<string, string>; setNotificationIds: Updater<Record<string, string>>;
  aphorisms: Quote[]; setAphorisms: Updater<Quote[]>;
  aphorismSheetUrl: string | null; setAphorismSheetUrl: Updater<string | null>;
  aphorismSyncedAt: string | null; setAphorismSyncedAt: Updater<string | null>;
  hydrated: boolean;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const SETTINGS_DEFAULTS: Settings = { notifEnabled: false, accent: 'green', showWeather: true };

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [liftingSessions, setLiftingSessions, h1] = useAsyncStorageState<Session[]>(StorageKeys.LiftingProgram, []);
  const [routine, setRoutine, h2] = useAsyncStorageState<RoutineData>(StorageKeys.Routine, {});
  const [routineChecks, setRoutineChecks, h3] = useAsyncStorageState<RoutineChecks>(StorageKeys.RoutineChecks, {});
  const [logs, setLogs, h4] = useAsyncStorageState<Logs>(StorageKeys.Logs, {});
  const [settings, setSettings, h5] = useAsyncStorageState<Settings>(StorageKeys.Settings, SETTINGS_DEFAULTS);
  const [notes, setNotes, h6] = useAsyncStorageState<NoteEntry[]>(StorageKeys.Notes, []);
  const [philosophy, setPhilosophy, h7] = useAsyncStorageState<NoteEntry[]>(StorageKeys.Philosophy, []);
  const [maxes, setMaxes, h8] = useAsyncStorageState<MaxEntry[]>(StorageKeys.Maxes, []);
  const [notificationIds, setNotificationIds, h9] = useAsyncStorageState<Record<string, string>>(StorageKeys.NotificationIds, {});
  const [aphorisms, setAphorisms, h10] = useAsyncStorageState<Quote[]>(StorageKeys.Aphorisms, []);
  const [aphorismSheetUrl, setAphorismSheetUrl, h11] = useAsyncStorageState<string | null>(StorageKeys.AphorismSheetUrl, null);
  const [aphorismSyncedAt, setAphorismSyncedAt, h12] = useAsyncStorageState<string | null>(StorageKeys.AphorismSyncedAt, null);

  const value: AppDataContextValue = {
    liftingSessions, setLiftingSessions,
    routine, setRoutine,
    routineChecks, setRoutineChecks,
    logs, setLogs,
    settings, setSettings,
    notes, setNotes,
    philosophy, setPhilosophy,
    maxes, setMaxes,
    notificationIds, setNotificationIds,
    aphorisms, setAphorisms,
    aphorismSheetUrl, setAphorismSheetUrl,
    aphorismSyncedAt, setAphorismSyncedAt,
    hydrated: h1 && h2 && h3 && h4 && h5 && h6 && h7 && h8 && h9 && h10 && h11 && h12,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within an AppDataProvider');
  return ctx;
}
