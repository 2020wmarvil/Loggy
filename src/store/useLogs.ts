import { useCallback } from 'react';

import { useAppData } from '@/store/AppDataContext';
import { LogEntry } from '@/data/types';

export function useLogs() {
  const { logs, setLogs, hydrated } = useAppData();

  const saveSession = useCallback(
    (dateStr: string, programId: string, sessionId: string, patch: Partial<LogEntry>) => {
      setLogs((prev) => {
        const existing = prev[dateStr]?.[programId]?.[sessionId];
        const base: LogEntry = { completed: false, exercises: {} };
        const next: LogEntry = { ...base, ...existing, ...patch };
        return {
          ...prev,
          [dateStr]: {
            ...prev[dateStr],
            [programId]: {
              ...prev[dateStr]?.[programId],
              [sessionId]: next,
            },
          },
        };
      });
    },
    [setLogs]
  );

  return { logs, saveSession, hydrated };
}
