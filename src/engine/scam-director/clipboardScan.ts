/**
 * clipboardScan.ts — the Scam Director's clipboard-scan primitive.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * The foundational primitive for **clipboard-class Slow Burn** scams
 * (Scam Library v1.1 §"Engine extensions"). Given the player's
 * clipboard history, find the first entry the Director cares about
 * — today that means a copy of the player's seed phrase, planted at
 * onboarding by the player tapping "Copy to clipboard" (Bible §11,
 * §13, Scam Library Event #5).
 *
 * Two detection paths:
 *  - **`isSensitive`** — fast path. The store flags the entry at the
 *    moment of copy. Most cases hit this.
 *  - **`looksLikePhrase`** — defensive path. If the player ever
 *    pastes their phrase in by some other route, the shape alone
 *    still catches it.
 *
 * The full Director (Stage 6) wraps this tick with: a cooldown
 * after arming, a 1–3 in-game-day detonation delay, the wallet
 * drain on detonation, and the vigilance-reward path if the player
 * defuses by deleting the entry before the window closes.
 */

import {
  findSensitive,
  type ClipboardEntry,
} from '../clipboard/clipboard';
import { looksLikePhrase } from '../onboarding/seedPhrase';

/** What the scan returned — either nothing, or the offending entry. */
export interface ClipboardScanResult {
  /** The entry that armed the scam, or null if none. */
  found: ClipboardEntry | null;
  /** Why the scan flagged it. */
  reason: 'isSensitive' | 'looksLikePhrase' | 'none';
}

/**
 * Scan the clipboard for a phrase-shaped entry. Pure: no time, no
 * state — the caller decides what to do on a hit (typically:
 * schedule the detonation N days out via the Scam Director).
 */
export function scanClipboard(
  entries: readonly ClipboardEntry[],
): ClipboardScanResult {
  const sensitive = findSensitive(entries);
  if (sensitive !== null) {
    return { found: sensitive, reason: 'isSensitive' };
  }
  const shaped = entries.find((e) => looksLikePhrase(e.content));
  if (shaped !== undefined) {
    return { found: shaped, reason: 'looksLikePhrase' };
  }
  return { found: null, reason: 'none' };
}
