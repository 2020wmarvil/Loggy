import { useCallback } from 'react';

import { useAppData } from '@/store/AppDataContext';
import { NotesFontSize } from '@/data/types';

// Notification scheduling (the toggle, clear-all, and their background sync
// effects) lives in AppDataProvider, not here — useSettings is called from
// five different screens, and state/effects defined in a plain hook are
// re-created independently per call site. See the comment above notifOpRef
// in AppDataContext.tsx for why that mattered.
export function useSettings() {
  const {
    settings,
    setSettings,
    toggleNotifications,
    notifPending,
    clearAllNotifications,
    notifClearing,
  } = useAppData();

  const setAccent = useCallback((accent: string) => setSettings((s) => ({ ...s, accent })), [setSettings]);
  const toggleWeather = useCallback(() => setSettings((s) => ({ ...s, showWeather: !s.showWeather })), [setSettings]);
  const setNotesFontSize = useCallback(
    (notesFontSize: NotesFontSize) => setSettings((s) => ({ ...s, notesFontSize })),
    [setSettings]
  );

  return {
    settings,
    setAccent,
    toggleWeather,
    toggleNotifications,
    notifPending,
    clearAllNotifications,
    notifClearing,
    setNotesFontSize,
  };
}
