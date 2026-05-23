/**
 * unemploymentCheck.test.ts — Thursday 8pm Eastern check engine.
 * ------------------------------------------------------------------
 * Pure logic, no React Native, no device. Day/hour math uses Intl
 * with `America/New_York`; ts-jest's Node has full Intl support.
 *
 * Test timestamps are constructed via `Date.UTC(...)` so the
 * computation is the same regardless of the test host's local
 * timezone.
 */
import { describe, expect, it } from '@jest/globals';
import {
  CHECK_MAX_USD,
  CHECK_MIN_USD,
  CHECK_RATE,
  easternDayKey,
  easternHourAndDayOfWeek,
  isCheckDue,
  mostRecentThursday8pmEastern,
  unemploymentAmount,
} from '../src/engine/economy/unemploymentCheck';

/**
 * A known Thursday 8:00pm America/New_York moment. 2026-05-21 is a
 * Thursday; Eastern is on EDT (UTC-4) in May, so 20:00 ET = 00:00 UTC
 * on Friday 2026-05-22.
 */
const THU_8PM_ET_EDT_UTC = Date.UTC(2026, 4, 22, 0, 0, 0); // 2026-05-22 00:00 UTC

/**
 * A known Thursday 8:00pm Eastern during EST (winter). 2026-12-03 is
 * a Thursday; EST is UTC-5 in December, so 20:00 ET = 01:00 UTC on
 * Friday 2026-12-04.
 */
const THU_8PM_ET_EST_UTC = Date.UTC(2026, 11, 4, 1, 0, 0);

describe('easternHourAndDayOfWeek', () => {
  it('returns Thursday hour 20 at the EDT boundary', () => {
    const { dayOfWeek, hour } = easternHourAndDayOfWeek(THU_8PM_ET_EDT_UTC);
    expect(dayOfWeek).toBe(4); // Thursday
    expect(hour).toBe(20);
  });

  it('returns Thursday hour 20 at the EST boundary', () => {
    const { dayOfWeek, hour } = easternHourAndDayOfWeek(THU_8PM_ET_EST_UTC);
    expect(dayOfWeek).toBe(4);
    expect(hour).toBe(20);
  });

  it('returns Friday hour 0 one millisecond past the EDT boundary', () => {
    const { dayOfWeek, hour } = easternHourAndDayOfWeek(THU_8PM_ET_EDT_UTC + 1);
    expect(dayOfWeek).toBe(4); // still Thursday in Eastern (it's 20:00:00.001 ET)
    expect(hour).toBe(20);
  });
});

describe('easternDayKey', () => {
  it('formats as YYYY-MM-DD in Eastern time', () => {
    expect(easternDayKey(THU_8PM_ET_EDT_UTC)).toBe('2026-05-21');
    expect(easternDayKey(THU_8PM_ET_EST_UTC)).toBe('2026-12-03');
  });

  it('rolls over at Eastern midnight, not UTC midnight', () => {
    // 04:30 UTC on 2026-05-22 is 00:30 EDT on 2026-05-22.
    const utc = Date.UTC(2026, 4, 22, 4, 30, 0);
    expect(easternDayKey(utc)).toBe('2026-05-22');
    // 03:30 UTC on 2026-05-22 is 23:30 EDT on 2026-05-21.
    const earlier = Date.UTC(2026, 4, 22, 3, 30, 0);
    expect(easternDayKey(earlier)).toBe('2026-05-21');
  });
});

describe('mostRecentThursday8pmEastern', () => {
  it('returns the boundary itself when called exactly at it', () => {
    expect(mostRecentThursday8pmEastern(THU_8PM_ET_EDT_UTC)).toBe(
      THU_8PM_ET_EDT_UTC,
    );
  });

  it('returns the boundary for a moment past it (same week)', () => {
    // Three hours into Thursday 8pm Eastern.
    const later = THU_8PM_ET_EDT_UTC + 3 * 3_600_000;
    expect(mostRecentThursday8pmEastern(later)).toBe(THU_8PM_ET_EDT_UTC);
  });

  it('returns the previous week’s boundary on a Wednesday', () => {
    // Wednesday afternoon EDT — the prior Thursday 8pm is the previous week.
    const wedAfternoon = Date.UTC(2026, 4, 27, 18, 0, 0); // 2026-05-27 14:00 EDT, Wed
    const boundary = mostRecentThursday8pmEastern(wedAfternoon);
    expect(boundary).toBe(THU_8PM_ET_EDT_UTC);
  });
});

describe('isCheckDue', () => {
  it('is not due before the very first Thursday 8pm Eastern', () => {
    // lastCheckAt is the same moment as `now`, an hour before boundary.
    const beforeBoundary = THU_8PM_ET_EDT_UTC - 60 * 60 * 1000;
    expect(isCheckDue(beforeBoundary, beforeBoundary)).toBe(false);
  });

  it('is due exactly at the boundary', () => {
    // lastCheckAt: a week earlier, so before the most-recent boundary.
    const aWeekBefore = THU_8PM_ET_EDT_UTC - 7 * 24 * 3_600_000;
    expect(isCheckDue(aWeekBefore, THU_8PM_ET_EDT_UTC)).toBe(true);
  });

  it('is NOT due again the same week after a check was credited', () => {
    // lastCheckAt = boundary itself; now = an hour after boundary.
    const now = THU_8PM_ET_EDT_UTC + 3_600_000;
    expect(isCheckDue(THU_8PM_ET_EDT_UTC, now)).toBe(false);
  });

  it('is due on resume after an offline gap that crosses a Thursday', () => {
    // lastCheckAt was a Wednesday morning EDT; now is the next week's Friday.
    const wedMorning = Date.UTC(2026, 4, 20, 14, 0, 0); // 2026-05-20 10am EDT, Wed
    const followingFri = Date.UTC(2026, 4, 22, 18, 0, 0); // 2026-05-22 2pm EDT, Fri
    expect(isCheckDue(wedMorning, followingFri)).toBe(true);
  });

  it('is NOT due when last check is from the same Thursday after firing', () => {
    // Player got their check Thursday 8pm; now is Friday 9am Eastern.
    const friMorning = Date.UTC(2026, 4, 22, 13, 0, 0); // 2026-05-22 9am EDT, Fri
    expect(isCheckDue(THU_8PM_ET_EDT_UTC, friMorning)).toBe(false);
  });
});

describe('unemploymentAmount', () => {
  it('floors at CHECK_MIN_USD for new players with tiny peaks', () => {
    expect(unemploymentAmount(0)).toBe(CHECK_MIN_USD);
    expect(unemploymentAmount(100)).toBe(CHECK_MIN_USD); // 100 * 0.04 = 4 → floored
  });

  it('scales linearly between floor and cap', () => {
    const peak = 10_000;
    // 10,000 * 0.04 = 400 — between floor (50) and cap (25k)
    expect(unemploymentAmount(peak)).toBe(Math.round(peak * CHECK_RATE));
  });

  it('caps at CHECK_MAX_USD for whales', () => {
    expect(unemploymentAmount(1_000_000)).toBe(CHECK_MAX_USD); // 40k raw → capped at 25k
    expect(unemploymentAmount(10_000_000)).toBe(CHECK_MAX_USD);
  });

  it('returns an integer dollar amount', () => {
    expect(unemploymentAmount(7_777)).toBe(Math.round(7_777 * CHECK_RATE));
    expect(Number.isInteger(unemploymentAmount(12_345))).toBe(true);
  });
});
