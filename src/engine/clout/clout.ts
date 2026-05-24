/**
 * clout.ts — the Clout app's tweet model + daily-Post streak engine.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * Clout is Bible §6: the player's public identity (handle + bio),
 * the master reputation stat (followers — already in the store),
 * the 5-tweet feed where alpha + scam links arrive, and the
 * **Daily Post** consistency hook.
 *
 * Daily Post rules (Bible §6, v0.9):
 *   - Tap POST once per local calendar day to earn followers.
 *   - Days 1–7: the reward ramps +1, +2, +3, +4, +5, +6, +7.
 *   - Day 7 onward: a flat +7 followers per day.
 *   - Every 7 days of unbroken streak: bank +1 grace day (cap 3),
 *     and the player earns **+1 Diamond**.
 *   - Grace days absorb a missed day automatically.
 *   - Breaking the streak resets to day 1 and applies a one-time
 *     small follower sting; never an escalating per-day bleed.
 */

/** Avatar gradient — top-left to bottom-right colour pair. */
export type AvatarGradient = readonly [string, string];

/** Author of a tweet — name + handle + avatar + verified flag. */
export interface TweetAuthor {
  name: string;
  /** Including the leading "@". */
  handle: string;
  avatarGradient: AvatarGradient;
  verified?: boolean;
}

/** Optional in-tweet link preview card. */
export interface TweetLinkCard {
  domain: string;
  title: string;
  thumbGradient: AvatarGradient;
}

/** Static engagement numbers — flavour only in v1. */
export interface TweetStats {
  replies: number;
  reposts: number;
  likes: number;
  views: number;
}

/** A single tweet in the feed. */
export interface Tweet {
  id: string;
  author: TweetAuthor;
  /** Plain text body. */
  text: string;
  /** Optional link preview rendered under the text. */
  link?: TweetLinkCard;
  sentAt: number;
  /**
   * Phishing / typo-squat / fake-founder tweet. Drives a danger
   * tint on the row. Inert in v1; the Scam Director (Stage 6) will
   * spawn live ones with this flag set.
   */
  isSuspicious?: boolean;
  stats?: TweetStats;
}

/** Daily Post / streak state — persisted in the save. */
export interface DailyPostState {
  /** Epoch ms of the most recent post. 0 if the player has never posted. */
  lastPostAt: number;
  /** Length of the current unbroken streak (in posted days). 0 = no streak. */
  currentStreakDays: number;
  /** Banked grace days the player can spend on a missed day. */
  graceDays: number;
}

/** Maximum grace bank — keeps the cushion punchy, not infinite. */
export const STREAK_GRACE_CAP = 3;
/** Each 7-day milestone banks a grace day AND awards +1 Diamond. */
export const STREAK_MILESTONE = 7;
/** Streak ramp: index 0 = day 1's reward, etc. */
export const STREAK_RAMP_REWARDS = [1, 2, 3, 4, 5, 6, 7] as const;
/** Flat reward from day 8 onward. */
export const STREAK_FLAT_REWARD = 7;
/** Small one-time follower sting when the streak breaks. */
export const STREAK_BREAK_LOSS = 3;

/** A fresh DailyPostState for a new game. */
export function createDailyPostState(): DailyPostState {
  return { lastPostAt: 0, currentStreakDays: 0, graceDays: 0 };
}

/** Local-calendar day key — same format as CashSwipe. */
export function dayKey(epochMs: number): string {
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Whole local-calendar days from `a` to `b` (signed). */
export function daysBetween(a: number, b: number): number {
  const da = new Date(a);
  const db = new Date(b);
  const aDay = new Date(da.getFullYear(), da.getMonth(), da.getDate()).getTime();
  const bDay = new Date(db.getFullYear(), db.getMonth(), db.getDate()).getTime();
  return Math.round((bDay - aDay) / 86_400_000);
}

/** True if the player hasn't posted yet today (local calendar day). */
export function canPostToday(state: DailyPostState, now: number): boolean {
  if (state.lastPostAt === 0) return true;
  return dayKey(state.lastPostAt) !== dayKey(now);
}

/** Followers awarded for posting at a given streak length. */
export function streakReward(streakDays: number): number {
  if (streakDays <= 0) return 0;
  if (streakDays >= STREAK_RAMP_REWARDS.length) return STREAK_FLAT_REWARD;
  return STREAK_RAMP_REWARDS[streakDays - 1];
}

/** Result of an `applyDailyPost`. */
export interface DailyPostResult {
  /** The next state to persist. */
  state: DailyPostState;
  /** Net followers earned (can be negative on a break). */
  followersEarned: number;
  /** Diamonds awarded (0 most days, 1 every 7-day milestone). */
  diamondsEarned: number;
  /** True if a streak break occurred. */
  streakBroken: boolean;
  /** Grace days spent absorbing missed days (0 most posts). */
  graceUsed: number;
}

/**
 * Apply a daily-post tap. Returns the new state and what the player
 * earned. No-op (zero earnings) if the player has already posted
 * today — the caller can use `canPostToday` to gate the UI.
 */
export function applyDailyPost(
  state: DailyPostState,
  now: number,
): DailyPostResult {
  if (!canPostToday(state, now)) {
    return {
      state,
      followersEarned: 0,
      diamondsEarned: 0,
      streakBroken: false,
      graceUsed: 0,
    };
  }

  const isFirstPost = state.lastPostAt === 0;
  let streakDays: number;
  let graceDays = state.graceDays;
  let streakBroken = false;
  let graceUsed = 0;

  if (isFirstPost) {
    streakDays = 1;
  } else {
    const gap = daysBetween(state.lastPostAt, now);
    if (gap <= 1) {
      // Consecutive day (gap === 1) — extend the streak.
      streakDays = state.currentStreakDays + 1;
    } else {
      const missed = gap - 1;
      if (graceDays >= missed) {
        // Burn grace to absorb the gap.
        graceDays -= missed;
        graceUsed = missed;
        streakDays = state.currentStreakDays + 1;
      } else {
        // Streak broken — reset to day 1.
        streakBroken = true;
        streakDays = 1;
      }
    }
  }

  // Followers earned for today's post + optional break sting.
  let followersEarned = streakReward(streakDays);
  if (streakBroken) followersEarned -= STREAK_BREAK_LOSS;

  // Milestone rewards — only on unbroken progression, fired exactly
  // when the streak hits a 7-day boundary.
  let diamondsEarned = 0;
  if (!streakBroken && streakDays > 0 && streakDays % STREAK_MILESTONE === 0) {
    diamondsEarned = 1;
    // Bank a grace day (capped).
    graceDays = Math.min(STREAK_GRACE_CAP, graceDays + 1);
  }

  return {
    state: {
      lastPostAt: now,
      currentStreakDays: streakDays,
      graceDays,
    },
    followersEarned,
    diamondsEarned,
    streakBroken,
    graceUsed,
  };
}

/** Pure helpers for the feed — same shape as Mail / Tunnel / Messages. */

/** Prepend a new tweet to the feed (newest first). */
export function pushTweet(feed: readonly Tweet[], tweet: Tweet): Tweet[] {
  return [tweet, ...feed];
}

/**
 * Cap the feed length — Bible §6: "Feed shows only 5 tweets at
 * first." The skill tree later raises this cap; for now it's a
 * constant the screen can pass.
 */
export function clampFeed(feed: readonly Tweet[], limit: number): Tweet[] {
  return feed.length <= limit ? [...feed] : feed.slice(0, limit);
}
