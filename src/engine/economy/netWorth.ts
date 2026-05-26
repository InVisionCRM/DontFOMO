/**
 * netWorth.ts — portfolio net-worth calculation.
 * ------------------------------------------------------------------
 * Bible §14: cash + crypto holdings + owned Market assets (book value).
 * Pure TypeScript — shared by the store tick path and home widgets.
 */
import { ownedValue, type OwnedAsset } from '../assets/assets';
import { ASSET_CATALOG } from '../../data/assets';
import type { MarketState } from '../market';
import { holdingsValue } from './trade';

/** Total net worth for the current slice of persisted state. */
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
