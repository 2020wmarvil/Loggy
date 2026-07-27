export const radii = {
  card: 14,
  sm: 8,
  pill: 20,
} as const;

export const spacing = {
  screenPad: 20,
} as const;

export const tabBarHeight = 64;
export const maxContentWidth = 430;

export const fontFamily = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semiBold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  italic: 'DMSans_400Regular_Italic',
} as const;

// RN's TextStyle['fontWeight'] type only allows the standard '100'-'900' steps,
// but the design uses in-between weights (e.g. 650) that native platforms render fine.
import type { TextStyle } from 'react-native';
export const weight600: TextStyle['fontWeight'] = '600';
export const weight650: TextStyle['fontWeight'] = '650' as TextStyle['fontWeight'];
