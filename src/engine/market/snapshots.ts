/**
 * snapshots.ts — baked price snapshots for the shared world.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React, no React Native imports (CLAUDE.md §5).
 *
 * The OU price model in `deterministicMarket.ts` is forward-only:
 * `priceAtTick(N)` needs `priceAtTick(N−1)`. Without help, a cold
 * start for a months-old world would walk millions of ticks.
 *
 * Snapshots are a lookup table baked into the app bundle, one entry
 * per in-game day per catalog token. On cold start, the engine looks
 * up the most recent snapshot ≤ `targetTick` and replays at most one
 * day's worth of ticks (`SNAPSHOT_INTERVAL_TICKS`) from there.
 *
 * The snapshot data lives in `src/data/marketSnapshots.generated.ts`,
 * produced by `scripts/generateMarketSnapshots.ts`. Re-run that
 * script periodically to extend coverage as the world ages.
 */
import { MARKET_SNAPSHOTS } from '../../data/marketSnapshots.generated';

/** A single (tick, price) sample baked into the bundle. */
export interface PriceSnapshot {
  readonly tick: number;
  readonly price: number;
}

/** Per-token table of snapshots, sorted by `tick` ascending. */
export type SnapshotTable = readonly PriceSnapshot[];

/** Snapshots keyed by token id (the FNV-1a seed key is recomputed by the engine). */
export type MarketSnapshots = Readonly<Record<string, SnapshotTable>>;

/**
 * Tick interval between consecutive snapshots — 1 in-game day at the
 * canonical MARKET_TICK_MS = 3000ms (86400 s / 3 s = 28800 ticks).
 *
 * Why one day: keeps the table tiny (~150 entries per token for a
 * 5-month-old world × 7 tokens × ~24 bytes = ~25KB), and bounds the
 * worst-case cold-start replay to 28799 ticks — fast.
 */
export const SNAPSHOT_INTERVAL_TICKS = 28800;

/**
 * Find the snapshot at or before `targetTick` for `tokenId`. Returns
 * `null` if no snapshots exist for the token (e.g. before the
 * generation script has run, or for a runtime-added non-catalog
 * token). Callers fall back to replaying from tick 0 when `null`.
 *
 * Linear scan from the end — snapshot tables are small (a few
 * hundred entries at most) and "recent" lookups dominate.
 */
export function nearestSnapshotAtOrBefore(
  tokenId: string,
  targetTick: number,
): PriceSnapshot | null {
  const table = MARKET_SNAPSHOTS[tokenId];
  if (!table || table.length === 0) return null;
  for (let i = table.length - 1; i >= 0; i--) {
    if (table[i].tick <= targetTick) return table[i];
  }
  return null;
}

/**
 * Return every snapshot for `tokenId` whose `tick` is in
 * `[fromTick, toTick]` (inclusive on both ends). Used by the chart's
 * long-range timeframes (1M, ALL) — sampling at one-day resolution
 * is much cheaper than walking the OU model and looks the same at
 * the pixel resolution a multi-month chart can display.
 *
 * Returns `[]` when there are no snapshots in range or no table.
 */
export function snapshotsInRange(
  tokenId: string,
  fromTick: number,
  toTick: number,
): SnapshotTable {
  const table = MARKET_SNAPSHOTS[tokenId];
  if (!table || table.length === 0 || toTick < fromTick) return [];
  const out: PriceSnapshot[] = [];
  for (const s of table) {
    if (s.tick < fromTick) continue;
    if (s.tick > toTick) break;
    out.push(s);
  }
  return out;
}
