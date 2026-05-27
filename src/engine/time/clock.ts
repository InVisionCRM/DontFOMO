/**
 * clock.ts — the game clock.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React, no React Native imports (CLAUDE.md §5).
 *
 * DON'T FOMO runs on a real-time calendar (Design Bible §2): one
 * in-game day = one real day, and the in-game date IS the real date.
 * The clock therefore just tracks two anchors — when the game began
 * and when the engine last saw the player — and derives everything
 * else (the day number, offline elapsed time) from the real clock.
 *
 * Every function here is pure: it returns new values and never mutates
 * its inputs, so the engine can be fast-forwarded and unit-tested.
 */

/** Milliseconds in one day. */
export const DAY_MS = 86_400_000;

/** The game clock — three epoch-millisecond timestamps. */
export interface GameClock {
  /** When this game (this character) was first started. */
  startedAt: number;
  /** When the engine last advanced the world — the offline anchor. */
  lastSeenAt: number;
  /** The current moment, moved forward by every tick. */
  now: number;
}

/** The result of an offline catch-up. */
export interface ResumeResult {
  /** The clock advanced to `now`, with `lastSeenAt` updated. */
  clock: GameClock;
  /** Real time that elapsed since the engine last saw the player. */
  elapsedMs: number;
  /** Whole days within `elapsedMs`. */
  elapsedDays: number;
}

/** Create a fresh clock for a brand-new game. */
export function createClock(now: number): GameClock {
  return { startedAt: now, lastSeenAt: now, now };
}

/**
 * The in-game day number. Day 1 is the day the game started; it rolls
 * to day 2 once a full 24h has elapsed since `startedAt`.
 */
export function dayNumber(clock: GameClock): number {
  return Math.floor((clock.now - clock.startedAt) / DAY_MS) + 1;
}

/**
 * Move the clock to a new `now` (a tick). Pure — returns a new clock.
 *
 * `lastSeenAt` is advanced alongside `now`: a foreground tick is proof
 * the engine has just synced with reality, so the offline anchor moves
 * forward with it. If this didn't happen, a long foreground session
 * followed by a background → resume would replay every foreground tick
 * as catch-up (the market would advance by the full session length
 * twice — once live, once on resume). `now` is clamped so a backwards
 * device clock cannot push the anchor into the past.
 */
export function tickClock(clock: GameClock, now: number): GameClock {
  const safeNow = Math.max(now, clock.lastSeenAt);
  return {
    startedAt: clock.startedAt,
    lastSeenAt: safeNow,
    now: safeNow,
  };
}

/**
 * Offline catch-up. Called when the game resumes — the app refocuses,
 * or a save is reloaded. Returns how much real time passed since
 * `lastSeenAt`, so later systems (market, events, scams) can
 * fast-forward the world. For now it only advances the clock.
 *
 * `now` is clamped so a backwards device clock can never produce
 * negative elapsed time.
 */
export function resumeClock(clock: GameClock, now: number): ResumeResult {
  const safeNow = Math.max(now, clock.lastSeenAt);
  const elapsedMs = safeNow - clock.lastSeenAt;
  return {
    clock: { startedAt: clock.startedAt, lastSeenAt: safeNow, now: safeNow },
    elapsedMs,
    elapsedDays: Math.floor(elapsedMs / DAY_MS),
  };
}
