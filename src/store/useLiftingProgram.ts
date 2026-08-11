import { useCallback, useMemo } from 'react';

import { useAppData } from '@/store/AppDataContext';
import { LIFTING_PROGRAM_ID } from '@/data/defaultProgram';
import { Exercise, ExerciseType, Program } from '@/data/types';

export function useLiftingProgram() {
  const { liftingSessions, setLiftingSessions } = useAppData();

  const program: Program = useMemo(
    () => ({ id: LIFTING_PROGRAM_ID, name: 'Program', scheduledDays: [1, 2, 3, 4, 5], sessions: liftingSessions }),
    [liftingSessions]
  );

  const addSession = useCallback(
    (dayOfWeek: number, name: string) => {
      setLiftingSessions((list) => [...list, { id: `day-${dayOfWeek}-${Date.now()}`, dayOfWeek, name, exercises: [] }]);
    },
    [setLiftingSessions]
  );

  const removeSession = useCallback(
    (dayOfWeek: number) => {
      setLiftingSessions((list) => list.filter((s) => s.dayOfWeek !== dayOfWeek));
    },
    [setLiftingSessions]
  );

  const addExercise = useCallback(
    (dayOfWeek: number) => {
      setLiftingSessions((list) =>
        list.map((s) =>
          s.dayOfWeek !== dayOfWeek
            ? s
            : {
                ...s,
                exercises: [
                  ...s.exercises,
                  { id: `ex-${Date.now()}`, name: 'New Exercise', sets: 2, repMin: 8, repMax: 12, increment: 5, startWeight: 45, type: 'weighted' as ExerciseType },
                ],
              }
        )
      );
    },
    [setLiftingSessions]
  );

  const updateExercise = useCallback(
    (dayOfWeek: number, exIndex: number, field: keyof Exercise, val: Exercise[keyof Exercise]) => {
      setLiftingSessions((list) =>
        list.map((s) =>
          s.dayOfWeek !== dayOfWeek
            ? s
            : { ...s, exercises: s.exercises.map((e, i) => (i !== exIndex ? e : { ...e, [field]: val })) }
        )
      );
    },
    [setLiftingSessions]
  );

  const deleteExercise = useCallback(
    (dayOfWeek: number, exIndex: number) => {
      setLiftingSessions((list) =>
        list.map((s) => (s.dayOfWeek !== dayOfWeek ? s : { ...s, exercises: s.exercises.filter((_, i) => i !== exIndex) }))
      );
    },
    [setLiftingSessions]
  );

  const reorderExercises = useCallback(
    (dayOfWeek: number, next: Exercise[]) => {
      setLiftingSessions((list) => list.map((s) => (s.dayOfWeek !== dayOfWeek ? s : { ...s, exercises: next })));
    },
    [setLiftingSessions]
  );

  return { program, addSession, removeSession, addExercise, updateExercise, deleteExercise, reorderExercises };
}
