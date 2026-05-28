/**
 * market.ts — the crypto market simulation.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React, no React Native imports (CLAUDE.md §5).
 *
 * Two price paths share this file:
 *
 *   • **Catalog tokens** (the seven tokens in `tokens.ts`) use the
 *     **deterministic shared-world engine** (Bible §2 — The Shared
 *     Market). Their price at any tick is a pure function of
 *     `(token_seed, tick_index)`, so every player computing the same
 *     tick gets the same price. The price model is still a random
 *     walk; only the noise source is deterministic. See
 *     `deterministicMarket.ts` for the math.
 *
 *   • **Player tokens** (Bible §9) stay on the per-player random walk
 *     because their volatility depends on the player's follower count
 *     (`followerVolatility`). They genuinely cannot be shared without
 *     a backend, which is deferred per Bible §2.
 *
 * `tickMarket` dispatches per token: catalog tokens replay the
 * deterministic walk from a cached `(lastTick, price)` pair to the
 * current world tick; player tokens consume one `rand()` per step.
 *
 * The history buffer (last 150 prices) is still maintained in state
 * for the sparkline and current chart. It is per-session for catalog
 * tokens until Phase B (chart fix) makes the visible chart compute
 * directly from `priceAtTick`.
 */
import { TOKENS, TOKEN_BY_ID } from '../../data/tokens';
import {
  priceAtTick,
  tickAtTime,
  tokenSeed,
} from './deterministicMarket';
import { gaussian } from './random';

/** The smallest price a token may fall to. */
const MIN_PRICE = 1e-9;
/** How many recent prices to keep per token (sparklines + the chart). */
const HISTORY_LENGTH = 150;
/** How many prices of simulated past to seed a fresh token with. */
const SEED_HISTORY = 60;

/**
 * How often the market advances, in milliseconds. The market ticks
 * faster than the calendar clock so charts stay lively within a
 * session (Design Bible §2). A tuning value.
 */
export const MARKET_TICK_MS = 3000;

/** The parameters that drive one token's price walk. */
export interface SimParams {
  /** Per-tick price drift — the gentle trend (may be negative). */
  drift: number;
  /** Per-tick volatility — the random-walk magnitude. */
  volatility: number;
  /** True for the stablecoin — uses the pegged-wobble price model. */
  isStable: boolean;
}

/** The live simulated state of one token. */
export interface TokenMarketState {
  /** Ticker — matches a token id. */
  id: string;
  /** Current price. */
  price: number;
  /** Recent prices, oldest first — capped at HISTORY_LENGTH. */
  history: number[];
  /** Reference price for the day's percentage change. */
  dayOpen: number;
  /**
   * Catalog tokens only: the world tick at which `price` was last
   * computed. Lets subsequent ticks replay deterministically from a
   * cached point instead of from tick 0. Undefined for player tokens
   * (they don't participate in the shared world; Bible §9).
   */
  lastTick?: number;
}

/** The live simulated state of the whole market. */
export interface MarketState {
  /** Every token's state, keyed by ticker. */
  tokens: Record<string, TokenMarketState>;
}

/** Advance one token's price by a single tick. Pure given `rand`. */
function nextPrice(
  params: SimParams,
  price: number,
  rand: () => number,
): number {
  if (params.isStable) {
    // Pegged: re-settle near $1 each tick, never drifting away.
    const wobble = gaussian(rand) * params.volatility;
    return Math.min(1.03, Math.max(0.97, 1 + wobble));
  }
  const change = params.drift + params.volatility * gaussian(rand);
  return Math.max(MIN_PRICE, price * (1 + change));
}

/**
 * Seed a fresh token state with a short stretch of simulated past, so
 * its chart looks alive from the first frame. Used to mint a
 * player-created token (catalog tokens use `seedCatalogTokenState`).
 */
export function seedTokenState(
  id: string,
  params: SimParams,
  basePrice: number,
  rand: () => number,
): TokenMarketState {
  const history: number[] = [basePrice];
  let price = basePrice;
  for (let i = 1; i < SEED_HISTORY; i++) {
    price = nextPrice(params, price, rand);
    history.push(price);
  }
  return { id, price, history, dayOpen: history[0] };
}

/**
 * Seed a catalog token's state at a given world tick using the
 * deterministic shared-world engine. Walks from tick 0 to
 * `currentTick` — O(currentTick), so cold-start cost grows with world
 * age. Acceptable until the world is ~6 months old; snapshot caching
 * TODO.
 *
 * Stablecoins use the pegged-wobble model in O(1) at any tick.
 *
 * The returned state's `history` holds the last `SEED_HISTORY` prices
 * — enough to feed the sparkline and the existing chart out of the
 * box. Phase B will rewire the chart to compute its window directly
 * from `priceAtTick`, at which point the history buffer becomes a
 * pure UI affordance.
 */
export function seedCatalogTokenState(
  id: string,
  currentTick: number,
): TokenMarketState {
  const def = TOKEN_BY_ID[id];
  if (!def) {
    throw new Error(
      `seedCatalogTokenState: '${id}' is not a catalog token.`,
    );
  }
  const seed = tokenSeed(id);

  if (def.isStable) {
    const price = priceAtTick(
      def,
      seed,
      def.basePrice,
      0,
      def.basePrice,
      currentTick,
      id,
    );
    return {
      id,
      price,
      history: [price],
      dayOpen: price,
      lastTick: currentTick,
    };
  }

  // Snapshot-accelerated cold start:
  //   1. Jump to (historyStartTick − 1) using a single snapshot lookup
  //      + at most SNAPSHOT_INTERVAL_TICKS of replay (~28800 ticks).
  //   2. Walk forward SEED_HISTORY steps, collecting prices into history.
  const historyStartTick = Math.max(1, currentTick - SEED_HISTORY + 1);
  let walkPrice =
    historyStartTick === 1
      ? def.basePrice
      : priceAtTick(
          def,
          seed,
          def.basePrice,
          0,
          def.basePrice,
          historyStartTick - 1,
          id,
        );
  const history: number[] = [];
  for (let t = historyStartTick; t <= currentTick; t++) {
    walkPrice = priceAtTick(def, seed, def.basePrice, t - 1, walkPrice, t);
    history.push(walkPrice);
  }
  if (history.length === 0) {
    // currentTick === 0 — world brand new; seed with basePrice.
    history.push(def.basePrice);
  }
  return {
    id,
    price: walkPrice,
    history,
    dayOpen: history[0],
    lastTick: currentTick,
  };
}

/**
 * Create a fresh market — every catalogue token seeded deterministically
 * at the current world tick. `rand` is kept in the signature for
 * backward compatibility but is no longer consumed for catalog tokens
 * (player tokens are minted separately).
 */
export function createMarket(
  rand: () => number,
  nowMs: number = Date.now(),
): MarketState {
  const currentTick = tickAtTime(nowMs, MARKET_TICK_MS);
  const tokens: Record<string, TokenMarketState> = {};
  for (const def of TOKENS) {
    tokens[def.id] = seedCatalogTokenState(def.id, currentTick);
  }
  return { tokens };
}

/** Default sim-params lookup — the static token catalogue. */
function staticParams(id: string): SimParams {
  return TOKEN_BY_ID[id];
}

/**
 * Advance the whole market by one tick. Catalog tokens replay
 * deterministically from their cached `(lastTick, price)` to the world
 * tick at `nowMs`. Player tokens (Bible §9) consume one `rand()` per
 * step. `getParams` supplies each token's sim parameters.
 */
export function tickMarket(
  market: MarketState,
  rand: () => number,
  getParams: (id: string) => SimParams = staticParams,
  nowMs: number = Date.now(),
): MarketState {
  const currentTick = tickAtTime(nowMs, MARKET_TICK_MS);
  const tokens: Record<string, TokenMarketState> = {};
  for (const id of Object.keys(market.tokens)) {
    const prev = market.tokens[id];
    const catalogDef = TOKEN_BY_ID[id];

    let price: number;
    let lastTick: number | undefined = prev.lastTick;

    if (catalogDef) {
      // Catalog token: deterministic. Walk from cached point to now.
      const seed = tokenSeed(id);
      const fromTick = prev.lastTick ?? 0;
      const fromPrice =
        prev.lastTick == null ? catalogDef.basePrice : prev.price;
      price = priceAtTick(
        catalogDef,
        seed,
        catalogDef.basePrice,
        fromTick,
        fromPrice,
        currentTick,
        id,
      );
      lastTick = currentTick;
    } else {
      // Player token: random walk.
      price = nextPrice(getParams(id), prev.price, rand);
    }

    const history = [...(prev.history ?? []), price];
    if (history.length > HISTORY_LENGTH) {
      history.shift();
    }

    tokens[id] = {
      id,
      price,
      history,
      dayOpen: prev.dayOpen,
      ...(lastTick !== undefined ? { lastTick } : {}),
    };
  }
  return { tokens };
}

/**
 * Run the market forward by `ticks` steps — used for the offline
 * catch-up when the game resumes after time away. Catalog tokens are
 * deterministic, so each intermediate tick is correct; player tokens
 * consume one `rand()` per step.
 */
export function advanceMarket(
  market: MarketState,
  ticks: number,
  rand: () => number,
  getParams: (id: string) => SimParams = staticParams,
  endNowMs: number = Date.now(),
): MarketState {
  let next = market;
  for (let i = 0; i < ticks; i++) {
    const stepNowMs = endNowMs - (ticks - 1 - i) * MARKET_TICK_MS;
    next = tickMarket(next, rand, getParams, stepNowMs);
  }
  return next;
}

/** A token's percentage change versus its day-open reference, e.g. +2.4. */
export function dayChangePercent(token: TokenMarketState): number {
  if (token.dayOpen === 0) {
    return 0;
  }
  return ((token.price - token.dayOpen) / token.dayOpen) * 100;
}

/** One OHLC candle. */
export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Aggregate a flat price series into roughly `count` OHLC candles by
 * bucketing consecutive prices. Pure — used to draw the price chart.
 */
export function toCandles(prices: number[], count: number): Candle[] {
  if (prices.length === 0 || count < 1) {
    return [];
  }
  const bucketSize = Math.max(1, Math.ceil(prices.length / count));
  const candles: Candle[] = [];
  for (let i = 0; i < prices.length; i += bucketSize) {
    const bucket = prices.slice(i, i + bucketSize);
    let high = bucket[0];
    let low = bucket[0];
    for (const price of bucket) {
      if (price > high) high = price;
      if (price < low) low = price;
    }
    candles.push({
      open: bucket[0],
      close: bucket[bucket.length - 1],
      high,
      low,
    });
  }
  return candles;
}
