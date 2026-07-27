import { useCallback } from 'react';

import { useAppData } from '@/store/AppDataContext';
import { toDateStr } from '@/lib/date';
import { MaxEntry } from '@/data/types';

export function useMaxes() {
  const { maxes, setMaxes } = useAppData();

  const add = useCallback(() => {
    const id = `max-${Date.now()}`;
    setMaxes((m) => [{ id, name: '', weight: 0, date: toDateStr(new Date()) }, ...m]);
    return id;
  }, [setMaxes]);

  const update = useCallback(
    (id: string, patch: Partial<Omit<MaxEntry, 'id'>>) => {
      setMaxes((m) => m.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    },
    [setMaxes]
  );

  const remove = useCallback(
    (id: string) => {
      setMaxes((m) => m.filter((e) => e.id !== id));
    },
    [setMaxes]
  );

  return { maxes, add, update, remove };
}
