/**
 * pacing.ts — the Scam Director's pressure-budget + skill model (6.3).
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * Implements Migration Plan §4.2 Jobs 1 + 2:
 *  - **Job 1 — Pacing.** A pressure budget plus a post-resolution
 *    cooldown. Severe outcomes earn a longer cooldown. Stops the
 *    "scam-after-scam pile-up" failure mode the Plan calls out.
 *  - **Job 2 — Adaptivity.** A `PlayerSkill` derived from the recent
 *    catch-rate, weighted by sample size so a single lucky catch
 *    doesn't promote a fresh player to "sharp."
 *
 * The constants below are defensible starting values. They are tuned
 * properly by Stage 6.7's simulation harness — do not change them by
 * intuition. Tune by measurement.
 *
 * Two arming gates the Director consults each tick:
 *  - `canArmReactive(...)` — ALWAYS true today. Reactive scams (e.g.
 *    the Clipboard Scam) arm on a player-driven trigger; the player's
 *    own action is the schedule. Pacing must not double-punish them
 *    by adding a cooldown to "you just got drained and copied your
 *    seed phrase again."
 *  - `canArmProactive(...)` — Director-chosen attacks (Authority
 *    Notice, Golden Giveaway, Frozen Withdrawal — lands in 6.4 / 6.5).
 *    Gated on the cooldown AND a per-window scam cap that scales with
 *    `PlayerSkill.rating`.
 */

import { DAY_MS } from '../time/clock';
import type {
  DirectorState,
  PacingState,
  PlayerSkill,
  ResolutionRecord,
  ScamEventDef,
  ScamSeverity,
} from './types';

/**
 * Vigilance-reward ladder (Bible §11). Scales the follower reward a
 * caught scam pays by the catalog entry's `maxSeverity`. Catching a
 * harder scam pays more. Defensible v1 values; 6.7 harness retunes.
 *
 *   minor  → 25  (Clipboard Scam — Bible §11 baseline)
 *   major  → 75  (Authority Notice and the difficulty-3 tier)
 *   severe → 150 (the headline difficulty-4/5 tier)
 */
export const VIGILANCE_REWARDS: Readonly<Record<ScamSeverity, number>> = {
  minor: 25,
  major: 75,
  severe: 150,
};

/**
 * Follower reward for catching a scam of the given severity. Pure
 * lookup over `VIGILANCE_REWARDS` so callers don't reach into the
 * map directly.
 */
export function vigilanceRewardFor(severity: ScamSeverity): number {
  return VIGILANCE_REWARDS[severity];
}

/**
 * Tuning constants. Picked to be defensible v1 defaults — they will
 * be retuned against measured data by the Stage 6.7 simulation
 * harness. Treat as "the numbers we'd start from if asked today."
 */
export const PACING_DEFAULTS = {
  /** Cooldown after a non-severe resolution, in in-game days. */
  minCooldownDays: 1.5,
  /** Cooldown after a `severe` resolution — recovery breathing room. */
  severeCooldownDays: 3,
  /** Rolling window in in-game days for the per-window scam cap. */
  rollingWindowDays: 7,
  /** Max proactive scams per window for a fresh player (`rating == 0`). */
  maxScamsNewbie: 1,
  /** Max proactive scams per window for a sharp player (`rating == 1`). */
  maxScamsSharp: 3,
  /** How many recent resolutions feed the skill calc. */
  skillSampleSize: 10,
  /** Below this rating the player is treated as a newbie. */
  newbieMax: 0.3,
  /** At or above this rating the player is treated as sharp. */
  sharpMin: 0.7,
} as const;

/** Fresh `PacingState` for a new game, anchored at `now`. */
export function createPacingState(now: number): PacingState {
  return { cooldownUntil: now, recentResolutions: [] };
}

/**
 * Drop resolutions older than the rolling window. Pure — returns a
 * new array. Called eagerly inside `recordResolution` and lazily
 * inside `canArmProactive` so a state that has been sitting in a
 * save file for weeks still reads correctly.
 */
function pruneOldResolutions(
  records: readonly ResolutionRecord[],
  now: number,
): ResolutionRecord[] {
  const cutoff = now - PACING_DEFAULTS.rollingWindowDays * DAY_MS;
  return records.filter((r) => r.resolvedAt >= cutoff);
}

/**
 * Record a freshly-resolved scam. Appends it to the rolling window,
 * prunes old entries, and extends the cooldown so the next proactive
 * arming respects the breathing-room rule.
 */
export function recordResolution(
  pacing: PacingState,
  rec: ResolutionRecord,
  now: number,
): PacingState {
  const cooldownDays =
    rec.severity === 'severe'
      ? PACING_DEFAULTS.severeCooldownDays
      : PACING_DEFAULTS.minCooldownDays;
  const nextCooldownUntil = Math.max(
    pacing.cooldownUntil,
    now + cooldownDays * DAY_MS,
  );
  return {
    cooldownUntil: nextCooldownUntil,
    recentResolutions: pruneOldResolutions(
      [...pacing.recentResolutions, rec],
      now,
    ),
  };
}

/**
 * Compute a player skill snapshot from the director's pacing window.
 * Pure derivation — not persisted. Re-called whenever the Director
 * needs to make an adaptivity decision.
 */
export function computePlayerSkill(state: DirectorState): PlayerSkill {
  const window = state.pacing.recentResolutions;
  const sample = window.slice(-PACING_DEFAULTS.skillSampleSize);
  const sampleSize = sample.length;
  if (sampleSize === 0) {
    return { catchRate: 0, rating: 0, sampleSize: 0 };
  }
  const caughtCount = sample.filter((r) => r.caught).length;
  const catchRate = caughtCount / sampleSize;
  // Weight by sample-size confidence so a 1/1 catch (catchRate 1)
  // doesn't immediately flip the player to "sharp" and start
  // throwing the hardest scams at them.
  const confidence = Math.min(1, sampleSize / PACING_DEFAULTS.skillSampleSize);
  const rating = catchRate * confidence;
  return { catchRate, rating, sampleSize };
}

/**
 * Bracket a skill rating into a difficulty band — used by the
 * proactive-scam picker (6.4+) to select a catalog entry appropriate
 * to the player's current level.
 *
 * Bands overlap (1..3 / 2..4 / 3..5) so the picker always has at
 * least three difficulty tiers to draw from regardless of skill.
 * Without overlap, an early-game player can't ever face a mid-game
 * scam, which starves the catalogue's mid tier of player exposure
 * and breaks the teaching loop. Overlap also lets the Director surf
 * difficulty gently as the player improves instead of jumping bands.
 */
export function difficultyBandFor(skill: PlayerSkill): {
  min: ScamEventDef['difficulty'];
  max: ScamEventDef['difficulty'];
} {
  if (skill.rating < PACING_DEFAULTS.newbieMax) {
    return { min: 1, max: 3 };
  }
  if (skill.rating < PACING_DEFAULTS.sharpMin) {
    return { min: 2, max: 4 };
  }
  return { min: 3, max: 5 };
}

/**
 * The per-window cap on proactive scams. Linear interpolation
 * between `maxScamsNewbie` and `maxScamsSharp` by rating, rounded.
 * Exported for tests and the future 6.7 harness.
 */
export function proactiveCapFor(skill: PlayerSkill): number {
  const lo = PACING_DEFAULTS.maxScamsNewbie;
  const hi = PACING_DEFAULTS.maxScamsSharp;
  const clampedRating = Math.max(0, Math.min(1, skill.rating));
  return Math.max(lo, Math.round(lo + (hi - lo) * clampedRating));
}

/**
 * Reactive arming guard — used by the Clipboard Scam and any other
 * scam that arms in response to a player action. Always permits
 * arming today; centralised so future reactive scams can pick up any
 * Director-wide gating we add without each one re-implementing it.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function canArmReactive(_pacing: PacingState, _now: number): boolean {
  return true;
}

/**
 * Proactive arming guard — Director-chosen scams. False when the
 * cooldown is still running or the per-window cap is exhausted.
 */
export function canArmProactive(
  pacing: PacingState,
  skill: PlayerSkill,
  now: number,
): boolean {
  if (now < pacing.cooldownUntil) return false;
  const live = pruneOldResolutions(pacing.recentResolutions, now);
  return live.length < proactiveCapFor(skill);
}

/**
 * Map a catalog difficulty to a default realised severity.
 * Catalog `maxSeverity` is the *cap* (Plan §4.4); for v1 a tier-1/2
 * scam realises as `minor`, tier 3 as `major`, tier 4/5 as `severe`,
 * each clipped to the catalog cap. The pacing layer only needs a
 * severity to scale the cooldown — the realised gameplay severity is
 * decided by the scam's own effect-application logic.
 */
export function defaultSeverityFor(def: ScamEventDef): ScamSeverity {
  const cap = def.maxSeverity;
  const order: readonly ScamSeverity[] = ['minor', 'major', 'severe'];
  const naive: ScamSeverity =
    def.difficulty <= 2 ? 'minor' : def.difficulty === 3 ? 'major' : 'severe';
  return order.indexOf(naive) > order.indexOf(cap) ? cap : naive;
}
