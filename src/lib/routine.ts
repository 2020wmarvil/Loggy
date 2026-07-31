import { RoutineData, RoutineItem } from '@/data/types';

export function getRoutineForDay(routine: RoutineData, dayOfWeek: number): RoutineItem[] {
  const items = routine[dayOfWeek] || [];
  return items.map((item, i) => ({ ...item, id: `${dayOfWeek}-${i}` }));
}

// Expects 24h "H:MM" / "HH:MM". Returns null for anything that doesn't parse
// (e.g. leftover free text), so callers can skip rather than misfire.
export function parseTime(time: string): { hour: number; minute: number } | null {
  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return { hour, minute };
}

// Unparseable times sort last rather than throwing off the rest of the day.
export function timeToMinutes(time: string): number {
  const parsed = parseTime(time);
  return parsed ? parsed.hour * 60 + parsed.minute : Number.POSITIVE_INFINITY;
}

// A routine item counts as done once its scheduled time has passed for the
// given moment — completion isn't something the user should toggle by hand.
export function isTimePast(time: string, now: Date): boolean {
  return timeToMinutes(time) <= now.getHours() * 60 + now.getMinutes();
}

// Storage/sorting stay 24h "HH:MM"; this is only for display.
export function formatTime12(time: string): string {
  const parsed = parseTime(time);
  if (!parsed) return time;
  const { hour, minute } = parsed;
  const meridiem = hour < 12 ? 'AM' : 'PM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${meridiem}`;
}
