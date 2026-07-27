import { useCallback } from 'react';

import { useAppData } from '@/store/AppDataContext';
import { getRoutineForDay } from '@/lib/routine';
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
      saveDay(dow, [...items, { time: '12:00', activity: 'New item', tag: 'rest' as RoutineTagKey }]);
    },
    [routine, saveDay]
  );

  return { routine, getDay, saveDay, updateItem, deleteItem, addItem };
}
