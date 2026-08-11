import { useCallback } from 'react';

import { useAppData } from '@/store/AppDataContext';
import { getRoutineForDay, timeToMinutes } from '@/lib/routine';
import { RoutineItem, RoutineTagKey } from '@/data/types';

type DraftItem = { time: string; activity: string; tag: RoutineTagKey };

export function useRoutine() {
  const { routine, setRoutine } = useAppData();

  const getDay = useCallback((dow: number): RoutineItem[] => getRoutineForDay(routine, dow), [routine]);

  const saveDay = useCallback(
    (dow: number, items: DraftItem[]) => {
      setRoutine((prev) => ({ ...prev, [dow]: items }));
    },
    [setRoutine]
  );

  const updateItem = useCallback(
    (dow: number, idx: number, field: keyof DraftItem, val: string) => {
      const items = getRoutineForDay(routine, dow).map(({ id, ...rest }) => rest);
      const next = items.map((it, i) => (i === idx ? { ...it, [field]: val } : it));
      saveDay(dow, next);
    },
    [routine, saveDay]
  );

  const deleteItem = useCallback(
    (dow: number, idx: number) => {
      const items = getRoutineForDay(routine, dow).map(({ id, ...rest }) => rest);
      saveDay(dow, items.filter((_, i) => i !== idx));
    },
    [routine, saveDay]
  );

  const addItem = useCallback(
    (dow: number) => {
      const items = getRoutineForDay(routine, dow).map(({ id, ...rest }) => rest);
      const latestTime = items.reduce(
        (latest, it) => (timeToMinutes(it.time) > timeToMinutes(latest) ? it.time : latest),
        '00:00'
      );
      const next = [...items, { time: items.length ? latestTime : '12:00', activity: 'New item', tag: 'rest' as RoutineTagKey }];
      next.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
      saveDay(dow, next);
    },
    [routine, saveDay]
  );

  const sortDay = useCallback(
    (dow: number) => {
      const items = getRoutineForDay(routine, dow).map(({ id, ...rest }) => rest);
      const sorted = [...items].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
      saveDay(dow, sorted);
    },
    [routine, saveDay]
  );

  return { routine, getDay, saveDay, updateItem, deleteItem, addItem, sortDay };
}
