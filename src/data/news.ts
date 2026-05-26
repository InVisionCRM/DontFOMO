/**
 * news.ts — seed headlines for a fresh game.
 * ------------------------------------------------------------------
 * Pure data (CLAUDE.md §5). The News app also ingests verified Clout
 * posts at runtime; this file is the editorial baseline.
 */
import type { NewsHeadline } from '../engine/news/headlines';

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Editorial headlines anchored to game start time. */
export function createStartingNews(now: number): NewsHeadline[] {
  return [
    {
      id: 'desk-regulation-001',
      outlet: 'The Crypto Desk',
      title: 'Lawmakers float 24-hour "cooling off" rule for meme coin launches',
      summary:
        'A draft bill would require new tokens to sit in a waiting period before trading — industry groups call it "unworkable" and "actually kind of reasonable."',
      publishedAt: now - 35 * MIN,
      category: 'markets',
      verified: true,
    },
    {
      id: 'pulse-yield-001',
      outlet: 'PulseWire',
      title: 'Yield farms report record TVL as degens rotate out of JPEGs',
      summary:
        'Liquidity mining dashboards show double-digit inflows week-over-week. Analysts note most participants still cannot explain impermanent loss.',
      publishedAt: now - 2 * HOUR,
      category: 'defi',
      verified: true,
    },
    {
      id: 'culture-rekt-001',
      outlet: 'Rekt Daily',
      title: 'Man explains portfolio to date; date explains exit strategy',
      summary:
        'Witnesses describe a dinner conversation that pivoted from "generational wealth" to "I should probably delete the app" in under four minutes.',
      publishedAt: now - 4 * HOUR,
      category: 'culture',
    },
    {
      id: 'markets-whale-001',
      outlet: 'OnChain Observer',
      title: 'Anonymous wallet moves $40M stablecoin in three transactions',
      summary:
        'Blockchain analysts tag the address as a known market maker. Social feeds interpret the move as either bullish, bearish, or "definitely insider trading."',
      publishedAt: now - 6 * HOUR,
      category: 'markets',
    },
    {
      id: 'defi-audit-001',
      outlet: 'Audit Watch',
      title: '"Fully audited" project lists auditor as "@trust_me_bro"',
      summary:
        'Security researchers urge investors to verify audit firms exist outside of Discord usernames. Project team says vibes are immaculate.',
      publishedAt: now - 9 * HOUR,
      category: 'defi',
    },
  ];
}
