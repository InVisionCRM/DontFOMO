/**
 * clipboard.ts — the Clipboard app's data model.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * The Clipboard app holds the player's copied-text history. Most
 * entries are inert flavour — but a copied **seed phrase** is the
 * arming mechanism for the flagship Slow Burn (Scam Library v1.1
 * Event #5, the Clipboard Scam): the entry sits silently in
 * history, the Scam Director's clipboard-scan tick finds it on a
 * later run, and the wallet detonates. The player can defuse the
 * trap at any time before detonation by deleting the entry.
 *
 * Newest entry first.
 */

/** One copied-text entry — what the player sees in the Clipboard app. */
export interface ClipboardEntry {
  id: string;
  /** The copied text. */
  content: string;
  /** Epoch ms when the content was copied. */
  copiedAt: number;
  /**
   * True when the entry is a known-sensitive copy (today: a seed
   * phrase). The Scam Director keys on this flag during its
   * clipboard-scan tick (see ../scam-director/clipboardScan).
   */
  isSensitive: boolean;
  /**
   * Optional plain-language label of where the copy came from
   * ("Wallet setup", "Mail message", ...). Inert; UX flavour only.
   */
  source?: string;
}

/**
 * History cap. Keeps the list from growing without bound; the most
 * recent copies are what matter.
 */
export const CLIPBOARD_HISTORY_CAP = 20;

/** Prepend a new entry (newest first). Drops the tail at the cap. */
export function addEntry(
  entries: readonly ClipboardEntry[],
  entry: ClipboardEntry,
): ClipboardEntry[] {
  const next = [entry, ...entries];
  return next.length > CLIPBOARD_HISTORY_CAP
    ? next.slice(0, CLIPBOARD_HISTORY_CAP)
    : next;
}

/** Remove the entry with the given id, if present. Pure. */
export function deleteEntry(
  entries: readonly ClipboardEntry[],
  id: string,
): ClipboardEntry[] {
  return entries.filter((e) => e.id !== id);
}

/**
 * Return the first sensitive entry, or null. The Scam Director's
 * clipboard-scan tick consumes this.
 */
export function findSensitive(
  entries: readonly ClipboardEntry[],
): ClipboardEntry | null {
  return entries.find((e) => e.isSensitive) ?? null;
}

/** The most recent entry — what `Paste from clipboard` returns. */
export function readLatest(
  entries: readonly ClipboardEntry[],
): ClipboardEntry | null {
  return entries[0] ?? null;
}
