// Base palette ported from the Loggy v2 HTML prototype (originally OKLCH,
// converted to sRGB hex since React Native styles don't support oklch()).
export const palette = {
  bg: '#0a0a0a',
  s1: '#141414',
  s2: '#1c1c1c',
  s3: '#242424',
  border: '#272727',
  border2: '#323232',
  text: '#eeebe5',
  muted: '#5a5a5a',
  muted2: '#3a3a3a',
  green: '#27b24f',
  blue: '#4296fb',
  red: '#e54c4a',
  yellow: '#d6a20a',
  purple: '#9c72de',
  amber: '#e39339',
  teal: '#2cb3b3',
  white: '#ffffff',
  black: '#000000',
} as const;

export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Accent swatches for the Settings screen (only the primary/"green" role is
// swappable in the prototype — routine tag colors below stay fixed).
export const ACCENTS = {
  green: { hex: '#27b24f', label: 'Green' },
  blue: { hex: '#3b95ff', label: 'Blue' },
  violet: { hex: '#a876f2', label: 'Violet' },
  amber: { hex: '#de7700', label: 'Amber' },
  rose: { hex: '#ef5d66', label: 'Rose' },
} as const;
export type AccentKey = keyof typeof ACCENTS;

export interface Theme {
  bg: string; s1: string; s2: string; s3: string;
  border: string; border2: string;
  text: string; muted: string; muted2: string;
  white: string; black: string;
  green: string; greenDim: string; greenMid: string;
  blue: string; blueDim: string; blueMid: string;
  red: string; redDim: string;
  yellow: string;
  purple: string; purpleDim: string;
  amber: string; amberDim: string;
  teal: string; tealDim: string;
  prHighlight: string;
}

export function makeTheme(accent: AccentKey): Theme {
  const green = ACCENTS[accent]?.hex ?? ACCENTS.green.hex;
  return {
    bg: palette.bg, s1: palette.s1, s2: palette.s2, s3: palette.s3,
    border: palette.border, border2: palette.border2,
    text: palette.text, muted: palette.muted, muted2: palette.muted2,
    white: palette.white, black: palette.black,
    green,
    greenDim: withAlpha(green, 0.12),
    greenMid: withAlpha(green, 0.28),
    blue: palette.blue,
    blueDim: withAlpha(palette.blue, 0.12),
    blueMid: withAlpha(palette.blue, 0.28),
    red: palette.red,
    redDim: withAlpha(palette.red, 0.14),
    yellow: palette.yellow,
    purple: palette.purple,
    purpleDim: withAlpha(palette.purple, 0.14),
    amber: palette.amber,
    amberDim: withAlpha(palette.amber, 0.14),
    teal: palette.teal,
    tealDim: withAlpha(palette.teal, 0.14),
    prHighlight: withAlpha(palette.yellow, 0.1),
  };
}
