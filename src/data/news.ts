/**
 * news.ts — headline feed for the News app.
 * ------------------------------------------------------------------
 * Pure data (CLAUDE.md §5). v1 is a static feed; price-impact wiring
 * can layer on the market engine later.
 */

/** Stable identifiers for the category-chip filter row in the UI. */
export type NewsCategory =
  | 'market'
  | 'regulation'
  | 'defi'
  | 'tech'
  | 'culture';

/** Display label for each category — used by the chips and tests. */
export const NEWS_CATEGORY_LABEL: Readonly<Record<NewsCategory, string>> = {
  market: 'Market',
  regulation: 'Regulation',
  defi: 'DeFi',
  tech: 'Tech',
  culture: 'Culture',
};

/**
 * Ordered list of categories the chips row renders. The "All" pill is
 * a UI-only concern — it does not live here, since it filters to no
 * category and is not a category itself.
 */
export const NEWS_CATEGORIES: readonly NewsCategory[] = [
  'market',
  'regulation',
  'defi',
  'tech',
  'culture',
];

export interface NewsHeadline {
  id: string;
  outlet: string;
  title: string;
  summary: string;
  /** Epoch ms — drives sort order (newest first). */
  publishedAt: number;
  /** Topic bucket; chips filter the feed on this field. */
  category: NewsCategory;
  /** Optional token tickers this story mentions. */
  tags?: readonly string[];
}

/** Starter headlines seeded relative to game start. */
export function createStartingNews(now: number): NewsHeadline[] {
  const minute = 60_000;
  const hour = 3_600_000;
  return [
    {
      id: 'news-market-001',
      outlet: 'CryptoDesk',
      title: 'Markets drift sideways as liquidity thins',
      summary:
        'Major tokens traded in a narrow band overnight. Analysts say no single catalyst is moving price — routine noise until the next headline.',
      publishedAt: now - minute * 18,
      category: 'market',
      tags: ['USDX', 'NEURA'],
    },
    {
      id: 'news-tech-002',
      outlet: 'The Block',
      title: 'AI tokens catch a bid on data-center rumor',
      summary:
        'NEURA and peers popped after an unverified post claimed a hyperscaler partnership. Traders warned: verify before sizing up.',
      publishedAt: now - hour * 2,
      category: 'tech',
      tags: ['NEURA'],
    },
    {
      id: 'news-culture-003',
      outlet: 'DegenWire',
      title: 'Meme season returns — for 48 hours',
      summary:
        'Low-float launches dominated volume again. Rug Radar apps reported a spike in honeypot flags; veterans called it "Tuesday."',
      publishedAt: now - hour * 5,
      category: 'culture',
      tags: ['MOONP'],
    },
    {
      id: 'news-reg-004',
      outlet: 'Policy Daily',
      title: 'Regulators repeat: banks will not email you for crypto',
      summary:
        'A joint reminder stressed that legitimate banks never ask customers to pay release fees in Bitcoin to unblock transfers.',
      publishedAt: now - hour * 9,
      category: 'regulation',
    },
    {
      id: 'news-defi-005',
      outlet: 'YieldWatch',
      title: 'Stablecoin pool drains after upgrade misfires',
      summary:
        'A blue-chip lending market paused withdrawals after a flawed upgrade left collateral in limbo. Auditors say funds are safe; the timeline is not.',
      publishedAt: now - hour * 14,
      category: 'defi',
      tags: ['USDX'],
    },
    {
      id: 'news-market-006',
      outlet: 'CryptoDesk',
      title: 'BTC reclaims a familiar level on thin Sunday volume',
      summary:
        'Spot bid pushed Bitcoin back above a closely watched support after a quiet weekend. Desks said positioning, not news, drove the bounce.',
      publishedAt: now - hour * 22,
      category: 'market',
    },
    {
      id: 'news-reg-007',
      outlet: 'Policy Daily',
      title: 'Fake government bureaus rise in phishing reports',
      summary:
        'Consumer watchdogs flagged a wave of spoofed agency notices demanding crypto payments to "release" frozen funds. None of them are real.',
      publishedAt: now - hour * 31,
      category: 'regulation',
    },
    {
      id: 'news-tech-008',
      outlet: 'The Block',
      title: 'L2 rollup ships zk proof speedup',
      summary:
        'A leading rollup posted a proof-time cut overnight, trimming withdrawal latency for users. Fees were unchanged.',
      publishedAt: now - hour * 40,
      category: 'tech',
    },
  ];
}

/**
 * Feed-style relative timestamp. "Just now" under a minute, then
 * minutes, hours, days. Pure function — exported for unit tests.
 */
export function formatRelativeTimestamp(
  publishedAt: number,
  now: number,
): string {
  const elapsed = Math.max(0, now - publishedAt);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (elapsed < minute) return 'Just now';
  if (elapsed < hour) {
    const minutes = Math.floor(elapsed / minute);
    return `${minutes}m ago`;
  }
  if (elapsed < day) {
    const hours = Math.floor(elapsed / hour);
    return `${hours}h ago`;
  }
  const days = Math.floor(elapsed / day);
  return `${days}d ago`;
}

/**
 * Filter headlines by category. `null` means "All" — no filter.
 * Pure function so the chips logic stays testable without RN.
 */
export function filterHeadlines(
  headlines: readonly NewsHeadline[],
  category: NewsCategory | null,
): readonly NewsHeadline[] {
  if (category === null) return headlines;
  return headlines.filter((h) => h.category === category);
}
