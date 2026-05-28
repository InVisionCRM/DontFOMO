/**
 * deterministicMarket.ts — shared-world price simulation (Bible §2).
 * ------------------------------------------------------------------
 * Pure TypeScript. No React, no React Native imports (CLAUDE.md §5).
 *
 * The market is a deterministic function of `(token_seed, tick_index)`.
 * Every player computing tick #N for a given token gets the *same*
 * price, so the world is shared across devices with no backend (Bible
 * §2, "The Shared Market"). The PRNG is a 32-bit SplitMix mixer; the
 * token seed is FNV-1a of the token id, computed lazily.
 *
 * **Price model — Ornstein-Uhlenbeck on log-price (Bible §2, *Price
 * model*).** For a non-stable catalog token:
 *
 *   log_dev(t+1) = (1 − θ) · log_dev(t) + θ · μ_target + σ · Z(seed, t+1)
 *   price(t)     = basePrice · exp(log_dev(t))
 *
 * with `θ = 0.001` (global mean-reversion rate; per-token character
 * comes from `σ`) and `μ_target = 0.2` (long-run log-equilibrium →
 * mean price is roughly 1.22 × basePrice, a gentle uplift). `σ` is
 * the per-tick volatility from `tokens.ts`. `Z` is `gaussianNoise`.
 *
 * The model is **bounded** — stationary variance is `σ² / (2θ)`, so
 * even after millions of ticks the price stays in a defensible band.
 * The old `drift` parameter is unused under OU (mean reversion
 * replaces directional drift) — it lives on `SimParams` for player
 * tokens which still use GBM via `nextPrice` in `market.ts`.
 *
 * The walk is sequential — `priceAtTick(N)` needs `priceAtTick(N−1)`.
 * Snapshots (TODO when the world is ~1 year old) avoid cold-start
 * replay from tick 0. Pre-v1 the world is young enough that
 * replaying from origin is fast (~300ms at currentTick ≈ 4M).
 *
 * Stablecoins use the pegged-wobble model from `market.ts` — they
 * settle near $1 each tick and do not accumulate drift, so we evaluate
 * them in O(1) at any tick.
 */
import type { SimParams } from './market';
import { nearestSnapshotAtOrBefore } from './snapshots';

/** Global mean-reversion rate. Bible §2 — *The Shared Market*. */
export const OU_THETA = 0.001;

/**
 * Long-run log-equilibrium. Bible §2 — *The Shared Market*. Mean
 * stationary price is roughly `basePrice * exp(OU_MU_TARGET) ≈
 * 1.22 × basePrice` — a gentle uplift.
 */
export const OU_MU_TARGET = 0.2;

/** The world's birthday — Bible §2, "The Shared Market". */
export const WORLD_BIRTHDAY_UTC_MS = Date.UTC(2026, 0, 1, 0, 0, 0);

/** A token's stable seed — derived once from its id. */
export type TokenSeed = number;

/** A 32-bit FNV-1a hash of a string. Stable across runs. */
export function fnv1a32(input: string): TokenSeed {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Compute a token's stable seed from its id. */
export function tokenSeed(tokenId: string): TokenSeed {
  return fnv1a32(tokenId);
}

/**
 * SplitMix32 final mixer. Takes a 32-bit integer, returns a
 * well-distributed 32-bit integer. The standard "scramble" used to
 * derive a uniform random from a counter.
 */
function splitmix32(input: number): number {
  let z = (input + 0x9e3779b9) | 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  return (z ^ (z >>> 16)) >>> 0;
}

/**
 * Deterministic uniform noise in [0, 1) for a given seed at a given
 * tick. Same inputs always return the same number, on any device.
 *
 * The seed and the tick are combined and mixed twice: the first call
 * scrambles the combination so adjacent ticks don't produce adjacent
 * outputs; the second call (with a rotation) decorrelates the bits.
 */
export function noise(seed: TokenSeed, tick: number): number {
  const combined = (seed ^ Math.imul(tick + 1, 0x9e3779b9)) >>> 0;
  const mixed = splitmix32(combined);
  return mixed / 0x100000000;
}

/**
 * Deterministic Gaussian noise (mean 0, std dev 1) for a given seed
 * at a given tick. Uses Box-Muller — two uniform samples → one
 * normal sample. The second uniform is drawn from a deterministic
 * sibling tick so we don't waste sequence space.
 *
 * `noise(seed, tick)` is used for the main uniform; a second mixed
 * value derived from the tick (without consuming the next tick's
 * slot) is used for the angle.
 */
export function gaussianNoise(seed: TokenSeed, tick: number): number {
  const u1 = Math.max(noise(seed, tick), Number.MIN_VALUE);
  // Sibling sample — same tick, different mix, so the next tick is
  // still independent of this gaussian call.
  const sibling = splitmix32((seed + 0x1234567) ^ Math.imul(tick + 1, 0x85ebca6b)) >>> 0;
  const u2 = sibling / 0x100000000;
  const r = Math.sqrt(-2 * Math.log(u1));
  return r * Math.cos(2 * Math.PI * u2);
}

/** The smallest price a token may fall to — matches `market.ts`. */
const MIN_PRICE = 1e-9;

/**
 * The stablecoin's deterministic price at a given tick. O(1) — no
 * replay needed. Mirrors the pegged-wobble model in `market.ts`.
 */
function stablePriceAtTick(
  seed: TokenSeed,
  tick: number,
  volatility: number,
): number {
  if (tick <= 0) {
    return 1.0;
  }
  const wobble = gaussianNoise(seed, tick) * volatility;
  return Math.min(1.03, Math.max(0.97, 1 + wobble));
}

/**
 * Compute a token's price at `toTick`, replaying the OU walk from a
 * known `(fromTick, fromPrice)` pair. Stablecoins are evaluated in
 * O(1); volatile tokens replay tick-by-tick on `log_dev` then
 * convert back to price.
 *
 * `toTick === fromTick` returns `fromPrice` unchanged. Going backward
 * (`toTick < fromTick`) is a programming error — the model is
 * forward-only.
 *
 * **Snapshot acceleration:** when `tokenId` is provided and the
 * caller is starting from `fromTick === 0` (the cold-start path),
 * the function looks up the nearest baked snapshot at or before
 * `toTick` (see `snapshots.ts`) and jumps forward to it before
 * walking. Bounds cold-start cost to one snapshot interval
 * (`SNAPSHOT_INTERVAL_TICKS` = 28800) instead of the full world
 * history. Without a `tokenId`, snapshots are not consulted —
 * useful for synthetic test inputs whose ids are not in the table.
 */
export function priceAtTick(
  params: SimParams,
  seed: TokenSeed,
  basePrice: number,
  fromTick: number,
  fromPrice: number,
  toTick: number,
  tokenId?: string,
): number {
  if (toTick < fromTick) {
    throw new Error(
      `priceAtTick: toTick (${toTick}) is before fromTick (${fromTick}); the model is forward-only.`,
    );
  }
  if (params.isStable) {
    return stablePriceAtTick(seed, toTick, params.volatility);
  }
  if (toTick === fromTick) {
    return fromPrice;
  }
  // Snapshot acceleration on cold start.
  if (tokenId && fromTick === 0) {
    const snap = nearestSnapshotAtOrBefore(tokenId, toTick);
    if (snap && snap.tick > 0) {
      fromTick = snap.tick;
      fromPrice = snap.price;
      if (fromTick === toTick) {
        return fromPrice;
      }
    }
  }
  // OU on log-price: log_dev(t+1) = (1−θ)·log_dev(t) + θ·μ + σ·Z(t+1)
  // Convert fromPrice → log_dev once, walk in log space, convert back.
  let logDev = Math.log(Math.max(fromPrice, MIN_PRICE) / basePrice);
  for (let tick = fromTick + 1; tick <= toTick; tick++) {
    const z = gaussianNoise(seed, tick);
    logDev = (1 - OU_THETA) * logDev + OU_THETA * OU_MU_TARGET + params.volatility * z;
  }
  return Math.max(MIN_PRICE, basePrice * Math.exp(logDev));
}

/**
 * Convenience: compute a token's price at `tick`, replaying from
 * `(tick 0, basePrice)`. When `tokenId` is supplied the call uses
 * the snapshot acceleration in `priceAtTick`; without it, the walk
 * is full O(tick).
 */
export function priceAtTickFromOrigin(
  params: SimParams,
  seed: TokenSeed,
  basePrice: number,
  tick: number,
  tokenId?: string,
): number {
  return priceAtTick(params, seed, basePrice, 0, basePrice, tick, tokenId);
}

/**
 * How many market ticks have elapsed between `WORLD_BIRTHDAY_UTC_MS`
 * and `nowMs`, given the market tick rate. Returns 0 if `nowMs` is at
 * or before the birthday.
 */
export function tickAtTime(nowMs: number, tickMs: number): number {
  if (nowMs <= WORLD_BIRTHDAY_UTC_MS) {
    return 0;
  }
  return Math.floor((nowMs - WORLD_BIRTHDAY_UTC_MS) / tickMs);
}
