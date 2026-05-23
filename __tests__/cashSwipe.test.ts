/**
 * cashSwipe.test.ts — unit tests for the CashSwipe minigame engine.
 * ------------------------------------------------------------------
 * Pure logic, no React Native, no device — ts-jest harness.
 *
 * Day-boundary tests construct timestamps with the `Date(y, m, d, h)`
 * constructor, which is local-time anchored. That keeps the day math
 * consistent regardless of which timezone the test host happens to
 * run in (CI, dev box, whatever).
 */
import { describe, expect, it } from '@jest/globals';
import {
  CASH_SWIPE_DAILY_CAP,
  CASH_SWIPE_USD_PER_SWIPE,
  applySwipe,
  createCashSwipe,
  earnedToday,
  isCapReached,
  localDayKey,
  msUntilLocalMidnight,
  refreshDay,
  swipesRemaining,
  type CashSwipeState,
} from '../src/engine/economy/cashSwipe';

/** Local-time epoch ms for a specific (year, monthIndex, day, hour). */
const localTime = (
  y: number,
  m: number,
  d: number,
  h = 0,
  min = 0,
): number => new Date(y, m, d, h, min, 0, 0).getTime();

describe('localDayKey', () => {
  it('formats as YYYY-MM-DD in local time', () => {
    const key = localDayKey(localTime(2026, 4, 23, 14, 30));
    expect(key).toBe('2026-05-23');
  });

  it('is stable across times within the same local day', () => {
    const morning = localTime(2026, 4, 23, 0, 1);
    const evening = localTime(2026, 4, 23, 23, 59);
    expect(localDayKey(morning)).toBe(localDayKey(evening));
  });

  it('changes at local midnight', () => {
    const beforeMidnight = localTime(2026, 4, 23, 23, 59);
    const afterMidnight = localTime(2026, 4, 24, 0, 1);
    expect(localDayKey(beforeMidnight)).not.toBe(localDayKey(afterMidnight));
    expect(localDayKey(afterMidnight)).toBe('2026-05-24');
  });

  it('zero-pads single-digit months and days', () => {
    expect(localDayKey(localTime(2026, 0, 5, 12))).toBe('2026-01-05');
  });
});

describe('msUntilLocalMidnight', () => {
  it('is positive', () => {
    expect(msUntilLocalMidnight(localTime(2026, 4, 23, 14, 30))).toBeGreaterThan(0);
  });

  it('is ~24h at the start of a day', () => {
    const startOfDay = localTime(2026, 4, 23, 0, 0);
    const ms = msUntilLocalMidnight(startOfDay);
    // Allow a small tolerance for DST transitions / leap considerations.
    expect(ms).toBeGreaterThan(23 * 3600 * 1000);
    expect(ms).toBeLessThanOrEqual(25 * 3600 * 1000);
  });

  it('is ~1 minute when one minute before midnight', () => {
    const oneMinuteBefore = localTime(2026, 4, 23, 23, 59);
    const ms = msUntilLocalMidnight(oneMinuteBefore);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(60_000 + 1_000);
  });
});

describe('createCashSwipe', () => {
  it('seeds today with zero swipes used', () => {
    const t = localTime(2026, 4, 23, 9);
    const state = createCashSwipe(t);
    expect(state.dayKey).toBe('2026-05-23');
    expect(state.swipesUsed).toBe(0);
  });
});

describe('refreshDay', () => {
  it('is a no-op when the day has not changed', () => {
    const morning = localTime(2026, 4, 23, 8);
    const evening = localTime(2026, 4, 23, 22);
    const state: CashSwipeState = { dayKey: localDayKey(morning), swipesUsed: 14 };
    const refreshed = refreshDay(state, evening);
    expect(refreshed).toBe(state); // referential equality — same object
  });

  it('resets swipesUsed to zero when the day has rolled over', () => {
    const state: CashSwipeState = { dayKey: '2026-05-23', swipesUsed: 480 };
    const nextDay = localTime(2026, 4, 24, 9);
    const refreshed = refreshDay(state, nextDay);
    expect(refreshed.dayKey).toBe('2026-05-24');
    expect(refreshed.swipesUsed).toBe(0);
  });

  it('is pure — original state is unchanged across a refresh', () => {
    const state: CashSwipeState = { dayKey: '2026-05-23', swipesUsed: 5 };
    refreshDay(state, localTime(2026, 4, 24, 1));
    expect(state.swipesUsed).toBe(5);
    expect(state.dayKey).toBe('2026-05-23');
  });
});

describe('swipesRemaining / isCapReached', () => {
  it('starts at the daily cap', () => {
    const t = localTime(2026, 4, 23, 9);
    const state = createCashSwipe(t);
    expect(swipesRemaining(state, t)).toBe(CASH_SWIPE_DAILY_CAP);
    expect(isCapReached(state, t)).toBe(false);
  });

  it('drops as swipes are spent', () => {
    const t = localTime(2026, 4, 23, 9);
    const state: CashSwipeState = { dayKey: localDayKey(t), swipesUsed: 250 };
    expect(swipesRemaining(state, t)).toBe(CASH_SWIPE_DAILY_CAP - 250);
  });

  it('is zero and capped when swipesUsed equals the cap', () => {
    const t = localTime(2026, 4, 23, 9);
    const state: CashSwipeState = {
      dayKey: localDayKey(t),
      swipesUsed: CASH_SWIPE_DAILY_CAP,
    };
    expect(swipesRemaining(state, t)).toBe(0);
    expect(isCapReached(state, t)).toBe(true);
  });

  it('refreshes when the day rolls over', () => {
    const yesterday: CashSwipeState = {
      dayKey: '2026-05-23',
      swipesUsed: CASH_SWIPE_DAILY_CAP,
    };
    const today = localTime(2026, 4, 24, 0, 5);
    expect(swipesRemaining(yesterday, today)).toBe(CASH_SWIPE_DAILY_CAP);
    expect(isCapReached(yesterday, today)).toBe(false);
  });
});

describe('applySwipe', () => {
  it('spends one swipe and pays $1', () => {
    const t = localTime(2026, 4, 23, 9);
    const state = createCashSwipe(t);
    const { state: next, earned } = applySwipe(state, t);
    expect(earned).toBe(CASH_SWIPE_USD_PER_SWIPE);
    expect(next.swipesUsed).toBe(1);
    expect(next.dayKey).toBe('2026-05-23');
  });

  it('is pure — original state untouched', () => {
    const t = localTime(2026, 4, 23, 9);
    const state = createCashSwipe(t);
    applySwipe(state, t);
    expect(state.swipesUsed).toBe(0);
  });

  it('refuses (earned = 0) when the cap is hit', () => {
    const t = localTime(2026, 4, 23, 9);
    const state: CashSwipeState = {
      dayKey: localDayKey(t),
      swipesUsed: CASH_SWIPE_DAILY_CAP,
    };
    const { state: next, earned } = applySwipe(state, t);
    expect(earned).toBe(0);
    expect(next.swipesUsed).toBe(CASH_SWIPE_DAILY_CAP);
  });

  it('rolls the day first, then spends — so a swipe across midnight pays', () => {
    const yesterdayCapped: CashSwipeState = {
      dayKey: '2026-05-23',
      swipesUsed: CASH_SWIPE_DAILY_CAP,
    };
    const tomorrow = localTime(2026, 4, 24, 0, 30);
    const { state: next, earned } = applySwipe(yesterdayCapped, tomorrow);
    expect(earned).toBe(CASH_SWIPE_USD_PER_SWIPE);
    expect(next.dayKey).toBe('2026-05-24');
    expect(next.swipesUsed).toBe(1);
  });

  it('a full day of swipes earns exactly cap × $1, then no more', () => {
    const t = localTime(2026, 4, 23, 9);
    let s = createCashSwipe(t);
    let total = 0;
    for (let i = 0; i < CASH_SWIPE_DAILY_CAP + 5; i++) {
      const r = applySwipe(s, t);
      s = r.state;
      total += r.earned;
    }
    expect(total).toBe(CASH_SWIPE_DAILY_CAP * CASH_SWIPE_USD_PER_SWIPE);
    expect(s.swipesUsed).toBe(CASH_SWIPE_DAILY_CAP);
  });
});

describe('earnedToday', () => {
  it('reflects spent swipes', () => {
    const t = localTime(2026, 4, 23, 9);
    const state: CashSwipeState = { dayKey: localDayKey(t), swipesUsed: 42 };
    expect(earnedToday(state, t)).toBe(42 * CASH_SWIPE_USD_PER_SWIPE);
  });

  it('returns 0 after a day rollover', () => {
    const yesterday: CashSwipeState = { dayKey: '2026-05-23', swipesUsed: 500 };
    const today = localTime(2026, 4, 24, 1);
    expect(earnedToday(yesterday, today)).toBe(0);
  });
});
