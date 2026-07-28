import { useCallback, useState } from 'react';

import { fetchAphorismsFromSheet, SheetImportError } from '@/lib/googleSheets';
import { useAppData } from '@/store/AppDataContext';

interface SyncOptions {
  silent?: boolean;
}

export function useAphorisms() {
  const {
    aphorisms,
    setAphorisms,
    aphorismSheetUrl,
    setAphorismSheetUrl,
    aphorismSyncedAt,
    setAphorismSyncedAt,
    hydrated,
  } = useAppData();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runFetch = useCallback(
    async (url: string, opts?: SyncOptions): Promise<boolean> => {
      setSyncing(true);
      if (!opts?.silent) setError(null);
      try {
        const quotes = await fetchAphorismsFromSheet(url);
        setAphorisms(quotes);
        setAphorismSheetUrl(url);
        setAphorismSyncedAt(new Date().toISOString());
        if (!opts?.silent) setError(null);
        return true;
      } catch (e) {
        if (!opts?.silent) {
          setError(e instanceof SheetImportError ? e.message : 'Something went wrong importing that sheet.');
        }
        return false;
      } finally {
        setSyncing(false);
      }
    },
    [setAphorisms, setAphorismSheetUrl, setAphorismSyncedAt]
  );

  const link = useCallback((url: string) => runFetch(url), [runFetch]);

  const sync = useCallback(
    (opts?: SyncOptions) => {
      if (!aphorismSheetUrl) return Promise.resolve(false);
      return runFetch(aphorismSheetUrl, opts);
    },
    [aphorismSheetUrl, runFetch]
  );

  const unlink = useCallback(() => {
    setAphorismSheetUrl(null);
    setAphorisms([]);
    setAphorismSyncedAt(null);
    setError(null);
  }, [setAphorismSheetUrl, setAphorisms, setAphorismSyncedAt]);

  return {
    aphorisms,
    sheetUrl: aphorismSheetUrl,
    syncedAt: aphorismSyncedAt,
    hydrated,
    syncing,
    error,
    link,
    sync,
    unlink,
  };
}
