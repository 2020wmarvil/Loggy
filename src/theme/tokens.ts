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

export const noteFontSizes = {
  small: { cardTitle: 15, cardText: 12, editorTitle: 18, editorBody: 13.5 },
  medium: { cardTitle: 17, cardText: 13.5, editorTitle: 20, editorBody: 15 },
  large: { cardTitle: 19.5, cardText: 16, editorTitle: 23, editorBody: 17.5 },
} as const;

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
