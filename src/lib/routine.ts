import { RoutineData, RoutineItem } from '@/data/types';

export function getRoutineForDay(routine: RoutineData, dayOfWeek: number): RoutineItem[] {
  const items = routine[dayOfWeek] || [];
  return items.map((item, i) => ({ ...item, id: `${dayOfWeek}-${i}` }));
}
