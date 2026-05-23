/**
 * unemploymentCheck.ts — the Thursday 8pm Eastern unemployment check.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * Bible §14: every player receives a weekly unemployment check at
 * **Thursday 20:00 (8pm) America/New_York**. The amount scales with
 * the player's **lifetime peak net worth** — a veteran who once held
 * $1M and lost it all gets a big cushion to climb back on; a fresh
 * player on the same low balance gets only a small one.
 *
 * Eastern Time handling uses `Intl.DateTimeFormat` with the
 * `America/New_York` timezone — RN/Hermes ship full Intl, so this
 * works on device and in the ts-jest harness.
 */

/** Index of Thursday in the JS day-of-week scheme (Sun=0..Sat=6). */
export const CHECK_DAY_OF_WEEK = 4;
/** Hour of day in Eastern time when the check fires (24h clock). */
export const CHECK_HOUR_EASTERN = 20;
/** Floor on the check amount — every player at least gets this. */
export const CHECK_MIN_USD = 50;
/** Cap on the check amount — even a billionaire doesn't get more. */
export const CHECK_MAX_USD = 25_000;
/** Fraction of lifetime peak net worth paid out each week. */
export const CHECK_RATE = 0.04;

/** A short weekday string + an integer Eastern hour for a timestamp. */
interface EasternTimeParts {
  /** 0 = Sunday, 4 = Thursday, 6 = Saturday. */
  dayOfWeek: number;
  /** 0..23 in Eastern local time. */
  hour: number;
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Day-of-week + hour of an epoch ms as observed in `America/New_York`. */
export function easternHourAndDayOfWeek(epochMs: number): EasternTimeParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    weekday: 'short',
    hour12: false,
  }).formatToParts(new Date(epochMs));
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hourRaw = parts.find((p) => p.type === 'hour')?.value ?? '0';
  // Intl can return `24` for midnight in 24-hour mode; normalise to 0.
  const hourParsed = parseInt(hourRaw, 10);
  const hour = hourParsed === 24 ? 0 : hourParsed;
  return { dayOfWeek: WEEKDAY_TO_INDEX[weekday] ?? 0, hour };
}

/** Calendar-date key (YYYY-MM-DD) for a timestamp in Eastern time. */
export function easternDayKey(epochMs: number): string {
  // en-CA's locale-default format is YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(epochMs));
}

/**
 * The UTC ms of the most recent Thursday 8:00pm Eastern at or before
 * `now`. Iterates back hour-by-hour up to one week — bounded and
 * cheap (~168 calls worst case, weekly tick frequency).
 *
 * Returns 0 if no boundary can be found within a week (shouldn't
 * happen in practice).
 */
export function mostRecentThursday8pmEastern(now: number): number {
  // Snap to the start of the current UTC hour so the search lands
  // on whole-hour alignments.
  let t = now - (now % 3_600_000);
  for (let i = 0; i < 24 * 8; i++) {
    const { hour, dayOfWeek } = easternHourAndDayOfWeek(t);
    if (dayOfWeek === CHECK_DAY_OF_WEEK && hour === CHECK_HOUR_EASTERN) {
      return t;
    }
    t -= 3_600_000;
  }
  return 0;
}

/**
 * True if a check is owed: the most recent Thursday 8pm boundary has
 * passed AND no check has been credited since.
 *
 * The boundary may have been crossed during an offline gap (player
 * was away for a week), so this works for both live and resume.
 */
export function isCheckDue(lastCheckAt: number, now: number): boolean {
  const boundary = mostRecentThursday8pmEastern(now);
  if (boundary === 0) return false;
  return lastCheckAt < boundary && now >= boundary;
}

/**
 * Unemployment check amount in USD, scaled to the player's lifetime
 * peak net worth. Floored at `CHECK_MIN_USD` so brand-new players
 * still get something; capped at `CHECK_MAX_USD` so the formula
 * doesn't run away for whales.
 */
export function unemploymentAmount(peakNetWorth: number): number {
  const raw = peakNetWorth * CHECK_RATE;
  const bounded = Math.min(CHECK_MAX_USD, Math.max(CHECK_MIN_USD, raw));
  return Math.round(bounded);
}
