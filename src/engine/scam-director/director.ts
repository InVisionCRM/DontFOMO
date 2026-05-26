/**
 * director.ts — Scam Director tick + arming helpers (Stage 6).
 * ------------------------------------------------------------------
 * Wraps clipboard scan with detonation scheduling, wallet drain, and
 * the vigilance path when the player defuses early. Social scams
 * (hijacked friend, fake support) arm when the player opens the
 * seeded suspicious threads.
 */
import { DAY_MS } from '../time/clock';
import type { ClipboardEntry } from '../clipboard/clipboard';
import { scanClipboard } from './clipboardScan';
import {
  ALL_SCAM_IDS,
  createScamRuntime,
  type ScamId,
  type ScamPhase,
  type ScamRuntime,
} from './catalog';
import {
  createFrozenWithdrawal,
  type FrozenWithdrawalState,
} from './frozenWithdrawal';

export interface ScamDirectorState {
  scams: Record<ScamId, ScamRuntime>;
  frozen: FrozenWithdrawalState;
}

export interface ScamTickBanner {
  title: string;
  body: string;
}

export interface ScamTickResult {
  state: ScamDirectorState;
  cashDelta: number;
  followersDelta: number;
  banner: ScamTickBanner | null;
}

const CLIPBOARD_DRAIN_RATE = 0.35;
const CLIPBOARD_DRAIN_MIN = 100;
const DEFUSE_FOLLOWERS_REWARD = 5;

export function createScamDirector(): ScamDirectorState {
  const scams = Object.fromEntries(
    ALL_SCAM_IDS.map((id) => [id, createScamRuntime()]),
  ) as Record<ScamId, ScamRuntime>;
  return { scams, frozen: createFrozenWithdrawal() };
}

/** Deterministic 1–3 in-game-day delay from the arming timestamp. */
export function detonationDelayMs(armedAt: number): number {
  const days = 1 + (Math.abs(armedAt) % 3);
  return days * DAY_MS;
}

export function getScamPhase(
  state: ScamDirectorState,
  id: ScamId,
): ScamPhase {
  return state.scams[id]?.phase ?? 'idle';
}

export function armScam(
  state: ScamDirectorState,
  id: ScamId,
  now: number,
  scheduleDetonation = false,
): ScamDirectorState {
  const current = state.scams[id] ?? createScamRuntime();
  if (current.phase !== 'idle') return state;
  const next: ScamRuntime = {
    phase: scheduleDetonation ? 'scheduled' : 'armed',
    armedAt: now,
    detonateAt: scheduleDetonation ? now + detonationDelayMs(now) : undefined,
  };
  return {
    ...state,
    scams: { ...state.scams, [id]: next },
  };
}

function setScamPhase(
  state: ScamDirectorState,
  id: ScamId,
  phase: ScamPhase,
): ScamDirectorState {
  const prev = state.scams[id] ?? createScamRuntime();
  return {
    ...state,
    scams: {
      ...state.scams,
      [id]: {
        ...prev,
        phase,
        ...(phase === 'idle'
          ? { armedAt: undefined, detonateAt: undefined }
          : {}),
      },
    },
  };
}

function clipboardDrainAmount(cash: number): number {
  return Math.max(CLIPBOARD_DRAIN_MIN, Math.floor(cash * CLIPBOARD_DRAIN_RATE));
}

export interface TickScamDirectorInput {
  now: number;
  cash: number;
  followers: number;
  clipboard: readonly ClipboardEntry[];
  hasOnboarded: boolean;
}

/**
 * Advance time-driven scam logic. Called from the store's calendar
 * tick after onboarding is complete.
 */
export function tickScamDirector(
  state: ScamDirectorState,
  input: TickScamDirectorInput,
): ScamTickResult {
  if (!input.hasOnboarded) {
    return { state, cashDelta: 0, followersDelta: 0, banner: null };
  }

  let next = state;
  let cashDelta = 0;
  let followersDelta = 0;
  let banner: ScamTickBanner | null = null;

  const scan = scanClipboard(input.clipboard);
  const clip = next.scams.clipboard_seed ?? createScamRuntime();
  const armed = scan.found !== null;

  if (armed && clip.phase === 'idle') {
    next = armScam(next, 'clipboard_seed', input.now, true);
  } else if (!armed && clip.phase === 'scheduled') {
    next = setScamPhase(next, 'clipboard_seed', 'defused');
    followersDelta = DEFUSE_FOLLOWERS_REWARD;
    banner = {
      title: 'Scam avoided',
      body: 'You cleared the recovery phrase before anything could use it. +5 followers.',
    };
  } else if (
    armed &&
    clip.phase === 'scheduled' &&
    clip.detonateAt !== undefined &&
    input.now >= clip.detonateAt
  ) {
    const drain = clipboardDrainAmount(input.cash);
    cashDelta = -drain;
    next = setScamPhase(next, 'clipboard_seed', 'detonated');
    banner = {
      title: 'Wallet drained',
      body: `Something read your recovery phrase from Clipboard. Lost ${drain.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`,
    };
  }

  return { state: next, cashDelta, followersDelta, banner };
}

/** Normalize a loaded or partial director slice. */
export function normalizeScamDirector(
  partial: Partial<ScamDirectorState> | undefined,
): ScamDirectorState {
  const base = createScamDirector();
  if (!partial) return base;
  const scams = { ...base.scams };
  for (const id of ALL_SCAM_IDS) {
    const loaded = partial.scams?.[id];
    if (loaded) {
      scams[id] = { ...createScamRuntime(), ...loaded };
    }
  }
  return {
    scams,
    frozen: {
      ...createFrozenWithdrawal(),
      ...partial.frozen,
      feesPaid: partial.frozen?.feesPaid ?? 0,
    },
  };
}
