import React, { createContext, useContext } from 'react';

import { useAsyncStorageState, StorageKeys } from '@/lib/storage';
import { toDateStr } from '@/lib/date';
import { Session, RoutineData, RoutineChecks, Logs, Settings, NoteEntry, MaxEntry } from '@/data/types';
import { defaultLiftingSessions } from '@/data/defaultProgram';
import { defaultRoutine } from '@/data/defaultRoutine';
import { AXIOMS } from '@/data/axioms';

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
  hydrated: boolean;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const SETTINGS_DEFAULTS: Settings = { notifEnabled: false, accent: 'green', showWeather: true };

const philosophySeed: NoteEntry[] = [
  { id: 'seed-0', title: 'Axioms', text: AXIOMS.map((a) => `• ${a}`).join('\n'), updatedAt: toDateStr(new Date()) },
];

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [liftingSessions, setLiftingSessions, h1] = useAsyncStorageState<Session[]>(StorageKeys.LiftingProgram, defaultLiftingSessions);
  const [routine, setRoutine, h2] = useAsyncStorageState<RoutineData>(StorageKeys.Routine, defaultRoutine);
  const [routineChecks, setRoutineChecks, h3] = useAsyncStorageState<RoutineChecks>(StorageKeys.RoutineChecks, {});
  const [logs, setLogs, h4] = useAsyncStorageState<Logs>(StorageKeys.Logs, {});
  const [settings, setSettings, h5] = useAsyncStorageState<Settings>(StorageKeys.Settings, SETTINGS_DEFAULTS);
  const [notes, setNotes, h6] = useAsyncStorageState<NoteEntry[]>(StorageKeys.Notes, []);
  const [philosophy, setPhilosophy, h7] = useAsyncStorageState<NoteEntry[]>(StorageKeys.Philosophy, philosophySeed);
  const [maxes, setMaxes, h8] = useAsyncStorageState<MaxEntry[]>(StorageKeys.Maxes, []);
  const [notificationIds, setNotificationIds, h9] = useAsyncStorageState<Record<string, string>>(StorageKeys.NotificationIds, {});

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
    hydrated: h1 && h2 && h3 && h4 && h5 && h6 && h7 && h8 && h9,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within an AppDataProvider');
  return ctx;
}
