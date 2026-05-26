/**
 * bankAttention.test.ts — bill attention badge helper.
 */
import { describe, expect, it } from '@jest/globals';
import { DAY_MS } from '../src/engine/time/clock';
import { countBillsNeedingAttention, createBank } from '../src/engine/economy';

describe('countBillsNeedingAttention', () => {
  it('counts bills due within the horizon', () => {
    const now = 1_000_000;
    const bank = createBank(now);
    const bills = bank.bills.map((b, i) =>
      i === 0 ? { ...b, nextDueAt: now + DAY_MS } : b,
    );
    expect(countBillsNeedingAttention(bills, now, 2)).toBe(1);
  });

  it('counts overdue bills', () => {
    const now = 1_000_000;
    const bank = createBank(now);
    const bills = bank.bills.map((b, i) =>
      i === 0 ? { ...b, nextDueAt: now - DAY_MS } : b,
    );
    expect(countBillsNeedingAttention(bills, now, 2)).toBe(1);
  });
});
