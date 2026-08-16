import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export const DAYS_S = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// A plain `useState(() => new Date())` freezes at mount time and never
// updates — screens that stay mounted across a day boundary (e.g. Expo
// Router tabs) would keep showing yesterday's date. Recompute on every
// foreground so reopening the app after midnight always reflects today.
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(new Date());
    });
    return () => sub.remove();
  }, []);
  return today;
}

// Uses local date components (not toISOString) so the "date" always matches
// the device's calendar day regardless of UTC offset.
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDate(d: Date): string {
  return `${DAYS_S[d.getDay()]}, ${MONTHS_S[d.getMonth()]} ${d.getDate()}`;
}

export function fmtShort(s: string): string {
  const d = parseDate(s);
  return `${MONTHS_S[d.getMonth()]} ${d.getDate()}`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

export function fmtRelativeTime(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return fmtShort(toDateStr(new Date(iso)));
}
