/**
 * tokens.ts — the tradeable token catalogue.
 * ------------------------------------------------------------------
 * The fictional, real-flavoured tokens listed on the Exchange, stored
 * as DATA (CLAUDE.md §5). Each carries its identity, its emoji logo,
 * an accent gradient, the drift / volatility that drive its simulated
 * price, flavour stats, and a satirical description.
 *
 * Pure data — no React, no React Native imports.
 */
export type TokenCategory = 'Stablecoin' | 'Meme' | 'AI' | 'L1' | 'DeFi';

export interface TokenDefinition {
  /** Ticker — the stable id, e.g. 'MOONP'. */
  id: string;
  /** Display name, e.g. 'MoonPig'. */
  name: string;
  category: TokenCategory;
  /** Reference price the simulated history is seeded from. */
  basePrice: number;
  /** Accent gradient — [from, to]. Used for glows and edges, not the logo. */
  gradient: readonly [string, string];
  /** The token's emoji logo. */
  emoji: string;
  /** Per-tick price drift — the gentle trend (may be negative). */
  drift: number;
  /** Per-tick volatility — the random-walk magnitude. */
  volatility: number;
  /** True for the stablecoin — uses the pegged-wobble price model. */
  isStable: boolean;
  /** Flavour stat: market capitalisation, pre-formatted. */
  marketCap: string;
  /** Flavour stat: 24-hour trading volume, pre-formatted. */
  volume24h: string;
  /** Flavour stat: liquidity depth — 'Deep', 'Medium' or 'Thin'. */
  liquidity: string;
  /** Satirical "about" blurb shown on the token detail screen. */
  description: string;
}

export const TOKENS: readonly TokenDefinition[] = [
  {
    id: 'USDX',
    name: 'Dollar X',
    category: 'Stablecoin',
    basePrice: 1.0,
    gradient: ['#2775CA', '#1A5FA8'],
    emoji: '💵',
    drift: 0,
    volatility: 0.0008,
    isStable: true,
    marketCap: '$1.2B',
    volume24h: '$84M',
    liquidity: 'Deep',
    description:
      "Pegged to the dollar and “fully backed,” according to a PDF nobody has audited. The boring one — it sits at $1.00 doing nothing, which in this market counts as a personality. Your safe harbour when everything else is on fire.",
  },
  {
    id: 'MOONP',
    name: 'MoonPig',
    category: 'Meme',
    basePrice: 0.00071,
    gradient: ['#FB923C', '#EA580C'],
    emoji: '🐷',
    drift: 0.0012,
    volatility: 0.085,
    isStable: false,
    marketCap: '$14M',
    volume24h: '$9.1M',
    liquidity: 'Thin',
    description:
      "A pig. Going to the moon. That is the entire whitepaper. No utility, no roadmap, no team — the founders call this a feature. It is not a coin, it is a movement; the movement is mostly waiting.",
  },
  {
    id: 'PEPE2',
    name: 'Pepe 2.0',
    category: 'Meme',
    basePrice: 0.00000142,
    gradient: ['#4ADE80', '#16A34A'],
    emoji: '🐸',
    drift: 0.001,
    volatility: 0.09,
    isStable: false,
    marketCap: '$31M',
    volume24h: '$22M',
    liquidity: 'Medium',
    description:
      "The sequel to a frog coin that already rugged once. “This time liquidity is locked,” promises the same anon dev, from the same wallet. Pure nostalgia bait — and it works every single time.",
  },
  {
    id: 'NEURA',
    name: 'NeuraNet',
    category: 'AI',
    basePrice: 1.84,
    gradient: ['#8B5CF6', '#6D28D9'],
    emoji: '🧠',
    drift: 0.0006,
    volatility: 0.04,
    isStable: false,
    marketCap: '$210M',
    volume24h: '$18M',
    liquidity: 'Deep',
    description:
      "They put “AI” in the name and the chart grew a zero. NeuraNet’s neural-blockchain synergy layer leverages machine learning to, quote, “disrupt paradigms.” Does it do anything? It does numbers-go-up. Sometimes.",
  },
  {
    id: 'VOLT',
    name: 'VoltChain',
    category: 'L1',
    basePrice: 0.62,
    gradient: ['#06B6D4', '#0E7490'],
    emoji: '⚡',
    drift: 0.0003,
    volatility: 0.022,
    isStable: false,
    marketCap: '$96M',
    volume24h: '$7.4M',
    liquidity: 'Medium',
    description:
      "The Ethereum killer — like the forty before it. 100,000 transactions per second, almost none of them real. Infinitely scalable, lightning fast, and used mainly by people farming the airdrop.",
  },
  {
    id: 'YIELDX',
    name: 'YieldX',
    category: 'DeFi',
    basePrice: 0.094,
    gradient: ['#EC4899', '#BE185D'],
    emoji: '🌾',
    drift: -0.0002,
    volatility: 0.045,
    isStable: false,
    marketCap: '$22M',
    volume24h: '$3.1M',
    liquidity: 'Thin',
    description:
      "Stake your tokens for a totally sustainable 4,000% APY. Where does the yield come from? It comes from somewhere. The DeFi protocol of choice for people who decided not to ask.",
  },
  {
    id: 'GIGA',
    name: 'GigaChad',
    category: 'Meme',
    basePrice: 0.0231,
    gradient: ['#F59E0B', '#B45309'],
    emoji: '💪',
    drift: -0.0003,
    volatility: 0.08,
    isStable: false,
    marketCap: '$8M',
    volume24h: '$5.6M',
    liquidity: 'Thin',
    description:
      "A coin for alphas, sigmas, and other Greek letters. No use case — use cases are for betas. Holding GIGA will not make you rich, but it will make you insufferable, which for some holders is close enough.",
  },
];

/** Token categories, for the Exchange filter chips ('All' is added in the UI). */
export const TOKEN_CATEGORIES: readonly TokenCategory[] = [
  'Meme',
  'AI',
  'DeFi',
  'L1',
  'Stablecoin',
];

/** Every token keyed by its ticker, for quick lookup. */
export const TOKEN_BY_ID: Record<string, TokenDefinition> = Object.fromEntries(
  TOKENS.map((token) => [token.id, token]),
);
