import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share } from 'react-native';

import { StorageKeys } from '@/lib/storage';

// A ring buffer of notification lifecycle events (channel setup, permission
// checks, scheduling results, errors) persisted to AsyncStorage so they can
// be pulled off a standalone build — where there's no Metro console — via
// shareNotifLog() and sent back for debugging.
const MAX_ENTRIES = 200;

type LogEntry = { ts: string; message: string };

async function readLog(): Promise<LogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.NotifLog);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function logNotifEvent(message: string): Promise<void> {
  try {
    const entries = await readLog();
    entries.push({ ts: new Date().toISOString(), message });
    while (entries.length > MAX_ENTRIES) entries.shift();
    await AsyncStorage.setItem(StorageKeys.NotifLog, JSON.stringify(entries));
  } catch {
    // logging must never break the notification flow it's observing
  }
}

export async function clearNotifLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(StorageKeys.NotifLog);
  } catch {
    // best-effort
  }
}

export async function shareNotifLog(): Promise<void> {
  const entries = await readLog();
  const text = entries.length
    ? entries.map((e) => `${e.ts}  ${e.message}`).join('\n')
    : '(no notification log entries yet — toggle Schedule alerts off and on to generate some)';
  await Share.share({ message: text, title: 'Loggy notification log' });
}
