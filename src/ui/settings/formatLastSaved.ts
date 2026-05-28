/**
 * formatLastSaved.ts — pure formatter for the Settings "last saved" hint.
 * ------------------------------------------------------------------
 * Coarse, low-noise relative time:
 *   - null                 → "Not yet saved"
 *   - < 5 s                → "Just now"
 *   - < 60 s               → "N seconds ago"
 *   - < 60 min             → "N minute(s) ago"
 *   - < 24 h               → "N hour(s) ago"
 *   - same calendar day    → "Today at h:mm"  (rare — covered above)
 *   - yesterday            → "Yesterday at h:mm"
 *   - older                → short date + time, e.g. "May 24 at 9:41"
 *
 * Defensive against future-dated `at` values (e.g. clock skew after a
 * fresh save): treated as "Just now". Pure — no React, no RN imports.
 */

import { formatTime } from '../format';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatLastSaved(at: number | null, now: number): string {
  if (at === null) return 'Not yet saved';

  const delta = now - at;
  if (delta < 5 * SECOND) return 'Just now';
  if (delta < MINUTE) {
    const s = Math.floor(delta / SECOND);
    return `${s} seconds ago`;
  }
  if (delta < HOUR) {
    const m = Math.floor(delta / MINUTE);
    return `${m} ${m === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (delta < DAY) {
    const h = Math.floor(delta / HOUR);
    return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  }

  const a = new Date(at);
  const n = new Date(now);
  const yesterday = new Date(n);
  yesterday.setDate(n.getDate() - 1);
  if (a.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${formatTime(at)}`;
  }
  const date = a.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${date} at ${formatTime(at)}`;
}
