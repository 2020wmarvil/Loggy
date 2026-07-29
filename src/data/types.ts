export type ExerciseType = 'weighted' | 'bodyweight' | 'time';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  increment: number; // lbs to add on progression; 0 = no auto-progression
  startWeight: number;
  type: ExerciseType;
  unit?: string; // 's' for time-based
}

export interface Session {
  id: string;
  dayOfWeek: number; // 0=Sun ... 6=Sat
  name: string;
  exercises: Exercise[];
}

export interface Program {
  id: string;
  name: string;
  scheduledDays: number[];
  sessions: Session[];
}

export interface SetEntry {
  reps: number;
  weight: number;
}

export interface LogEntry {
  completed: boolean;
  exercises: { [exerciseId: string]: SetEntry[] };
}

// dateStr -> programId -> sessionId -> LogEntry
export type Logs = { [dateStr: string]: { [programId: string]: { [sessionId: string]: LogEntry } } };

export type RoutineTagKey =
  | 'wake' | 'mobility' | 'lift' | 'calisthenics'
  | 'tricking' | 'climbing' | 'running' | 'work' | 'rest';

export interface RoutineItem {
  id: string; // derived: `${dayOfWeek}-${index}`
  time: string; // e.g. '8:00'
  activity: string;
  tag: RoutineTagKey;
}

// dayOfWeek -> items (without ids; ids are derived on read)
export type RoutineData = { [dayOfWeek: number]: Omit<RoutineItem, 'id'>[] };

// dateStr -> routineItemId -> checked
export type RoutineChecks = { [dateStr: string]: { [itemId: string]: boolean } };

export interface NoteEntry {
  id: string;
  title: string;
  text: string;
  updatedAt: string; // YYYY-MM-DD
}

export interface MaxEntry {
  id: string;
  name: string;
  weight: number;
  date: string; // YYYY-MM-DD
}

export interface Quote {
  text: string;
  attr?: string;
}

export type NotesFontSize = 'small' | 'medium' | 'large';

export interface Settings {
  notifEnabled: boolean;
  accent: string;
  showWeather: boolean;
  notesFontSize: NotesFontSize;
}

export interface Goal {
  weight: number;
  targetReps: number;
  isNew?: boolean;
  progressed: boolean;
}
