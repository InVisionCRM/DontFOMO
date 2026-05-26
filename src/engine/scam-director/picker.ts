/**
 * picker.ts — proactive scam selection (6.4).
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * Decides which catalog entry the Director arms when the pacing
 * layer says it can. Reactive scams (the Clipboard Scam today) are
 * excluded — they arm in response to a player action, not a Director
 * choice. Already-in-flight defs are also excluded so we never run
 * the same scam twice in parallel.
 *
 * Returns `null` when:
 *  - the pacing gate is closed (`canArmProactive` is false), OR
 *  - no catalog entry matches the player's current difficulty band, OR
 *  - every matching entry is already in flight.
 */

import {
  canArmProactive,
  computePlayerSkill,
  difficultyBandFor,
} from './pacing';
import type {
  DirectorState,
  PacingState,
  ScamEventDef,
  ScamInstance,
} from './types';

/** True for a non-terminal instance — already in flight, not arm-able. */
function isLive(inst: ScamInstance): boolean {
  return inst.state !== 'resolved' && inst.state !== 'cooldown';
}

/**
 * Filter the catalog down to proactive, in-band, not-already-live
 * candidates. Pure — exported so tests and the future 6.7 harness
 * can introspect what the picker considered.
 */
export function proactiveCandidates(
  catalog: readonly ScamEventDef[],
  state: DirectorState,
): ScamEventDef[] {
  const skill = computePlayerSkill(state);
  const band = difficultyBandFor(skill);
  const liveDefIds = new Set(
    state.instances.filter(isLive).map((i) => i.defId),
  );
  return catalog.filter(
    (def) =>
      def.trigger === 'proactive' &&
      def.difficulty >= band.min &&
      def.difficulty <= band.max &&
      !liveDefIds.has(def.id),
  );
}

/**
 * Pick a proactive scam to arm now, or `null` if none fits. The
 * Director calls this once per tick after handling reactive flow.
 *
 * Selection is uniform over the candidate set in v1. Weighted
 * selection (e.g. by archetype variety, recent-channel avoidance)
 * can layer on top in 6.5 without changing the call site.
 */
export function pickProactiveScam(
  catalog: readonly ScamEventDef[],
  state: DirectorState,
  now: number,
  rand: () => number,
): ScamEventDef | null {
  const pacing: PacingState = state.pacing;
  const skill = computePlayerSkill(state);
  if (!canArmProactive(pacing, skill, now)) {
    return null;
  }
  const candidates = proactiveCandidates(catalog, state);
  if (candidates.length === 0) {
    return null;
  }
  const idx = Math.min(
    candidates.length - 1,
    Math.floor(rand() * candidates.length),
  );
  return candidates[idx] ?? null;
}
