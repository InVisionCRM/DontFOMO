/**
 * assets.ts — the Market (asset shopping) engine.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * The Market app (Bible §5) sells physical assets — cars, watches,
 * houses. Per Bible §4: assets are bought with **USD only** (the
 * player must off-ramp from crypto first via the Exchange). Per
 * Bible §5: owned assets count toward **net worth** AND give a
 * **follower boost while owned** — selling takes both away.
 *
 * Selling returns USD at a resale haircut (default 70%) — owning
 * isn't free; it's an opt-in trade-off between liquidity and
 * follower headroom.
 */

/** Top-level grouping displayed as filter chips. */
export const ASSET_CATEGORIES = ['Cars', 'Watches', 'Houses'] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

/** Avatar / thumbnail gradient — top-left → bottom-right colour pair. */
export type AssetGradient = readonly [string, string];

/** Default fraction of price returned on sale. */
export const DEFAULT_RESALE_RATE = 0.7;

/** Static catalogue entry — flavour, price, follower boost, resale. */
export interface AssetDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  /** Purchase price in USD. */
  price: number;
  /** Follower bump applied on purchase; removed on sale. */
  followersBoost: number;
  /** Thumbnail / hero gradient. */
  thumbGradient: AssetGradient;
  /** Satirical detail-screen blurb. */
  description: string;
  /**
   * Fraction of `price` returned on sale. Defaults to
   * `DEFAULT_RESALE_RATE` (0.7). Lower for things that depreciate
   * (cars), higher for things that hold value (watches, real
   * estate). v1 keeps it flat at 0.7 across the catalogue.
   */
  resaleRate?: number;
}

/** Live state — an asset the player currently owns. */
export interface OwnedAsset {
  id: string;
  /** Epoch ms — purchase time. */
  acquiredAt: number;
}

/** Lookup a definition by id. */
export function findAsset(
  catalog: readonly AssetDefinition[],
  id: string,
): AssetDefinition | undefined {
  return catalog.find((a) => a.id === id);
}

/** Does the player currently own this asset id? */
export function isOwned(
  owned: readonly OwnedAsset[],
  id: string,
): boolean {
  return owned.some((o) => o.id === id);
}

/** Sum of book-value prices for everything owned. Feeds `peakNetWorth`. */
export function ownedValue(
  catalog: readonly AssetDefinition[],
  owned: readonly OwnedAsset[],
): number {
  let total = 0;
  for (const o of owned) {
    const def = findAsset(catalog, o.id);
    if (def) total += def.price;
  }
  return total;
}

/** Sum of follower boosts across everything owned. */
export function ownedFollowerBoost(
  catalog: readonly AssetDefinition[],
  owned: readonly OwnedAsset[],
): number {
  let total = 0;
  for (const o of owned) {
    const def = findAsset(catalog, o.id);
    if (def) total += def.followersBoost;
  }
  return total;
}

/** USD returned to the player on selling this asset. */
export function resaleValue(def: AssetDefinition): number {
  return Math.round(def.price * (def.resaleRate ?? DEFAULT_RESALE_RATE));
}

/**
 * Append an owned asset. No-op (returns a copy of the same list)
 * if the player already owns it — duplicates aren't allowed in v1.
 */
export function addOwned(
  owned: readonly OwnedAsset[],
  id: string,
  now: number,
): OwnedAsset[] {
  if (isOwned(owned, id)) return owned.slice();
  return [...owned, { id, acquiredAt: now }];
}

/** Remove one owned asset by id. */
export function removeOwned(
  owned: readonly OwnedAsset[],
  id: string,
): OwnedAsset[] {
  return owned.filter((o) => o.id !== id);
}
