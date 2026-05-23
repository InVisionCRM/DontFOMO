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
 * Every function is pure given the random generator passed in, so the
 * market can be fast-forwarded and unit-tested deterministically.
 */
import { TOKENS, type TokenDefinition } from '../../data/tokens';
import { gaussian } from './random';

/** The smallest price a token may fall to. */
const MIN_PRICE = 1e-9;
/** How many recent prices to keep per token (sparklines + the chart). */
const HISTORY_LENGTH = 150;
/** How many prices of simulated past to seed a fresh market with. */
const SEED_HISTORY = 60;

/**
 * How often the market advances, in milliseconds. The market ticks
 * faster than the calendar clock so charts stay lively within a
 * session (Design Bible §2). A tuning value.
 */
export const MARKET_TICK_MS = 3000;

/** The live simulated state of one token. */
export interface TokenMarketState {
  /** Ticker — matches a TokenDefinition id. */
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
  def: TokenDefinition,
  price: number,
  rand: () => number,
): number {
  if (def.isStable) {
    // Pegged: re-settle near $1 each tick, never drifting away.
    const wobble = gaussian(rand) * def.volatility;
    return Math.min(1.03, Math.max(0.97, 1 + wobble));
  }
  const change = def.drift + def.volatility * gaussian(rand);
  return Math.max(MIN_PRICE, price * (1 + change));
}

/**
 * Create a fresh market — every token seeded with a short stretch of
 * simulated past so its chart looks alive from the first frame.
 */
export function createMarket(rand: () => number): MarketState {
  const tokens: Record<string, TokenMarketState> = {};
  for (const def of TOKENS) {
    const history: number[] = [def.basePrice];
    let price = def.basePrice;
    for (let i = 1; i < SEED_HISTORY; i++) {
      price = nextPrice(def, price, rand);
      history.push(price);
    }
    tokens[def.id] = {
      id: def.id,
      price,
      history,
      dayOpen: history[0],
    };
  }
  return { tokens };
}

/**
 * Advance the whole market by one tick. Pure given `rand` — returns a
 * new MarketState, never mutates the input.
 */
export function tickMarket(
  market: MarketState,
  rand: () => number,
): MarketState {
  const tokens: Record<string, TokenMarketState> = {};
  for (const def of TOKENS) {
    const prev = market.tokens[def.id];
    const price = nextPrice(def, prev.price, rand);
    const history = [...prev.history, price];
    if (history.length > HISTORY_LENGTH) {
      history.shift();
    }
    tokens[def.id] = { id: def.id, price, history, dayOpen: prev.dayOpen };
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
): MarketState {
  let next = market;
  for (let i = 0; i < ticks; i++) {
    next = tickMarket(next, rand);
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
