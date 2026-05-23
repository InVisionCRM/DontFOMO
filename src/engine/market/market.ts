/**
 * market.ts — the crypto market simulation.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React, no React Native imports (CLAUDE.md §5).
 *
 * Each token's price follows a geometric random walk — every tick,
 * `price *= 1 + drift + volatility * gaussianNoise` — ported from the
 * original index.html prototype. The stablecoin instead wobbles in a
 * tight band around $1. The market ticks fast and independently of the
 * calendar clock, so charts stay alive within a session (Design Bible
 * §2).
 *
 * The market ticks whatever tokens are in its state — the seven
 * catalogue tokens, plus any player-created token added at runtime.
 * Each token's sim parameters are supplied through `getParams`, so a
 * player token (whose volatility depends on the player's followers)
 * can be ticked without the engine knowing about followers.
 *
 * Every function is pure given the random generator passed in.
 */
import { TOKENS, TOKEN_BY_ID } from '../../data/tokens';
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
 * its chart looks alive from the first frame. Used both to build the
 * starting market and to mint a player-created token.
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

/** Create a fresh market — every catalogue token seeded with a past. */
export function createMarket(rand: () => number): MarketState {
  const tokens: Record<string, TokenMarketState> = {};
  for (const def of TOKENS) {
    tokens[def.id] = seedTokenState(def.id, def, def.basePrice, rand);
  }
  return { tokens };
}

/** Default sim-params lookup — the static token catalogue. */
function staticParams(id: string): SimParams {
  return TOKEN_BY_ID[id];
}

/**
 * Advance the whole market by one tick. Pure given `rand` — returns a
 * new MarketState, never mutates the input. `getParams` supplies each
 * token's sim parameters (defaults to the static catalogue).
 */
export function tickMarket(
  market: MarketState,
  rand: () => number,
  getParams: (id: string) => SimParams = staticParams,
): MarketState {
  const tokens: Record<string, TokenMarketState> = {};
  for (const id of Object.keys(market.tokens)) {
    const prev = market.tokens[id];
    const price = nextPrice(getParams(id), prev.price, rand);
    const history = [...prev.history, price];
    if (history.length > HISTORY_LENGTH) {
      history.shift();
    }
    tokens[id] = { id, price, history, dayOpen: prev.dayOpen };
  }
  return { tokens };
}

/**
 * Run the market forward by `ticks` steps — used for the offline
 * catch-up when the game resumes after time away.
 */
export function advanceMarket(
  market: MarketState,
  ticks: number,
  rand: () => number,
  getParams: (id: string) => SimParams = staticParams,
): MarketState {
  let next = market;
  for (let i = 0; i < ticks; i++) {
    next = tickMarket(next, rand, getParams);
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
