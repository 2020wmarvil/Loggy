export const DAYS_S = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
