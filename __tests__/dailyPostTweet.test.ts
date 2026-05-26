import { describe, expect, it } from '@jest/globals';
import { createPlayerDailyTweet } from '../src/engine/clout/dailyPostTweet';
import { dayKey } from '../src/engine/clout';

describe('createPlayerDailyTweet', () => {
  const now = Date.parse('2026-05-26T12:00:00');

  it('uses the player handle and a stable id per day', () => {
    const tweet = createPlayerDailyTweet(now, '@test_player', [
      '#1D9BF0',
      '#0A4A8A',
    ]);
    expect(tweet.author.handle).toBe('@test_player');
    expect(tweet.author.name).toBe('Test Player');
    expect(tweet.id).toBe(`player-post-${dayKey(now)}`);
    expect(tweet.text.length).toBeGreaterThan(10);
  });

  it('picks the same line for the same day and handle', () => {
    const a = createPlayerDailyTweet(now, '@alice', ['#000', '#111']);
    const b = createPlayerDailyTweet(now, '@alice', ['#000', '#111']);
    expect(a.text).toBe(b.text);
  });
});
