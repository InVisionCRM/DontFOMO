/**
 * dailyPostTweet.ts — the player's own tweet when they tap Post.
 * ------------------------------------------------------------------
 * Makes the Daily Post feel like a real social action, not just a
 * follower counter. One short line per calendar day, deterministic
 * from the day key so reloads stay consistent.
 */
import type { AvatarGradient, Tweet, TweetAuthor } from './clout';
import { dayKey } from './clout';
import { displayNameFromHandle } from '../profile/displayName';

const DAILY_LINES = [
  'gm. another day surviving the trenches.',
  'still here. still down bad. still not selling.',
  'touch grass? never heard of her.',
  'portfolio looking healthy (mentally, not financially).',
  'if you know you know. if you dont, ngmi.',
  'chart said maybe. i said definitely.',
  'not financial advice. barely financial literacy.',
] as const;

function lineIndexForDay(day: string, handle: string): number {
  let h = 0;
  const key = `${day}:${handle}`;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h) % DAILY_LINES.length;
}

/** Build the tweet that lands at the top of the feed after a daily post. */
export function createPlayerDailyTweet(
  now: number,
  handle: string,
  avatarGradient: AvatarGradient,
): Tweet {
  const day = dayKey(now);
  const name = displayNameFromHandle(handle);
  const author: TweetAuthor = {
    name,
    handle: handle.startsWith('@') ? handle : `@${handle}`,
    avatarGradient,
    verified: false,
  };
  return {
    id: `player-post-${day}`,
    author,
    text: DAILY_LINES[lineIndexForDay(day, handle)],
    sentAt: now,
    stats: { replies: 0, reposts: 0, likes: 0, views: 0 },
  };
}
