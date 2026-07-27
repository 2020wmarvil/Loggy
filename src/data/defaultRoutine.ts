import { RoutineTagKey, RoutineData } from '@/data/types';
import { Theme } from '@/theme/colors';

export const ROUTINE_TAGS: Record<RoutineTagKey, { label: string; colorKey: keyof Theme; dimKey: keyof Theme }> = {
  wake: { label: 'Wake', colorKey: 'muted', dimKey: 's3' },
  mobility: { label: 'Mobility', colorKey: 'teal', dimKey: 'tealDim' },
  lift: { label: 'Lift', colorKey: 'green', dimKey: 'greenDim' },
  calisthenics: { label: 'Calisthenics', colorKey: 'purple', dimKey: 'purpleDim' },
  tricking: { label: 'Tricking', colorKey: 'blue', dimKey: 'blueDim' },
  climbing: { label: 'Climbing', colorKey: 'amber', dimKey: 'amberDim' },
  running: { label: 'Conditioning', colorKey: 'red', dimKey: 'redDim' },
  work: { label: 'Work', colorKey: 'muted', dimKey: 's3' },
  rest: { label: 'Recover', colorKey: 'muted', dimKey: 's3' },
};

// Reusable building blocks
const wake = { time: '6:00', activity: 'Rise', tag: 'wake' as RoutineTagKey };
const amMob = { time: '6:20', activity: 'Mobility — backbend drills', tag: 'mobility' as RoutineTagKey };
const work = { time: '9:30', activity: 'Deep work', tag: 'work' as RoutineTagKey };
const windDown = { time: '22:00', activity: 'Wind down · sleep', tag: 'rest' as RoutineTagKey };

export const defaultRoutine: RoutineData = {
  1: [ // Monday
    wake, amMob,
    { time: '8:00', activity: 'Lift — Monday', tag: 'lift' },
    work,
    { time: '12:30', activity: 'Calisthenics / Kicks', tag: 'calisthenics' },
    windDown,
  ],
  2: [ // Tuesday
    wake, amMob,
    { time: '8:00', activity: 'Lift — Tuesday', tag: 'lift' },
    work,
    { time: '12:30', activity: 'Calisthenics / Kicks', tag: 'calisthenics' },
    { time: '18:00', activity: 'Climbing', tag: 'climbing' },
    { time: '20:00', activity: 'Jog after climbing', tag: 'running' },
    windDown,
  ],
  3: [ // Wednesday
    wake, amMob,
    { time: '8:00', activity: 'Lift — Wednesday', tag: 'lift' },
    work,
    { time: '12:30', activity: 'Calisthenics / Kicks', tag: 'calisthenics' },
    windDown,
  ],
  4: [ // Thursday
    wake, amMob,
    { time: '8:00', activity: 'Lift — Thursday', tag: 'lift' },
    work,
    { time: '12:30', activity: 'Calisthenics / Kicks', tag: 'calisthenics' },
    { time: '18:00', activity: 'Climbing', tag: 'climbing' },
    { time: '20:00', activity: 'Jog after climbing', tag: 'running' },
    windDown,
  ],
  5: [ // Friday
    wake, amMob,
    { time: '8:00', activity: 'Lift — Friday', tag: 'lift' },
    work,
    { time: '12:30', activity: 'Calisthenics / Kicks', tag: 'calisthenics' },
    windDown,
  ],
  6: [ // Saturday
    { time: '7:30', activity: 'Rise', tag: 'wake' },
    { time: '10:00', activity: 'Saturday session', tag: 'climbing' },
    { time: '13:00', activity: 'Mobility / recovery', tag: 'mobility' },
    windDown,
  ],
  0: [ // Sunday
    { time: '7:30', activity: 'Rise', tag: 'wake' },
    { time: '10:00', activity: 'Sprints', tag: 'running' },
    { time: '11:30', activity: 'Lacrosse', tag: 'running' },
    { time: '14:00', activity: 'Parkour', tag: 'tricking' },
    { time: '21:30', activity: 'Plan the week ahead', tag: 'rest' },
  ],
};
