#!/usr/bin/env node
/**
 * generateMarketSnapshots.mjs
 * ------------------------------------------------------------------
 * Runs the OU price walker for every catalog token from world tick 0
 * to (now − GENERATION_BUFFER), sampling every SNAPSHOT_INTERVAL_TICKS
 * (one in-game day). Writes the result to:
 *
 *     src/data/marketSnapshots.generated.ts
 *
 * Why a plain `.mjs`: avoids adding ts-node / tsx as a dev dep. The
 * math here is intentionally duplicated from
 * src/engine/market/deterministicMarket.ts — if you change the model
 * there you must change it here too, and re-run this script.
 *
 * The duplication is enforced by tests:
 * `__tests__/deterministicMarket.test.ts` checks that snapshot values
 * agree with `priceAtTickFromOrigin`. Drift = a failed test.
 *
 * Usage:
 *     node scripts/generateMarketSnapshots.mjs
 *
 * Re-run periodically to extend coverage as the real world ages.
 * Snapshots are forward-only and additive — old entries are still
 * valid, new entries extend the table.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = `${__dirname}/../src/data/marketSnapshots.generated.ts`;

// --- Constants — must match deterministicMarket.ts and tokens.ts ---

const WORLD_BIRTHDAY_UTC_MS = Date.UTC(2026, 0, 1, 0, 0, 0);
const MARKET_TICK_MS = 3000;
const SNAPSHOT_INTERVAL_TICKS = 28800; // 1 in-game day
const OU_THETA = 0.001;
const OU_MU_TARGET = 0.2;
const MIN_PRICE = 1e-9;

/**
 * Generate snapshots through (now − this many ticks). 600 ticks
 * ≈ 30 minutes — well past any plausible mid-bundle-build skew. The
 * engine handles the "between latest snapshot and live now" gap by
 * replaying forward; bounded by SNAPSHOT_INTERVAL_TICKS.
 */
const GENERATION_BUFFER_TICKS = 600;

// Catalog tokens — fields mirrored from src/data/tokens.ts.
// (drift is omitted — the OU model ignores it for catalog tokens.)
const TOKENS = [
  { id: 'USDX', basePrice: 1.0, volatility: 0.0008, isStable: true },
  { id: 'MOONP', basePrice: 0.00071, volatility: 0.085, isStable: false },
  { id: 'PEPE2', basePrice: 0.00000142, volatility: 0.09, isStable: false },
  { id: 'NEURA', basePrice: 1.84, volatility: 0.04, isStable: false },
  { id: 'VOLT', basePrice: 0.62, volatility: 0.022, isStable: false },
  { id: 'YIELDX', basePrice: 0.094, volatility: 0.045, isStable: false },
  { id: 'GIGA', basePrice: 0.0231, volatility: 0.08, isStable: false },
];

// --- Math — duplicates deterministicMarket.ts ---

function fnv1a32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function splitmix32(input) {
  let z = (input + 0x9e3779b9) | 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  return (z ^ (z >>> 16)) >>> 0;
}

function noise(seed, tick) {
  const combined = (seed ^ Math.imul(tick + 1, 0x9e3779b9)) >>> 0;
  return splitmix32(combined) / 0x100000000;
}

function gaussianNoise(seed, tick) {
  const u1 = Math.max(noise(seed, tick), Number.MIN_VALUE);
  const sibling = splitmix32((seed + 0x1234567) ^ Math.imul(tick + 1, 0x85ebca6b)) >>> 0;
  const u2 = sibling / 0x100000000;
  const r = Math.sqrt(-2 * Math.log(u1));
  return r * Math.cos(2 * Math.PI * u2);
}

function stablePriceAtTick(seed, tick, volatility) {
  if (tick <= 0) return 1.0;
  const wobble = gaussianNoise(seed, tick) * volatility;
  return Math.min(1.03, Math.max(0.97, 1 + wobble));
}

// --- Snapshot table builder ---

function buildTokenSnapshots(token, throughTick) {
  const seed = fnv1a32(token.id);
  const snapshots = [{ tick: 0, price: token.basePrice }];

  if (token.isStable) {
    // O(1) per snapshot — pegged-wobble.
    for (let t = SNAPSHOT_INTERVAL_TICKS; t <= throughTick; t += SNAPSHOT_INTERVAL_TICKS) {
      snapshots.push({ tick: t, price: stablePriceAtTick(seed, t, token.volatility) });
    }
    return snapshots;
  }

  // OU walk on log-price. Step tick-by-tick, sampling every
  // SNAPSHOT_INTERVAL_TICKS — this is the slow part (~10.5M iters
  // for a 1-year-old world × 6 volatile tokens ≈ 63M iters total,
  // a few seconds at most).
  let logDev = 0;
  for (let t = 1; t <= throughTick; t++) {
    const z = gaussianNoise(seed, t);
    logDev = (1 - OU_THETA) * logDev + OU_THETA * OU_MU_TARGET + token.volatility * z;
    if (t % SNAPSHOT_INTERVAL_TICKS === 0) {
      snapshots.push({
        tick: t,
        price: Math.max(MIN_PRICE, token.basePrice * Math.exp(logDev)),
      });
    }
  }
  return snapshots;
}

// --- Output ---

function formatSnapshots(table) {
  return table
    .map((s) => `    { tick: ${s.tick}, price: ${s.price} },`)
    .join('\n');
}

function formatFile(snapshots, generatedAtMs, throughTick) {
  const body = TOKENS.map((t) => {
    const table = snapshots[t.id];
    return `  ${t.id}: [\n${formatSnapshots(table)}\n  ],`;
  }).join('\n');

  return `/**
 * marketSnapshots.generated.ts
 * ------------------------------------------------------------------
 * AUTO-GENERATED by scripts/generateMarketSnapshots.mjs.
 * DO NOT EDIT BY HAND. Re-run the script to refresh.
 *
 * Snapshots of every catalog token's price at SNAPSHOT_INTERVAL_TICKS
 * boundaries (one in-game day) from WORLD_BIRTHDAY_UTC_MS through
 * generation time. Used by deterministicMarket.priceAtTick to bound
 * cold-start cost.
 *
 * The script runs the same OU walker the engine uses, so snapshots
 * agree exactly with what live \`priceAtTickFromOrigin(tick)\` would
 * produce — within IEEE 754 round-off.
 */
import type { MarketSnapshots } from '../engine/market/snapshots';

/** Wall-clock UTC time at which this file was generated. */
export const GENERATED_AT_UTC_MS = ${generatedAtMs};

/** Highest tick covered by any token's snapshot table. */
export const GENERATED_THROUGH_TICK = ${throughTick};

/** Per-token snapshot tables, keyed by token id. */
export const MARKET_SNAPSHOTS: MarketSnapshots = {
${body}
};
`;
}

// --- Main ---

const now = Date.now();
const ticksSinceBirthday = Math.floor((now - WORLD_BIRTHDAY_UTC_MS) / MARKET_TICK_MS);
const throughTick =
  Math.floor((ticksSinceBirthday - GENERATION_BUFFER_TICKS) / SNAPSHOT_INTERVAL_TICKS) *
  SNAPSHOT_INTERVAL_TICKS;

if (throughTick <= 0) {
  console.log(
    `World is too young (or now is before WORLD_BIRTHDAY). Through tick: ${throughTick}. ` +
      `Writing empty snapshot table.`,
  );
}

const snapshots = {};
let totalEntries = 0;
console.log(`Generating snapshots through tick ${throughTick} (${TOKENS.length} tokens)…`);
const startTime = Date.now();
for (const token of TOKENS) {
  const tokenStart = Date.now();
  snapshots[token.id] = buildTokenSnapshots(token, throughTick);
  totalEntries += snapshots[token.id].length;
  console.log(
    `  ${token.id.padEnd(7)} ${snapshots[token.id].length} entries (${Date.now() - tokenStart} ms)`,
  );
}

await mkdir(dirname(OUT_PATH), { recursive: true });
await writeFile(OUT_PATH, formatFile(snapshots, now, throughTick), 'utf8');

console.log(
  `Wrote ${totalEntries} snapshots to ${OUT_PATH} ` +
    `(${Date.now() - startTime} ms total).`,
);
