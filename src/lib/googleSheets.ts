import Papa from 'papaparse';

import { Quote } from '@/data/types';

export class SheetImportError extends Error {}

const NOT_PUBLIC_MESSAGE = 'Could not read that sheet. Make sure it’s shared as "Anyone with the link can view".';

function parseSheetUrl(url: string): { sheetId: string; gid: string | null } {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) throw new SheetImportError('That doesn’t look like a Google Sheets link.');
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  return { sheetId: idMatch[1], gid: gidMatch?.[1] ?? null };
}

// The sheet must be shared as "Anyone with the link can view" — this fetches
// the public CSV export directly, no OAuth/Drive picker involved. If it's
// not actually public, Google serves an HTML sign-in page instead of a CSV.
export async function fetchAphorismsFromSheet(url: string): Promise<Quote[]> {
  const { sheetId, gid } = parseSheetUrl(url);
  // Omit gid entirely when the pasted URL didn't specify one — defaulting to
  // gid=0 breaks sheets (e.g. ones converted from an uploaded .xlsx) whose
  // first/only tab isn't actually gid 0, which 400s instead of falling back
  // to the default tab the way leaving the param off does.
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid ? `&gid=${gid}` : ''}`;

  let res: Response;
  try {
    res = await fetch(exportUrl);
  } catch {
    throw new SheetImportError('Could not reach Google Sheets. Check your connection and try again.');
  }
  if (!res.ok) throw new SheetImportError(NOT_PUBLIC_MESSAGE);

  const text = await res.text();
  if (text.trim().startsWith('<')) throw new SheetImportError(NOT_PUBLIC_MESSAGE);

  const { data } = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const rows = data.slice(1); // first row is a header: Aphorism, Attribution

  const quotes: Quote[] = [];
  for (const row of rows) {
    const quoteText = (row[0] ?? '').trim();
    const attr = (row[1] ?? '').trim();
    if (!quoteText) continue;
    quotes.push({ text: quoteText, attr: attr || undefined });
  }
  return quotes;
}
