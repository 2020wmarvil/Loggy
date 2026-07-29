import { RoutineTagKey } from '@/data/types';
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
