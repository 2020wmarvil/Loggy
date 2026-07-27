import React, { createContext, useContext, useMemo } from 'react';

import { makeTheme, Theme, AccentKey } from '@/theme/colors';
import { useSettings } from '@/store/useSettings';

const ThemeCtx = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const theme = useMemo(() => makeTheme(settings.accent as AccentKey), [settings.accent]);
  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
