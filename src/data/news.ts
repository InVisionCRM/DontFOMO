/**
 * news.ts — headline feed for the News app.
 * ------------------------------------------------------------------
 * Pure data (CLAUDE.md §5). v1 is a static feed; price-impact wiring
 * can layer on the market engine later.
 */

export interface NewsHeadline {
  id: string;
  outlet: string;
  title: string;
  summary: string;
  /** Epoch ms — drives sort order (newest first). */
  publishedAt: number;
  /** Optional token tickers this story mentions. */
  tags?: readonly string[];
}

/** Starter headlines seeded relative to game start. */
export function createStartingNews(now: number): NewsHeadline[] {
  const hour = 3_600_000;
  return [
    {
      id: 'news-calm-001',
      outlet: 'CryptoDesk',
      title: 'Markets drift sideways as liquidity thins',
      summary:
        'Major tokens traded in a narrow band overnight. Analysts say no single catalyst is moving price — routine noise until the next headline.',
      publishedAt: now - hour * 2,
      tags: ['USDX', 'NEURA'],
    },
    {
      id: 'news-ai-002',
      outlet: 'The Block',
      title: 'AI tokens catch a bid on data-center rumor',
      summary:
        'NEURA and peers popped after an unverified post claimed a hyperscaler partnership. Traders warned: verify before sizing up.',
      publishedAt: now - hour * 5,
      tags: ['NEURA'],
    },
    {
      id: 'news-meme-003',
      outlet: 'DegenWire',
      title: 'Meme season returns — for 48 hours',
      summary:
        'Low-float launches dominated volume again. Rug Radar apps reported a spike in honeypot flags; veterans called it "Tuesday."',
      publishedAt: now - hour * 9,
      tags: ['MOONP'],
    },
    {
      id: 'news-reg-004',
      outlet: 'Policy Daily',
      title: 'Regulators repeat: banks will not email you for crypto',
      summary:
        'A joint reminder stressed that legitimate banks never ask customers to pay release fees in Bitcoin to unblock transfers.',
      publishedAt: now - hour * 14,
    },
  ];
}
