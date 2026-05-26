/**
 * netWorth.ts — portfolio valuation for net worth.
 * ------------------------------------------------------------------
 * Cash + crypto holdings + Market-app asset book value (Bible §14).
 */
import { ownedValue, type OwnedAsset } from '../assets';
import { ASSET_CATALOG } from '../../data/assets';
import type { MarketState } from '../market';
import { holdingsValue } from './trade';

export function computeNetWorth(
  cash: number,
  holdings: Record<string, number>,
  market: MarketState,
  assets: readonly OwnedAsset[],
): number {
  return (
    cash + holdingsValue(holdings, market) + ownedValue(ASSET_CATALOG, assets)
  );
}
