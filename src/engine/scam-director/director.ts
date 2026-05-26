/**
 * director.ts — the Scam Director's stateless tick.
 * ------------------------------------------------------------------
 * Migration Plan §4 — paced, adaptive, channel-aware. As of 6.4 the
 * Director runs both the Clipboard Scam (reactive Slow Burn) and the
 * Authority Notice scam (proactive Lockout). Reactive arming is
 * driven by player state (a leaked seed phrase); proactive arming is
 * scheduled by the pacing layer + the picker.
 *
 * The tick is pure: takes the current `DirectorState` + a read-only
 * `DirectorGameSnapshot` + the current epoch ms + a randomness
 * source, returns `{ state, effects }`. Keeping the tick pure lets
 * the simulation harness (6.7) drive thousands of game-days in a
 * fraction of a second.
 *
 * Effects are SEMANTIC — `clipboard-scam-detonated`, not
 * `drain-crypto`. The store maps each effect to its side effects
 * (drain holdings, push Mail, fire banner, reward followers). This
 * keeps the director ignorant of UI / persistence concerns.
 *
 * For paired-email Lockout / Decision-Point scams the player's tap
 * on a `MailAction.scamResolution` button bypasses the tick — the
 * store calls `resolveProactiveInstance` directly. The tick is then
 * only responsible for the timeout (expiry → auto fell-for).
 */

import { DAY_MS } from '../time/clock';
import { findSensitive, type ClipboardEntry } from '../clipboard/clipboard';
import {
  AUTHORITY_NOTICE_ID,
  CLIPBOARD_SCAM_ID,
  FROZEN_WITHDRAWAL_ID,
  GOLDEN_GIVEAWAY_ID,
  findScamDef,
  SCAM_CATALOG,
} from './catalog';
import {
  canArmReactive,
  createPacingState,
  defaultSeverityFor,
  recordResolution,
} from './pacing';
import { pickProactiveScam } from './picker';
import type {
  DirectorEffect,
  DirectorState,
  PacingState,
  ResolutionRecord,
  ScamEventDef,
  ScamInstance,
  ScamSeverity,
} from './types';

/**
 * The minimal slice of the wider game state the Director reads.
 * Pacing eventually keys on `followers` and `netWorth` (Bible §6);
 * the Clipboard Scam keys on `clipboard`.
 */
export interface DirectorGameSnapshot {
  followers: number;
  netWorth: number;
  clipboard: readonly ClipboardEntry[];
}

/** Random window for the Clipboard Scam's detonation delay. */
export const CLIPBOARD_DETONATION_MIN_DAYS = 1;
export const CLIPBOARD_DETONATION_MAX_DAYS = 3;

/**
 * The Authority Notice player-response window, in in-game days. Once
 * armed, the player has this long to open Mail and pick the genuine
 * bank email. After that the Director auto-resolves the instance as
 * fell-for (the player ignored the notice; the hold expires into the
 * drain). 1 day is defensible — matches the mockup's "23h41m"
 * urgency framing and falls inside Bible §11's "graduated" rule.
 */
export const AUTHORITY_NOTICE_TIMEOUT_DAYS = 1;

/**
 * The Golden Giveaway player-response window, in in-game days. Unlike
 * the Authority Notice (a Lockout where ignoring = fall-for), the
 * Golden Giveaway is an Inbound Lure (Bible §11) where ignoring is
 * itself the safe choice — no real-world consequence ticks. Letting
 * the window pass without engaging auto-resolves the instance as
 * CAUGHT with `reason: 'expired'`. 3 days is generous enough that a
 * player who simply doesn't open Clout for a while still gets credit
 * for not falling for the trap; short enough that an abandoned
 * instance doesn't sit in the store forever.
 */
export const GOLDEN_GIVEAWAY_TIMEOUT_DAYS = 3;

/**
 * Frozen Withdrawal response window (in-game days). Ignoring the hold
 * is the safe path — expiry auto-resolves as `waited` (transfer
 * completes), same polarity as the Golden Giveaway timeout.
 */
export const FROZEN_WITHDRAWAL_TIMEOUT_DAYS = 1;

/** Fresh `DirectorState` for a new game. */
export function createDirectorState(now: number): DirectorState {
  return {
    instances: [],
    lastTickAt: now,
    totalArmed: 0,
    totalCaught: 0,
    totalFellFor: 0,
    pacing: createPacingState(now),
  };
}

/** True if an instance has reached a terminal state. */
function isResolved(inst: ScamInstance): boolean {
  return inst.state === 'resolved' || inst.state === 'cooldown';
}

/** True if the given scam id has any in-flight (non-resolved) instance. */
function hasActiveInstance(state: DirectorState, defId: string): boolean {
  return state.instances.some((i) => i.defId === defId && !isResolved(i));
}

/** Pick a detonation delay in ms using `rand` — `[1..3]` in-game days. */
function pickDetonationDelay(rand: () => number): number {
  const span =
    CLIPBOARD_DETONATION_MAX_DAYS - CLIPBOARD_DETONATION_MIN_DAYS + 1;
  const days = CLIPBOARD_DETONATION_MIN_DAYS + Math.floor(rand() * span);
  return days * DAY_MS;
}

/**
 * Build a unique-enough instance id. The director only ever has a
 * handful of instances per game, so a timestamp + a small random
 * suffix is plenty.
 */
function nextInstanceId(now: number, rand: () => number): string {
  const suffix = Math.floor(rand() * 1e6).toString(36);
  return `scam-${now}-${suffix}`;
}

/**
 * Run one Director tick. Pure. Returns the next `DirectorState`
 * plus an ordered list of effects the store should apply.
 *
 * Behaviour as of 6.4:
 *  1. Transition in-flight Clipboard Scam instances (reactive).
 *  2. Transition in-flight Authority Notice instances on expiry
 *     (proactive timeout → auto fell-for).
 *  3. Fold any resolutions into pacing.
 *  4. Arm a reactive Clipboard Scam if the clipboard holds a
 *     sensitive entry and no instance is in flight.
 *  5. Arm a proactive scam if the picker returns one (pacing-gated).
 */
export function tickDirector(
  state: DirectorState,
  snapshot: DirectorGameSnapshot,
  now: number,
  rand: () => number,
  catalog: readonly ScamEventDef[] = SCAM_CATALOG,
): { state: DirectorState; effects: DirectorEffect[] } {
  if (now === state.lastTickAt) {
    return { state, effects: [] };
  }

  const effects: DirectorEffect[] = [];
  let totalCaught = state.totalCaught;
  let totalFellFor = state.totalFellFor;
  let pacing: PacingState = state.pacing;
  const justResolved: ResolutionRecord[] = [];

  // Step 1 — transition any in-flight Clipboard Scam instances.
  const sensitive = findSensitive(snapshot.clipboard);
  const sensitiveStillPresent = sensitive !== null;

  let instances = state.instances.map((inst): ScamInstance => {
    if (isResolved(inst)) return inst;

    if (inst.defId === CLIPBOARD_SCAM_ID) {
      if (!sensitiveStillPresent) {
        // Defused — the entry was deleted before detonation.
        totalCaught += 1;
        effects.push({
          type: 'clipboard-scam-defused',
          instanceId: inst.id,
        });
        justResolved.push({
          instanceId: inst.id,
          defId: inst.defId,
          resolvedAt: now,
          caught: true,
          severity: severityFor(inst.defId),
        });
        return { ...inst, state: 'resolved', resolvedAt: now, caught: true };
      }
      if (now >= inst.scheduledAt) {
        totalFellFor += 1;
        effects.push({
          type: 'clipboard-scam-detonated',
          instanceId: inst.id,
        });
        justResolved.push({
          instanceId: inst.id,
          defId: inst.defId,
          resolvedAt: now,
          caught: false,
          severity: severityFor(inst.defId),
        });
        return { ...inst, state: 'resolved', resolvedAt: now, caught: false };
      }
      return inst;
    }

    // Step 2 — Authority Notice (proactive Lockout): only path the
    // tick handles is the timeout. Player-driven resolutions come in
    // via `resolveProactiveInstance` from the store action.
    if (inst.defId === AUTHORITY_NOTICE_ID) {
      if (now >= inst.scheduledAt) {
        totalFellFor += 1;
        effects.push({
          type: 'authority-notice-resolved',
          instanceId: inst.id,
          caught: false,
          reason: 'expired',
        });
        justResolved.push({
          instanceId: inst.id,
          defId: inst.defId,
          resolvedAt: now,
          caught: false,
          severity: severityFor(inst.defId),
        });
        return { ...inst, state: 'resolved', resolvedAt: now, caught: false };
      }
      return inst;
    }

    // Step 2b — Golden Giveaway (proactive Inbound Lure): same shape
    // as the Authority Notice timeout, but the polarity is flipped —
    // ignoring an Inbound Lure IS the safe choice (Bible §11), so an
    // expired window resolves as CAUGHT.
    if (inst.defId === GOLDEN_GIVEAWAY_ID) {
      if (now >= inst.scheduledAt) {
        totalCaught += 1;
        effects.push({
          type: 'golden-giveaway-resolved',
          instanceId: inst.id,
          caught: true,
          reason: 'expired',
        });
        justResolved.push({
          instanceId: inst.id,
          defId: inst.defId,
          resolvedAt: now,
          caught: true,
          severity: severityFor(inst.defId),
        });
        return { ...inst, state: 'resolved', resolvedAt: now, caught: true };
      }
      return inst;
    }

    if (inst.defId === FROZEN_WITHDRAWAL_ID) {
      if (now >= inst.scheduledAt) {
        totalCaught += 1;
        effects.push({
          type: 'frozen-withdrawal-resolved',
          instanceId: inst.id,
          outcome: 'waited',
          reason: 'expired',
        });
        justResolved.push({
          instanceId: inst.id,
          defId: inst.defId,
          resolvedAt: now,
          caught: true,
          severity: severityFor(inst.defId),
        });
        return { ...inst, state: 'resolved', resolvedAt: now, caught: true };
      }
      return inst;
    }

    return inst;
  });

  // Step 3 — fold resolutions into pacing BEFORE any arming so a
  // same-tick re-arm sees the updated cooldown / rolling window.
  for (const rec of justResolved) {
    pacing = recordResolution(pacing, rec, now);
  }

  // Step 4 — arm the reactive Clipboard Scam if conditions match.
  let totalArmed = state.totalArmed;
  if (
    sensitiveStillPresent &&
    !hasActiveInstance({ ...state, instances }, CLIPBOARD_SCAM_ID) &&
    canArmReactive(pacing, now)
  ) {
    const id = nextInstanceId(now, rand);
    const detonatesAt = now + pickDetonationDelay(rand);
    const armed: ScamInstance = {
      id,
      defId: CLIPBOARD_SCAM_ID,
      state: 'armed',
      armedAt: now,
      scheduledAt: detonatesAt,
      resolvedAt: null,
      caught: null,
    };
    instances = [...instances, armed];
    totalArmed += 1;
    effects.push({
      type: 'clipboard-scam-armed',
      instanceId: id,
      detonatesAt,
    });
  }

  // Step 5 — try to arm a proactive scam (pacing-gated). The picker
  // returns null when cooldown is running, the rolling-window cap is
  // exhausted, or no in-band candidate exists.
  const projectedState: DirectorState = {
    ...state,
    instances,
    pacing,
  };
  const proactive = pickProactiveScam(catalog, projectedState, now, rand);
  if (proactive !== null) {
    const armed = mintProactiveInstance(proactive, now, rand);
    instances = [...instances, armed.instance];
    totalArmed += 1;
    effects.push(...armed.deployEffects);
  }

  return {
    state: {
      instances,
      lastTickAt: now,
      totalArmed,
      totalCaught,
      totalFellFor,
      pacing,
    },
    effects,
  };
}

/**
 * Build a freshly-armed proactive instance + its deploy effect.
 * v1 supports the Authority Notice; new proactive scams add a branch
 * here. Returns the instance to push into state plus the ordered
 * effects to emit on this tick.
 */
function mintProactiveInstance(
  def: ScamEventDef,
  now: number,
  rand: () => number,
): { instance: ScamInstance; deployEffects: DirectorEffect[] } {
  const id = nextInstanceId(now, rand);

  if (def.id === AUTHORITY_NOTICE_ID) {
    const expiresAt = now + AUTHORITY_NOTICE_TIMEOUT_DAYS * DAY_MS;
    // Case ref derives from the instance id so two deployments never
    // share one. The content-data layer reformats this for display.
    const caseRef = id;
    return {
      instance: {
        id,
        defId: def.id,
        state: 'deployed',
        armedAt: now,
        scheduledAt: expiresAt,
        resolvedAt: null,
        caught: null,
      },
      deployEffects: [
        {
          type: 'authority-notice-deployed',
          instanceId: id,
          caseRef,
          expiresAt,
        },
      ],
    };
  }

  if (def.id === GOLDEN_GIVEAWAY_ID) {
    const expiresAt = now + GOLDEN_GIVEAWAY_TIMEOUT_DAYS * DAY_MS;
    return {
      instance: {
        id,
        defId: def.id,
        state: 'deployed',
        armedAt: now,
        scheduledAt: expiresAt,
        resolvedAt: null,
        caught: null,
      },
      deployEffects: [
        {
          type: 'golden-giveaway-deployed',
          instanceId: id,
          expiresAt,
        },
      ],
    };
  }

  // Unknown proactive def — should not happen in v1; defensive
  // fallback so the type system stays happy.
  return {
    instance: {
      id,
      defId: def.id,
      state: 'armed',
      armedAt: now,
      scheduledAt: now,
      resolvedAt: null,
      caught: null,
    },
    deployEffects: [],
  };
}

/**
 * Resolve a proactive scam instance directly (player tap path).
 * Pure: produces the next director state + the resolution effect.
 * Returns the input state unchanged + empty effects if the instance
 * is not found or already resolved.
 *
 * The store calls this from action handlers (e.g. when the player
 * taps a `MailAction.scamResolution` button). The same code path
 * the tick uses for timeouts handles the bookkeeping; the only
 * difference is the `reason: 'tapped'` on the emitted effect.
 */
/** Payload from Mail / Bank when the player resolves a deployed scam. */
export interface PlayerScamResolution {
  caught: boolean;
  decision?: 'cancelled';
}

/**
 * Reactive deploy — Frozen Withdrawal (6.5b). Called from the store
 * when the player initiates a large withdrawal. Pure.
 */
export function deployFrozenWithdrawal(
  state: DirectorState,
  params: {
    amount: number;
    destinationWallet: string;
  },
  now: number,
  rand: () => number,
): { state: DirectorState; effects: DirectorEffect[] } {
  if (
    !canArmReactive(state.pacing, now) ||
    hasActiveInstance(state, FROZEN_WITHDRAWAL_ID)
  ) {
    return { state, effects: [] };
  }

  const id = nextInstanceId(now, rand);
  const expiresAt = now + FROZEN_WITHDRAWAL_TIMEOUT_DAYS * DAY_MS;
  const instance: ScamInstance = {
    id,
    defId: FROZEN_WITHDRAWAL_ID,
    state: 'deployed',
    armedAt: now,
    scheduledAt: expiresAt,
    resolvedAt: null,
    caught: null,
  };

  return {
    state: {
      ...state,
      instances: [...state.instances, instance],
      totalArmed: state.totalArmed + 1,
    },
    effects: [
      {
        type: 'frozen-withdrawal-deployed',
        instanceId: id,
        expiresAt,
        amount: params.amount,
        destinationWallet: params.destinationWallet,
      },
    ],
  };
}

/**
 * Player tap / cancel path for any deployed scam the store handles.
 * `resolveProactiveInstance` is a thin wrapper for the boolean API.
 */
export function resolveScamFromPlayer(
  state: DirectorState,
  instanceId: string,
  resolution: PlayerScamResolution,
  now: number,
): { state: DirectorState; effects: DirectorEffect[] } {
  const inst = state.instances.find((i) => i.id === instanceId);
  if (!inst || isResolved(inst)) {
    return { state, effects: [] };
  }

  const severity: ScamSeverity = severityFor(inst.defId);
  const effects: DirectorEffect[] = [];
  let caught = resolution.caught;
  let recordPacing = true;

  if (inst.defId === AUTHORITY_NOTICE_ID) {
    effects.push({
      type: 'authority-notice-resolved',
      instanceId: inst.id,
      caught,
      reason: 'tapped',
    });
  } else if (inst.defId === GOLDEN_GIVEAWAY_ID) {
    effects.push({
      type: 'golden-giveaway-resolved',
      instanceId: inst.id,
      caught,
      reason: 'tapped',
    });
  } else if (inst.defId === FROZEN_WITHDRAWAL_ID) {
    const outcome =
      resolution.decision === 'cancelled'
        ? 'cancelled'
        : resolution.caught
          ? 'waited'
          : 'paid';
    caught = outcome === 'waited';
    if (outcome === 'cancelled') {
      recordPacing = false;
    }
    effects.push({
      type: 'frozen-withdrawal-resolved',
      instanceId: inst.id,
      outcome,
      reason: 'tapped',
    });
  } else {
    return { state, effects: [] };
  }

  const nextInstances = state.instances.map((i) =>
    i.id === instanceId
      ? { ...i, state: 'resolved' as const, resolvedAt: now, caught }
      : i,
  );
  let pacing = state.pacing;
  if (recordPacing) {
    pacing = recordResolution(
      pacing,
      {
        instanceId: inst.id,
        defId: inst.defId,
        resolvedAt: now,
        caught,
        severity,
      },
      now,
    );
  }

  const caughtDelta = recordPacing && caught ? 1 : 0;
  const fellDelta = recordPacing && !caught ? 1 : 0;

  return {
    state: {
      ...state,
      instances: nextInstances,
      totalCaught: state.totalCaught + caughtDelta,
      totalFellFor: state.totalFellFor + fellDelta,
      pacing,
    },
    effects,
  };
}

export function resolveProactiveInstance(
  state: DirectorState,
  instanceId: string,
  caught: boolean,
  now: number,
): { state: DirectorState; effects: DirectorEffect[] } {
  return resolveScamFromPlayer(state, instanceId, { caught }, now);
}

/**
 * Look up a catalog entry's default realised severity. Falls back to
 * `minor` for unknown defs — defensive only; the tick never builds
 * an instance from a def that isn't in the catalog.
 */
function severityFor(defId: string): ScamSeverity {
  const def = findScamDef(defId);
  return def ? defaultSeverityFor(def) : 'minor';
}
