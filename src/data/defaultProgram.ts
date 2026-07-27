import { Program } from '@/data/types';

export const LIFTING_PROGRAM_ID = 'lifting';

export const defaultLiftingSessions: Program['sessions'] = [
  {
    id: 'mon', dayOfWeek: 1, name: 'Monday', exercises: [
      { id: 'bench', name: 'Bench Press', sets: 4, repMin: 6, repMax: 8, increment: 5, startWeight: 155, type: 'weighted' },
      { id: 'dec-crunch', name: 'Decline Crunch', sets: 3, repMin: 15, repMax: 20, increment: 0, startWeight: 0, type: 'bodyweight' },
      { id: 'preacher', name: 'Preacher Curls', sets: 3, repMin: 8, repMax: 12, increment: 5, startWeight: 65, type: 'weighted' },
      { id: 'y-raise', name: 'Y Raise', sets: 3, repMin: 12, repMax: 15, increment: 2.5, startWeight: 12.5, type: 'weighted' },
      { id: 'roman-mon', name: 'Roman Chair', sets: 3, repMin: 15, repMax: 20, increment: 0, startWeight: 0, type: 'bodyweight' },
    ],
  },
  {
    id: 'tue', dayOfWeek: 2, name: 'Tuesday', exercises: [
      { id: 'squat', name: 'Back Squat', sets: 4, repMin: 5, repMax: 7, increment: 5, startWeight: 185, type: 'weighted' },
      { id: 'tib', name: 'Tib Raise', sets: 3, repMin: 15, repMax: 20, increment: 0, startWeight: 0, type: 'bodyweight' },
      { id: 'rdl', name: 'RDL', sets: 3, repMin: 8, repMax: 10, increment: 5, startWeight: 135, type: 'weighted' },
      { id: 'hammer', name: 'Preacher Hammer Curls', sets: 3, repMin: 8, repMax: 12, increment: 5, startWeight: 55, type: 'weighted' },
      { id: 'fl', name: 'FL Holds', sets: 3, repMin: 10, repMax: 20, increment: 0, startWeight: 0, type: 'time', unit: 's' },
    ],
  },
  {
    id: 'wed', dayOfWeek: 3, name: 'Wednesday', exercises: [
      { id: 'incline', name: 'Incline Press', sets: 4, repMin: 8, repMax: 10, increment: 5, startWeight: 135, type: 'weighted' },
      { id: 'roman-wed', name: 'Roman Chair', sets: 3, repMin: 15, repMax: 20, increment: 0, startWeight: 0, type: 'bodyweight' },
      { id: 'rdr', name: 'Rear Delt Row', sets: 3, repMin: 12, repMax: 15, increment: 5, startWeight: 65, type: 'weighted' },
      { id: 'pullover', name: 'Pullovers', sets: 3, repMin: 10, repMax: 12, increment: 5, startWeight: 55, type: 'weighted' },
      { id: 'dragon', name: 'Dragon Flags', sets: 3, repMin: 5, repMax: 8, increment: 0, startWeight: 0, type: 'bodyweight' },
    ],
  },
  {
    id: 'thu', dayOfWeek: 4, name: 'Thursday', exercises: [
      { id: 'ohp', name: 'OHP', sets: 4, repMin: 6, repMax: 8, increment: 5, startWeight: 105, type: 'weighted' },
      { id: 'pullup', name: 'Pull Up', sets: 3, repMin: 6, repMax: 10, increment: 0, startWeight: 0, type: 'bodyweight' },
      { id: 'tri-push', name: 'Tricep Pushdown', sets: 3, repMin: 12, repMax: 15, increment: 5, startWeight: 55, type: 'weighted' },
      { id: 'facepull', name: 'Face Pull', sets: 3, repMin: 15, repMax: 20, increment: 5, startWeight: 50, type: 'weighted' },
      { id: 'lat-raise', name: 'Lat Raise', sets: 3, repMin: 12, repMax: 15, increment: 2.5, startWeight: 25, type: 'weighted' },
      { id: 'dec2', name: 'Decline Crunch', sets: 3, repMin: 15, repMax: 20, increment: 0, startWeight: 0, type: 'bodyweight' },
      { id: 'roman-thu', name: 'Roman Chair', sets: 3, repMin: 15, repMax: 20, increment: 0, startWeight: 0, type: 'bodyweight' },
      { id: 'rpd', name: 'Rev Pec Deck', sets: 3, repMin: 12, repMax: 15, increment: 5, startWeight: 75, type: 'weighted' },
    ],
  },
  {
    id: 'fri', dayOfWeek: 5, name: 'Friday', exercises: [
      { id: 'dips', name: 'Dips', sets: 3, repMin: 8, repMax: 12, increment: 0, startWeight: 0, type: 'bodyweight' },
      { id: 'roman-fri', name: 'Roman Chair', sets: 3, repMin: 15, repMax: 20, increment: 0, startWeight: 0, type: 'bodyweight' },
      { id: 'rev-nordic', name: 'Reverse Nordic', sets: 3, repMin: 5, repMax: 8, increment: 0, startWeight: 0, type: 'bodyweight' },
      { id: 'cs-row', name: 'CS Row', sets: 4, repMin: 8, repMax: 10, increment: 5, startWeight: 135, type: 'weighted' },
      { id: 'kelso', name: 'Kelso Shrug', sets: 3, repMin: 12, repMax: 15, increment: 5, startWeight: 135, type: 'weighted' },
    ],
  },
];

export const defaultLiftingProgram: Program = {
  id: LIFTING_PROGRAM_ID,
  name: 'Lifting',
  scheduledDays: [1, 2, 3, 4, 5],
  sessions: defaultLiftingSessions,
};
