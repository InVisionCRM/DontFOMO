/**
 * clock.test.ts — unit tests for the game clock.
 * ------------------------------------------------------------------
 * The clock is pure logic, so these tests need no React Native and no
 * device — they run headless through ts-jest.
 */
import { describe, expect, it } from '@jest/globals';
import {
  DAY_MS,
  createClock,
  dayNumber,
  resumeClock,
  tickClock,
} from '../src/engine/time/clock';

describe('createClock', () => {
  it('anchors all three timestamps to the start moment', () => {
    expect(createClock(1_000)).toEqual({
      startedAt: 1_000,
      lastSeenAt: 1_000,
      now: 1_000,
    });
  });
});

describe('dayNumber', () => {
  it('is day 1 on the start day', () => {
    expect(dayNumber(createClock(0))).toBe(1);
  });

  it('rolls to day 2 once 24h have elapsed', () => {
    expect(dayNumber(tickClock(createClock(0), DAY_MS))).toBe(2);
  });

  it('still reads day 1 just before the first midnight', () => {
    expect(dayNumber(tickClock(createClock(0), DAY_MS - 1))).toBe(1);
  });

  it('counts further days correctly', () => {
    const clock = tickClock(createClock(0), DAY_MS * 9 + 5_000);
    expect(dayNumber(clock)).toBe(10);
  });
});

describe('tickClock', () => {
  it('moves `now` and `lastSeenAt` forward together; start is anchored', () => {
    const ticked = tickClock(createClock(1_000), 5_000);
    expect(ticked.now).toBe(5_000);
    expect(ticked.startedAt).toBe(1_000);
    expect(ticked.lastSeenAt).toBe(5_000);
  });

  it('does not mutate the input clock', () => {
    const original = createClock(1_000);
    tickClock(original, 5_000);
    expect(original.now).toBe(1_000);
    expect(original.lastSeenAt).toBe(1_000);
  });

  it('clamps a backwards device clock — never moves anchors into the past', () => {
    const clock = { startedAt: 0, lastSeenAt: 10_000, now: 10_000 };
    const ticked = tickClock(clock, 4_000);
    expect(ticked.now).toBe(10_000);
    expect(ticked.lastSeenAt).toBe(10_000);
  });

  it('a resume immediately after a tick reports ~zero elapsed time', () => {
    // Regression guard: pre-fix, `tickClock` left `lastSeenAt` alone,
    // so a long foreground session followed by `resume(now)` would
    // replay every foreground tick as if it were offline catch-up.
    // With the anchor advancing on each tick, the elapsed gap is zero.
    const start = createClock(0);
    const afterSession = tickClock(start, DAY_MS);
    const resumed = resumeClock(afterSession, DAY_MS);
    expect(resumed.elapsedMs).toBe(0);
    expect(resumed.elapsedDays).toBe(0);
  });

  it('resume after a tick only sees the genuine offline gap', () => {
    const HOUR = 3_600_000;
    const session = tickClock(createClock(0), HOUR);
    const resumed = resumeClock(session, HOUR + 6 * HOUR);
    expect(resumed.elapsedMs).toBe(6 * HOUR);
    expect(resumed.clock.lastSeenAt).toBe(HOUR + 6 * HOUR);
  });
});

describe('resumeClock', () => {
  it('reports the time elapsed since the engine last saw the player', () => {
    const result = resumeClock(createClock(0), DAY_MS * 2 + 3_000);
    expect(result.elapsedMs).toBe(DAY_MS * 2 + 3_000);
    expect(result.elapsedDays).toBe(2);
    expect(result.clock.lastSeenAt).toBe(DAY_MS * 2 + 3_000);
    expect(result.clock.now).toBe(DAY_MS * 2 + 3_000);
  });

  it('clamps a backwards device clock to zero elapsed time', () => {
    const clock = { startedAt: 0, lastSeenAt: 10_000, now: 10_000 };
    const result = resumeClock(clock, 4_000);
    expect(result.elapsedMs).toBe(0);
    expect(result.clock.lastSeenAt).toBe(10_000);
    expect(result.clock.now).toBe(10_000);
  });

  it('does not mutate the input clock', () => {
    const original = createClock(0);
    resumeClock(original, DAY_MS);
    expect(original.lastSeenAt).toBe(0);
  });
});
