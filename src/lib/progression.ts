import { Program, Session, Exercise, Logs, LogEntry, SetEntry, Goal, Quote } from '@/data/types';
import { toDateStr, parseDate, fmtShort } from '@/lib/date';

export function getSession(program: Program, sessionId: string): Session | undefined {
  return program.sessions.find((s) => s.id === sessionId);
}

export type LastLog = LogEntry & { date: string };

export function getLastLog(logs: Logs, programId: string, sessionId: string, excludeDate?: string): LastLog | null {
  const dates = Object.keys(logs).sort().reverse();
  for (const d of dates) {
    if (d === excludeDate) continue;
    const entry = logs[d]?.[programId]?.[sessionId];
    if (entry?.completed) return { date: d, ...entry };
  }
  return null;
}

// Aggressive double progression: any set hitting repMax -> progress.
export function calcGoal(ex: Exercise, lastLog: LastLog | null): Goal {
  const sets = lastLog?.exercises?.[ex.id];
  if (!sets?.length) {
    return { weight: ex.startWeight, targetReps: ex.repMin, isNew: true, progressed: false };
  }
  const lastWeight = sets[0]?.weight ?? ex.startWeight;
  const anyHitMax = sets.some((s) => s.reps >= ex.repMax);
  if (anyHitMax && ex.increment > 0) {
    return { weight: lastWeight + ex.increment, targetReps: ex.repMin, progressed: true };
  }
  return { weight: lastWeight, targetReps: ex.repMax, progressed: false };
}

export function getTodaySchedule(program: Program, today: Date): { program: Program; session: Session }[] {
  const dow = today.getDay();
  const sess = program.sessions.find((s) => s.dayOfWeek === dow);
  return sess ? [{ program, session: sess }] : [];
}

export function getExerciseHistory(logs: Logs, program: Program, exerciseId: string): { date: string; sets: SetEntry[] }[] {
  const result: { date: string; sets: SetEntry[] }[] = [];
  for (const date of Object.keys(logs).sort()) {
    for (const sess of program.sessions) {
      const sets = logs[date]?.[program.id]?.[sess.id]?.exercises?.[exerciseId];
      if (sets?.length) result.push({ date, sets });
    }
  }
  return result;
}

export interface PR { weight: number; reps: number; date: string }

export function getPRs(logs: Logs): Record<string, PR> {
  const prs: Record<string, PR> = {};
  for (const date of Object.keys(logs)) {
    for (const progId of Object.keys(logs[date])) {
      for (const sessId of Object.keys(logs[date][progId])) {
        const exs = logs[date][progId][sessId]?.exercises || {};
        for (const exId of Object.keys(exs)) {
          for (const s of exs[exId]) {
            const k = `${progId}/${exId}`;
            if (!prs[k] || s.weight > prs[k].weight || (s.weight === prs[k].weight && s.reps > prs[k].reps)) {
              prs[k] = { weight: s.weight, reps: s.reps, date };
            }
          }
        }
      }
    }
  }
  return prs;
}

export interface WeekEntry {
  date: string;
  programId: string;
  sessionId: string;
  completed: boolean;
  exercises: LogEntry['exercises'];
}

export interface WeekGroup {
  key: string;
  label: string;
  entries: WeekEntry[];
}

export function groupByWeek(logs: Logs): WeekGroup[] {
  const all: WeekEntry[] = [];
  for (const date of Object.keys(logs).sort().reverse()) {
    for (const progId of Object.keys(logs[date])) {
      for (const sessId of Object.keys(logs[date][progId])) {
        const e = logs[date][progId][sessId];
        all.push({ date, programId: progId, sessionId: sessId, completed: e.completed, exercises: e.exercises });
      }
    }
  }
  const weeks: Record<string, WeekGroup> = {};
  for (const e of all) {
    const d = parseDate(e.date);
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const k = toDateStr(mon);
    if (!weeks[k]) weeks[k] = { key: k, label: `Week of ${fmtShort(k)}`, entries: [] };
    weeks[k].entries.push(e);
  }
  return Object.values(weeks).sort((a, b) => b.key.localeCompare(a.key));
}

export function calcVolume(sets: SetEntry[]): number {
  return sets.reduce((a, s) => a + (s.weight > 0 ? s.weight * s.reps : s.reps), 0);
}

export function getDailyQuote(date: Date, quotes: Quote[]): Quote | undefined {
  if (!quotes.length) return undefined;
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return quotes[dayOfYear % quotes.length];
}
