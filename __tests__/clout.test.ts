/**
 * clout.test.ts — unit tests for the Clout engine.
 * ------------------------------------------------------------------
 * Streak math is the load-bearing piece — ramp, plateau, milestone
 * grace + Diamond, grace usage, and breaks.
 */
import { describe, expect, it } from '@jest/globals';
import {
  STREAK_BREAK_LOSS,
  STREAK_FLAT_REWARD,
  STREAK_GRACE_CAP,
  STREAK_MILESTONE,
  STREAK_RAMP_REWARDS,
  approxFollowingCount,
  applyDailyPost,
  canPostToday,
  clampFeed,
  createDailyPostState,
  dayKey,
  daysBetween,
  pushTweet,
  streakReward,
  type DailyPostState,
  type Tweet,
} from '../src/engine/clout/clout';

const at = (y: number, m: number, d: number, h = 12): number =>
  new Date(y, m, d, h, 0, 0, 0).getTime();

const tweet = (id: string, sentAt: number): Tweet => ({
  id,
  author: { name: 'x', handle: '@x', avatarGradient: ['#000', '#fff'] },
  text: 't',
  sentAt,
});

describe('dayKey / daysBetween', () => {
  it('dayKey formats as YYYY-MM-DD in local time', () => {
    expect(dayKey(at(2026, 4, 23, 14))).toBe('2026-05-23');
  });

  it('daysBetween returns whole local-day diffs', () => {
    expect(daysBetween(at(2026, 4, 23, 23), at(2026, 4, 24, 1))).toBe(1);
    expect(daysBetween(at(2026, 4, 23, 1), at(2026, 4, 23, 23))).toBe(0);
    expect(daysBetween(at(2026, 4, 24, 1), at(2026, 4, 23, 23))).toBe(-1);
  });
});

describe('canPostToday', () => {
  it('is true when no post has happened yet', () => {
    expect(canPostToday(createDailyPostState(), at(2026, 4, 23))).toBe(true);
  });

  it('is false if last post is in the same local day', () => {
    const state: DailyPostState = {
      lastPostAt: at(2026, 4, 23, 8),
      currentStreakDays: 1,
      graceDays: 0,
    };
    expect(canPostToday(state, at(2026, 4, 23, 22))).toBe(false);
  });

  it('flips to true after midnight', () => {
    const state: DailyPostState = {
      lastPostAt: at(2026, 4, 23, 23),
      currentStreakDays: 1,
      graceDays: 0,
    };
    expect(canPostToday(state, at(2026, 4, 24, 0))).toBe(true);
  });
});

describe('streakReward', () => {
  it('ramps days 1..7', () => {
    for (let d = 1; d <= STREAK_RAMP_REWARDS.length; d++) {
      expect(streakReward(d)).toBe(STREAK_RAMP_REWARDS[d - 1]);
    }
  });
  it('plateaus from day 8 onward', () => {
    expect(streakReward(8)).toBe(STREAK_FLAT_REWARD);
    expect(streakReward(50)).toBe(STREAK_FLAT_REWARD);
  });
  it('returns 0 for non-positive streak', () => {
    expect(streakReward(0)).toBe(0);
    expect(streakReward(-1)).toBe(0);
  });
});

describe('applyDailyPost — first-ever post', () => {
  it('starts the streak at day 1 with reward 1', () => {
    const r = applyDailyPost(createDailyPostState(), at(2026, 4, 23));
    expect(r.state.lastPostAt).toBe(at(2026, 4, 23));
    expect(r.state.currentStreakDays).toBe(1);
    expect(r.followersEarned).toBe(1);
    expect(r.diamondsEarned).toBe(0);
    expect(r.streakBroken).toBe(false);
  });
});

describe('applyDailyPost — consecutive days', () => {
  it('ramps through days 2..7', () => {
    let state = createDailyPostState();
    for (let d = 0; d < 7; d++) {
      const r = applyDailyPost(state, at(2026, 4, 23 + d));
      expect(r.state.currentStreakDays).toBe(d + 1);
      expect(r.followersEarned).toBe(STREAK_RAMP_REWARDS[d]);
      state = r.state;
    }
  });

  it('plateaus at +7 from day 8 onward', () => {
    let state = createDailyPostState();
    for (let d = 0; d < 8; d++) {
      state = applyDailyPost(state, at(2026, 4, 23 + d)).state;
    }
    // Day 9
    const r = applyDailyPost(state, at(2026, 4, 23 + 8));
    expect(r.state.currentStreakDays).toBe(9);
    expect(r.followersEarned).toBe(STREAK_FLAT_REWARD);
  });

  it('awards +1 Diamond and banks +1 grace at every 7-day milestone', () => {
    let state = createDailyPostState();
    for (let d = 0; d < 6; d++) {
      state = applyDailyPost(state, at(2026, 4, 23 + d)).state;
    }
    // The 7th post — milestone.
    const r = applyDailyPost(state, at(2026, 4, 23 + 6));
    expect(r.state.currentStreakDays).toBe(STREAK_MILESTONE);
    expect(r.diamondsEarned).toBe(1);
    expect(r.state.graceDays).toBe(1);
  });

  it('caps grace at STREAK_GRACE_CAP across many milestones', () => {
    let state = createDailyPostState();
    for (let d = 0; d < 7 * (STREAK_GRACE_CAP + 2); d++) {
      state = applyDailyPost(state, at(2026, 4, 1 + d)).state;
    }
    expect(state.graceDays).toBe(STREAK_GRACE_CAP);
  });
});

describe('applyDailyPost — same-day no-op', () => {
  it('is idempotent within a single calendar day', () => {
    const first = applyDailyPost(createDailyPostState(), at(2026, 4, 23, 8));
    const second = applyDailyPost(first.state, at(2026, 4, 23, 22));
    expect(second.followersEarned).toBe(0);
    expect(second.diamondsEarned).toBe(0);
    expect(second.state).toEqual(first.state);
  });
});

describe('applyDailyPost — grace absorbs a miss', () => {
  it('spends 1 grace when 1 day was missed and keeps the streak', () => {
    const state: DailyPostState = {
      lastPostAt: at(2026, 4, 20),
      currentStreakDays: 8,
      graceDays: 2,
    };
    // Player skipped May 21; posts on May 22.
    const r = applyDailyPost(state, at(2026, 4, 22));
    expect(r.streakBroken).toBe(false);
    expect(r.graceUsed).toBe(1);
    expect(r.state.graceDays).toBe(1);
    expect(r.state.currentStreakDays).toBe(9);
  });
});

describe('applyDailyPost — streak break', () => {
  it('resets the streak and stings followers when grace runs out', () => {
    const state: DailyPostState = {
      lastPostAt: at(2026, 4, 20),
      currentStreakDays: 12,
      graceDays: 0,
    };
    // Player skipped both May 21 and May 22; posts May 23.
    const r = applyDailyPost(state, at(2026, 4, 23));
    expect(r.streakBroken).toBe(true);
    expect(r.state.currentStreakDays).toBe(1);
    // Day-1 reward (1) minus the break sting (3) = -2.
    expect(r.followersEarned).toBe(STREAK_RAMP_REWARDS[0] - STREAK_BREAK_LOSS);
    expect(r.diamondsEarned).toBe(0);
  });
});

describe('feed helpers', () => {
  it('pushTweet prepends', () => {
    const before = [tweet('a', 1)];
    const after = pushTweet(before, tweet('b', 2));
    expect(after.map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('clampFeed slices to the limit', () => {
    const feed = [tweet('a', 1), tweet('b', 2), tweet('c', 3)];
    expect(clampFeed(feed, 2)).toHaveLength(2);
    expect(clampFeed(feed, 5)).toHaveLength(3);
  });
});

describe('approxFollowingCount', () => {
  it('stays in a believable band for early and mid accounts', () => {
    expect(approxFollowingCount(0)).toBe(24);
    expect(approxFollowingCount(500)).toBeGreaterThan(24);
    expect(approxFollowingCount(50_000)).toBe(999);
  });
});
