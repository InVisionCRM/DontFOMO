/**
 * portfolioSparkline.ts — home-widget portfolio visuals.
 * ------------------------------------------------------------------
 * Derives sparkline Y samples and a same-day change % from real
 * holdings + live market prices (no mock data).
 */
import { holdingsValue } from '../engine/economy';
import type { MarketState } from '../engine/market';

const FLAT_LINE = [0.62, 0.58, 0.6, 0.55, 0.57, 0.54] as const;

/** Normalized 0..1 Y values for the portfolio widget sparkline. */
export function buildPortfolioSparkline(
  holdings: Record<string, number>,
  market: MarketState,
  samples = 6,
): readonly number[] {
  const heldIds = Object.keys(holdings).filter((id) => holdings[id] > 0);
  if (heldIds.length === 0) {
    return FLAT_LINE;
  }

  let minLen = Infinity;
  for (const id of heldIds) {
    const len = market.tokens[id]?.history.length ?? 0;
    if (len > 0 && len < minLen) {
      minLen = len;
    }
  }
  if (!Number.isFinite(minLen) || minLen < 2) {
    return FLAT_LINE;
  }

  const take = Math.min(samples, minLen);
  const startIdx = minLen - take;
  const values: number[] = [];
  for (let i = startIdx; i < minLen; i++) {
    let sliceValue = 0;
    for (const id of heldIds) {
      const history = market.tokens[id]?.history;
      const price = history?.[i] ?? 0;
      sliceValue += holdings[id] * price;
    }
    values.push(sliceValue);
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v) => 1 - (v - min) / range);
}

/**
 * Weighted day change across held tokens (by current book value).
 * Returns 0 when the player holds no crypto.
 */
export function portfolioDayChangePercent(
  holdings: Record<string, number>,
  market: MarketState,
): number {
  const heldIds = Object.keys(holdings).filter((id) => holdings[id] > 0);
  if (heldIds.length === 0) {
    return 0;
  }

  let nowValue = 0;
  let openValue = 0;
  for (const id of heldIds) {
    const token = market.tokens[id];
    if (!token) {
      continue;
    }
    const amount = holdings[id];
    nowValue += amount * token.price;
    openValue += amount * token.dayOpen;
  }
  if (openValue <= 0) {
    return 0;
  }
  return ((nowValue - openValue) / openValue) * 100;
}

/** Net worth for the home widget — cash + crypto + owned assets. */
export function homeNetWorth(
  cash: number,
  holdings: Record<string, number>,
  market: MarketState,
  assetsBookValue: number,
): number {
  return cash + holdingsValue(holdings, market) + assetsBookValue;
}
