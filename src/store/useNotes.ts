import { useCallback } from 'react';

import { useAppData } from '@/store/AppDataContext';
import { toDateStr } from '@/lib/date';
import { NoteEntry } from '@/data/types';

type Updater<T> = (next: T | ((prev: T) => T)) => void;

function useNoteList(list: NoteEntry[], setList: Updater<NoteEntry[]>) {
  const startNew = useCallback(() => {
    const id = `n-${Date.now()}`;
    setList((l) => [{ id, title: '', text: '', updatedAt: toDateStr(new Date()) }, ...l]);
    return id;
  }, [setList]);

  const save = useCallback(
    (id: string, title: string, text: string) => {
      setList((l) => l.map((n) => (n.id === id ? { ...n, title, text, updatedAt: toDateStr(new Date()) } : n)));
    },
    [setList]
  );

  const remove = useCallback(
    (id: string) => {
      setList((l) => l.filter((n) => n.id !== id));
    },
    [setList]
  );

  const reorder = useCallback(
    (next: NoteEntry[]) => {
      setList(next);
    },
    [setList]
  );

  return { list, startNew, save, remove, reorder };
}

export function useNotes() {
  const { notes, setNotes } = useAppData();
  return useNoteList(notes, setNotes);
}

export function usePhilosophy() {
  const { philosophy, setPhilosophy } = useAppData();
  return useNoteList(philosophy, setPhilosophy);
}
