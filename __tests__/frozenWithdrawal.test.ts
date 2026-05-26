/**
 * frozenWithdrawal.test.ts — Frozen Withdrawal scam mechanics.
 */
import { describe, expect, it } from '@jest/globals';
import {
  armFrozenWithdrawal,
  canRequestWithdrawal,
  createFrozenWithdrawal,
  payFrozenUnlockFee,
  WITHDRAWAL_UNLOCK_FEE,
} from '../src/engine/scam-director';

describe('frozen withdrawal', () => {
  it('does not arm below the cash threshold', () => {
    const frozen = createFrozenWithdrawal();
    expect(canRequestWithdrawal(2_000, frozen)).toBe(false);
  });

  it('arms on a qualifying withdrawal attempt', () => {
    const frozen = armFrozenWithdrawal(createFrozenWithdrawal(), 3_000, 100);
    expect(frozen.status).toBe('frozen');
    expect(frozen.attemptedAmount).toBe(3_000);
  });

  it('accepts unlock fees but stays frozen', () => {
    const frozen = armFrozenWithdrawal(createFrozenWithdrawal(), 3_000, 100);
    const result = payFrozenUnlockFee(frozen, 2_000);
    expect(result).not.toBeNull();
    expect(result!.spent).toBe(WITHDRAWAL_UNLOCK_FEE);
    expect(result!.state.status).toBe('frozen');
    expect(result!.state.feesPaid).toBe(WITHDRAWAL_UNLOCK_FEE);
  });

  it('rejects unlock fee when cash is insufficient', () => {
    const frozen = armFrozenWithdrawal(createFrozenWithdrawal(), 3_000, 100);
    expect(payFrozenUnlockFee(frozen, 100)).toBeNull();
  });
});
