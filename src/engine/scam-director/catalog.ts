/**
 * catalog.ts — Scam Director scam identifiers and runtime phases.
 */
export type ScamId =
  | 'clipboard_seed'
  | 'frozen_withdrawal'
  | 'hijacked_friend'
  | 'fake_support';

export type ScamPhase =
  | 'idle'
  | 'armed'
  | 'scheduled'
  | 'detonated'
  | 'defused';

export interface ScamRuntime {
  phase: ScamPhase;
  armedAt?: number;
  /** Epoch ms when a scheduled scam fires (clipboard drain, etc.). */
  detonateAt?: number;
}

export const ALL_SCAM_IDS: readonly ScamId[] = [
  'clipboard_seed',
  'frozen_withdrawal',
  'hijacked_friend',
  'fake_support',
];

export function createScamRuntime(phase: ScamPhase = 'idle'): ScamRuntime {
  return { phase };
}
