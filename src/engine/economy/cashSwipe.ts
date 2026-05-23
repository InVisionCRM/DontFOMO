/**
 * cashSwipe.ts — the CashSwipe minigame rules.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * The CashSwipe app is the income floor — the guaranteed comeback path
 * (Design Bible §3). Each swipe pays the player **$1** in cash, capped
 * at **1,000 swipes per local calendar day** (KG, 2026-05-23). The cap
 * resets at the player's local midnight; an offline catch-up that
 * spans one or more midnights simply lands the player on the new day
 * with the cap refreshed.
 *
 * The cap is local-midnight, not 24h-rolling — so "today" matches the
 * player's expectation of a day, and the UI can show a "comes back at
 * midnight" countdown.
 */

/** The daily swipe cap. */
export const CASH_SWIPE_DAILY_CAP = 1_000;

/** USD earned per successful swipe. */
export const CASH_SWIPE_USD_PER_SWIPE = 1;

/**
 * Local-time day key — a stable `YYYY-MM-DD` string for the calendar
 * day the timestamp falls into. We use this as the cap's reset
 * anchor: when today's key differs from the stored key, the cap is
 * refreshed.
 *
 * Implemented via the device's local timezone (`Date` defaults to
 * local). Engine purity is preserved — the function is deterministic
 * for any given (now, device-tz) pair, and tests pin a fixed local
 * timezone in the harness.
 */
export function localDayKey(now: number): string {
  const d = new Date(now);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Milliseconds until the next local midnight after `now`. */
export function msUntilLocalMidnight(now: number): number {
  const d = new Date(now);
  const tomorrow = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return tomorrow.getTime() - now;
}

/** Mutable CashSwipe state — what gets persisted in the save. */
export interface CashSwipeState {
  /** The local calendar day the count below belongs to. */
  dayKey: string;
  /** Swipes already spent on `dayKey`. */
  swipesUsed: number;
}

/** A fresh CashSwipe state for a new game — today, no swipes spent. */
export function createCashSwipe(now: number): CashSwipeState {
  return { dayKey: localDayKey(now), swipesUsed: 0 };
}

/**
 * If `now` is in a different local day than the state's `dayKey`,
 * reset to zero swipes used. Pure — returns the original state if
 * the day hasn't changed.
 */
export function refreshDay(
  state: CashSwipeState,
  now: number,
): CashSwipeState {
  const today = localDayKey(now);
  if (today === state.dayKey) return state;
  return { dayKey: today, swipesUsed: 0 };
}

/** Swipes still available today (0..CASH_SWIPE_DAILY_CAP). */
export function swipesRemaining(
  state: CashSwipeState,
  now: number,
): number {
  const today = refreshDay(state, now);
  return Math.max(0, CASH_SWIPE_DAILY_CAP - today.swipesUsed);
}

/** Has the player hit today's cap? */
export function isCapReached(state: CashSwipeState, now: number): boolean {
  return swipesRemaining(state, now) <= 0;
}

/** Result of one swipe attempt. */
export interface SwipeResult {
  /** The new state after the attempt (day-rolled if a midnight crossed). */
  state: CashSwipeState;
  /** USD the player earned — 0 if the cap had already been hit. */
  earned: number;
}

/**
 * Spend one swipe. Returns the new state and what the player earned.
 * If the cap is already hit, the state advances any day boundary but
 * `earned` is 0.
 */
export function applySwipe(state: CashSwipeState, now: number): SwipeResult {
  const today = refreshDay(state, now);
  if (today.swipesUsed >= CASH_SWIPE_DAILY_CAP) {
    return { state: today, earned: 0 };
  }
  return {
    state: { dayKey: today.dayKey, swipesUsed: today.swipesUsed + 1 },
    earned: CASH_SWIPE_USD_PER_SWIPE,
  };
}

/** USD already earned from CashSwipe on today's `dayKey`. */
export function earnedToday(state: CashSwipeState, now: number): number {
  const today = refreshDay(state, now);
  return today.swipesUsed * CASH_SWIPE_USD_PER_SWIPE;
}
