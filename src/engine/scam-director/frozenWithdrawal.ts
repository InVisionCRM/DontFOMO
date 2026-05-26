/**
 * frozenWithdrawal.ts — Frozen Withdrawal scam mechanics (Event #2).
 * ------------------------------------------------------------------
 * Pure TypeScript. When the player attempts a large bank withdrawal,
 * the scam freezes the request and later demands a fee that never
 * unlocks anything — teaching the pig-butchering “pay to withdraw” trap.
 */
export const WITHDRAWAL_TRIGGER_CASH = 2_500;
export const WITHDRAWAL_MIN_AMOUNT = 500;
export const WITHDRAWAL_UNLOCK_FEE = 750;

export type FrozenWithdrawalStatus = 'none' | 'frozen';

export interface FrozenWithdrawalState {
  status: FrozenWithdrawalStatus;
  frozenAt?: number;
  attemptedAmount?: number;
  /** Cumulative fees the player was tricked into paying. */
  feesPaid: number;
}

export function createFrozenWithdrawal(): FrozenWithdrawalState {
  return { status: 'none', feesPaid: 0 };
}

export function canRequestWithdrawal(
  cash: number,
  frozen: FrozenWithdrawalState,
): boolean {
  return (
    frozen.status === 'none' &&
    cash >= WITHDRAWAL_TRIGGER_CASH &&
    cash >= WITHDRAWAL_MIN_AMOUNT
  );
}

export function armFrozenWithdrawal(
  frozen: FrozenWithdrawalState,
  amount: number,
  now: number,
): FrozenWithdrawalState {
  return {
    status: 'frozen',
    frozenAt: now,
    attemptedAmount: amount,
    feesPaid: frozen.feesPaid,
  };
}

export function payFrozenUnlockFee(
  frozen: FrozenWithdrawalState,
  cash: number,
): { state: FrozenWithdrawalState; spent: number } | null {
  if (frozen.status !== 'frozen' || cash < WITHDRAWAL_UNLOCK_FEE) {
    return null;
  }
  return {
    spent: WITHDRAWAL_UNLOCK_FEE,
    state: {
      ...frozen,
      feesPaid: frozen.feesPaid + WITHDRAWAL_UNLOCK_FEE,
    },
  };
}
