/**
 * clout.ts — the seed Clout feed for a fresh game.
 * ------------------------------------------------------------------
 * Pure data (CLAUDE.md §5). Five starter tweets — Bible §6's
 * "feed shows only 5 tweets at first" cap. The mix:
 *  - alpha tip from a real-feeling source ("Ape House") with a
 *    yield-farm link card (the kind of opportunity Bible §8
 *    routes through Clout);
 *  - satirical news from a verified outlet;
 *  - a typo-squat phishing tweet from a fake "DAVE Protocol"
 *    handle (`@DAVE_protoco1` — note the digit 1) — the early-game
 *    primer per Bible §11 "every opportunity has a fake twin";
 *  - degen relatable humour from sarah and chart fairy.
 *
 * The Scam Director (Stage 6) will push live tweets at the player
 * over time; this is just the cold-open.
 */
import type { Tweet } from '../engine/clout';

const MIN = 60_000;
const HOUR = 60 * MIN;

/** The player's default bio. Onboarding (later stage) sets the real one. */
export const DEFAULT_BIO =
  'surviving the trenches one bad decision at a time. holder of mostly regret. not financial advice.';

export function createStartingClout(now: number): Tweet[] {
  return [
    {
      id: 'apehouse-farm-001',
      author: {
        name: 'Ape House',
        handle: '@apehouse_eth',
        avatarGradient: ['#22C55E', '#15803D'],
      },
      text:
        "gm degens. fresh farm just went live — STABLE/ETH pool paying 312% APR. audited, LP locked 90 days. moves like this don't sit around 🌾",
      link: {
        domain: 'stablefarm.xyz',
        title: 'Stablefarm — provide liquidity, earn yield',
        thumbGradient: ['#16A34A', '#065F46'],
      },
      sentAt: now - 14 * MIN,
      stats: { replies: 48, reposts: 120, likes: 612, views: 44_000 },
    },
    {
      id: 'cryptodesk-news-001',
      author: {
        name: 'The Crypto Desk',
        handle: '@thecryptodesk',
        avatarGradient: ['#3B82F6', '#1D4ED8'],
        verified: true,
      },
      text:
        "BREAKING: anonymous dev refunds entire community after rug pull, citing 'overwhelming guilt.' Analysts baffled. Token immediately up 1,400%.",
      sentAt: now - 1 * HOUR,
      stats: { replies: 980, reposts: 5_200, likes: 22_000, views: 1_200_000 },
    },
    {
      // The phish primer. Fake "DAVE Protocol" — note the digit `1`
      // where an `l` belongs in the handle. Not verified, despite
      // the real DAVE Protocol being a (notional) verified account.
      id: 'dave-phish-001',
      author: {
        name: 'DAVE Protocol',
        handle: '@DAVE_protoco1',
        avatarGradient: ['#8B5CF6', '#6D28D9'],
      },
      text:
        "We're giving back to our community. 50,000 $DAVE is being distributed to holders today. Connect your wallet to verify and claim before the window closes.",
      link: {
        domain: 'dave-airdrop.live',
        title: 'Claim your $DAVE allocation',
        thumbGradient: ['#7C3AED', '#4C1D95'],
      },
      sentAt: now - 2 * HOUR,
      isSuspicious: true,
      stats: { replies: 2_100, reposts: 800, likes: 3_400, views: 210_000 },
    },
    {
      id: 'sarah-degen-001',
      author: {
        name: 'sarah',
        handle: '@sarah_aped',
        avatarGradient: ['#EC4899', '#BE185D'],
      },
      text: 'down 60% on my bags but my jpeg is up 3%. we call that a hedge.',
      sentAt: now - 3 * HOUR,
      stats: { replies: 31, reposts: 12, likes: 488, views: 19_000 },
    },
    {
      id: 'chartfairy-001',
      author: {
        name: 'chart fairy',
        handle: '@chartfairy',
        avatarGradient: ['#14B8A6', '#0F766E'],
      },
      text:
        '$PEPE2 retested support three times and held. it’s coiling. iykyk. (this is not financial advice — it is a dare.)',
      sentAt: now - 4 * HOUR,
      stats: { replies: 67, reposts: 90, likes: 740, views: 55_000 },
    },
  ];
}
