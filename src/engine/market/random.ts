/**
 * random.ts — seeded randomness for the market simulation.
 * ------------------------------------------------------------------
 * The market uses a SEEDED generator (not Math.random) so the
 * simulation is deterministic — reproducible in unit tests and stable
 * across an offline fast-forward. Pure TypeScript.
 */

/**
 * Create a seeded pseudo-random generator (mulberry32). Returns a
 * function that yields a fresh value in [0, 1) on each call.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A standard-normal (mean 0, variance 1) random value, via the
 * Box-Muller transform, drawn from the supplied generator.
 */
export function gaussian(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
