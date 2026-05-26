import {
  buildNewsFeed,
  headlinesFromVerifiedTweets,
  tweetToHeadlineTitle,
} from '../src/engine/news';
import type { Tweet } from '../src/engine/clout';
import { createStartingNews } from '../src/data/news';

const verifiedTweet: Tweet = {
  id: 'v-1',
  author: {
    name: 'The Crypto Desk',
    handle: '@desk',
    avatarGradient: ['#000', '#111'],
    verified: true,
  },
  text: 'BREAKING: markets are doing a thing.',
  sentAt: 1000,
  stats: { replies: 0, reposts: 0, likes: 0, views: 0 },
};

const unverifiedTweet: Tweet = {
  ...verifiedTweet,
  id: 'u-1',
  author: { ...verifiedTweet.author, verified: false },
};

describe('tweetToHeadlineTitle', () => {
  it('truncates very long bodies', () => {
    const long = 'x'.repeat(200);
    expect(tweetToHeadlineTitle(long).length).toBeLessThanOrEqual(120);
    expect(tweetToHeadlineTitle(long).endsWith('…')).toBe(true);
  });
});

describe('headlinesFromVerifiedTweets', () => {
  it('keeps only verified authors', () => {
    const rows = headlinesFromVerifiedTweets([verifiedTweet, unverifiedTweet]);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('clout-v-1');
    expect(rows[0].category).toBe('breaking');
  });
});

describe('buildNewsFeed', () => {
  it('merges seed and clout, newest first, de-duped', () => {
    const now = 1_000_000;
    const seed = createStartingNews(now);
    const feed = buildNewsFeed(seed, [verifiedTweet], 20);
    expect(feed[0].publishedAt).toBeGreaterThanOrEqual(feed[feed.length - 1].publishedAt);
    const ids = feed.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('clout-v-1');
  });
});
