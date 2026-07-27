import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export type IconName =
  | 'today' | 'history' | 'note' | 'gear' | 'back' | 'check'
  | 'chev' | 'left' | 'right' | 'pencil' | 'x' | 'plus'
  | 'sun' | 'cloud' | 'rain';

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 22, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {renderPaths(name)}
    </Svg>
  );
}

function renderPaths(name: IconName): React.ReactNode {
  switch (name) {
    case 'today':
      return (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M12 7v5l3 3" />
        </>
      );
    case 'history':
      return (
        <>
          <Path d="M3 12a9 9 0 1 0 18 0A9 9 0 0 0 3 12" />
          <Path d="M12 7v5l3 3" />
        </>
      );
    case 'note':
      return (
        <>
          <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <Path d="M14 3v5h5" />
          <Path d="M9 13h6M9 17h4" />
        </>
      );
    case 'gear':
      return (
        <>
          <Circle cx="12" cy="12" r="3" />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </>
      );
    case 'back':
      return <Path d="M15 18l-6-6 6-6" />;
    case 'check':
      return <Path d="M5 13l4 4L19 7" />;
    case 'chev':
      return <Path d="M9 18l6-6-6-6" />;
    case 'left':
      return <Path d="M15 18l-6-6 6-6" />;
    case 'right':
      return <Path d="M9 18l6-6-6-6" />;
    case 'pencil':
      return (
        <>
          <Path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
          <Path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
        </>
      );
    case 'x':
      return <Path d="M18 6L6 18M6 6l12 12" />;
    case 'plus':
      return <Path d="M12 5v14M5 12h14" />;
    case 'sun':
      return (
        <>
          <Circle cx="12" cy="12" r="4" />
          <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      );
    case 'cloud':
      return <Path d="M17.5 19a4.5 4.5 0 0 0 0-9 5.5 5.5 0 0 0-10.6-1.6A4 4 0 0 0 6 19h11.5z" />;
    case 'rain':
      return (
        <>
          <Path d="M17.5 15a4.5 4.5 0 0 0 0-9 5.5 5.5 0 0 0-10.6-1.6A4 4 0 0 0 6 15h11.5z" />
          <Path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2" />
        </>
      );
    default:
      return null;
  }
}
