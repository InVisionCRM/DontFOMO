/**
 * tokens.ts — the tradeable token catalogue.
 * ------------------------------------------------------------------
 * The fictional, real-flavoured tokens listed on the Exchange, stored
 * as DATA (CLAUDE.md §5). Each carries its identity, its badge
 * gradient, and the drift / volatility that drive its simulated price.
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
  /** Badge gradient — [from, to]. */
  gradient: readonly [string, string];
  /** Per-tick price drift — the gentle trend (may be negative). */
  drift: number;
  /** Per-tick volatility — the random-walk magnitude. */
  volatility: number;
  /** True for the stablecoin — uses the pegged-wobble price model. */
  isStable: boolean;
}

export const TOKENS: readonly TokenDefinition[] = [
  {
    id: 'USDX',
    name: 'Dollar X',
    category: 'Stablecoin',
    basePrice: 1.0,
    gradient: ['#2775CA', '#1A5FA8'],
    drift: 0,
    volatility: 0.0008,
    isStable: true,
  },
  {
    id: 'MOONP',
    name: 'MoonPig',
    category: 'Meme',
    basePrice: 0.00071,
    gradient: ['#FB923C', '#EA580C'],
    drift: 0.0012,
    volatility: 0.085,
    isStable: false,
  },
  {
    id: 'PEPE2',
    name: 'Pepe 2.0',
    category: 'Meme',
    basePrice: 0.00000142,
    gradient: ['#4ADE80', '#16A34A'],
    drift: 0.001,
    volatility: 0.09,
    isStable: false,
  },
  {
    id: 'NEURA',
    name: 'NeuraNet',
    category: 'AI',
    basePrice: 1.84,
    gradient: ['#8B5CF6', '#6D28D9'],
    drift: 0.0006,
    volatility: 0.04,
    isStable: false,
  },
  {
    id: 'VOLT',
    name: 'VoltChain',
    category: 'L1',
    basePrice: 0.62,
    gradient: ['#06B6D4', '#0E7490'],
    drift: 0.0003,
    volatility: 0.022,
    isStable: false,
  },
  {
    id: 'YIELDX',
    name: 'YieldX',
    category: 'DeFi',
    basePrice: 0.094,
    gradient: ['#EC4899', '#BE185D'],
    drift: -0.0002,
    volatility: 0.045,
    isStable: false,
  },
  {
    id: 'GIGA',
    name: 'GigaChad',
    category: 'Meme',
    basePrice: 0.0231,
    gradient: ['#F59E0B', '#B45309'],
    drift: -0.0003,
    volatility: 0.08,
    isStable: false,
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
