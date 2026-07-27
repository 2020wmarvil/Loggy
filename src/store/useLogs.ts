import { useCallback } from 'react';

import { useAppData } from '@/store/AppDataContext';
import { LogEntry } from '@/data/types';

export function useLogs() {
  const { logs, setLogs } = useAppData();

  const saveSession = useCallback(
    (dateStr: string, programId: string, sessionId: string, exercises: LogEntry['exercises'], completed: boolean) => {
      setLogs((prev) => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          [programId]: {
            ...prev[dateStr]?.[programId],
            [sessionId]: { completed, exercises },
          },
        },
      }));
    },
    [setLogs]
  );

  return { logs, saveSession };
}
