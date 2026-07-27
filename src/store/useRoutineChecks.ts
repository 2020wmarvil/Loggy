import { useCallback } from 'react';

import { useAppData } from '@/store/AppDataContext';

export function useRoutineChecks() {
  const { routineChecks, setRoutineChecks } = useAppData();

  const isChecked = useCallback(
    (dateStr: string, itemId: string) => !!routineChecks[dateStr]?.[itemId],
    [routineChecks]
  );

  const toggle = useCallback(
    (dateStr: string, itemId: string) => {
      setRoutineChecks((prev) => ({
        ...prev,
        [dateStr]: { ...prev[dateStr], [itemId]: !prev[dateStr]?.[itemId] },
      }));
    },
    [setRoutineChecks]
  );

  return { routineChecks, isChecked, toggle };
}
