/**
 * news.ts — seed News articles for a fresh game (Stage 6).
 * ------------------------------------------------------------------
 * Pure data. Timestamps are anchored to `now` so relative times read
 * naturally on first launch. Category chips and copy align with the
 * approved News mockup tone.
 */
import type { NewsArticle } from '../engine/news/news';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function createStartingNews(now: number): NewsArticle[] {
  return [
    {
      id: 'news-neura-rally',
      headline: 'NEURA posts best week since launch as “AI season” returns',
      summary:
        'Desk traders cite thin liquidity and renewed CT hype. Your Exchange holdings may feel it before the headlines do.',
      category: 'Market',
      publishedAt: now - 2 * HOUR,
      source: 'BlockBeat',
    },
    {
      id: 'news-frozen-withdrawals',
      headline: 'Regulators warn on “frozen withdrawal” fees on fake platforms',
      summary:
        'Victims report balances stuck until they pay bogus verification charges. Real exchanges do not ask for upfront unlock fees.',
      category: 'Scams',
      publishedAt: now - 5 * HOUR,
      source: 'ChainGuardian',
    },
    {
      id: 'news-clipboard-malware',
      headline: 'Clipboard stealers target mobile wallet setups',
      summary:
        'Security firms say copying a seed phrase on a shared device is the fastest way to lose everything — delete it after backup.',
      category: 'Scams',
      publishedAt: now - 1 * DAY,
      source: 'LedgerWire',
    },
    {
      id: 'news-diamond-meta',
      headline: '“Diamond hands” posts still outperform bearish threads on Clout',
      summary:
        'Analysts call it cope; influencers call it strategy. Streak posts keep earning quiet reputation bumps.',
      category: 'Culture',
      publishedAt: now - 1 * DAY - 3 * HOUR,
      source: 'Trending on X',
    },
    {
      id: 'news-unemployment',
      headline: 'Weekly “unemployment check” meme explained for new players',
      summary:
        'The game’s safety net scales with your peak net worth — not your current bag. Plan for Thursdays.',
      category: 'Culture',
      publishedAt: now - 2 * DAY,
      source: 'DontFOMO Wiki',
    },
    {
      id: 'news-sec-staking',
      headline: 'Policy desk: staking guidance still murky for consumer apps',
      summary:
        'Lawyers say on-phone simulators are fine; real yield products are not. This feed is flavour only.',
      category: 'Regulation',
      publishedAt: now - 3 * DAY,
      source: 'Policy Daily',
    },
    {
      id: 'news-tunnel-phish',
      headline: 'Fake “Tunnel Support” accounts surge in community DMs',
      summary:
        'Verified channel badges do not apply to DMs. Support will never ask you to connect a wallet via a link.',
      category: 'Scams',
      publishedAt: now - 4 * DAY,
      source: 'Tunnel Safety',
    },
    {
      id: 'news-market-assets',
      headline: 'Hypercar listings in Market app hit new follower boosts',
      summary:
        'Flex assets still move the Clout needle — resale is 70% of book, so think twice before flipping.',
      category: 'Market',
      publishedAt: now - 5 * DAY,
      source: 'FlexWatch',
    },
  ];
}
