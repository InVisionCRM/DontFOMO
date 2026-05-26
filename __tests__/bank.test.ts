/**
 * bank.test.ts — unit tests for the Bank engine.
 * ------------------------------------------------------------------
 * Pure logic, no React Native, no device — ts-jest harness.
 */
import { describe, expect, it } from '@jest/globals';
import { DAY_MS } from '../src/engine/time/clock';
import {
  BILL_CYCLE_DAYS,
  BILL_LATE_FEE_CAP,
  BILL_LATE_FEE_RATE_PER_DAY,
  LOAN_INSTALLMENT_DAYS,
  LOAN_MISSED_PENALTY_RATE,
  LOAN_TIERS,
  STARTING_BILLS,
  accrueMissedInstallments,
  applyBillPayment,
  applyInstallment,
  billLateFee,
  billTotalDue,
  billsTotalDue,
  createBank,
  createLoan,
  daysOverdue,
  daysUntilDue,
  findBillDefinition,
  formatBillDueLine,
  mostUrgentBill,
  findLoanTier,
  isOverdue,
  loanTotalCost,
  loanTotalInterest,
  loanWeeklyPayment,
  nextInstallmentCost,
} from '../src/engine/economy/bank';

const T0 = 1_700_000_000_000; // arbitrary fixed epoch ms

describe('createBank', () => {
  it('seeds the three starter bills, all due one cycle out', () => {
    const bank = createBank(T0);
    expect(bank.loan).toBeNull();
    expect(bank.bills).toHaveLength(STARTING_BILLS.length);
    for (const bill of bank.bills) {
      expect(bill.nextDueAt).toBe(T0 + BILL_CYCLE_DAYS * DAY_MS);
    }
  });

  it('seeds rent, utilities and phone plan', () => {
    const bank = createBank(T0);
    const ids = bank.bills.map((b) => b.id).sort();
    expect(ids).toEqual(['phone', 'rent', 'utilities']);
  });
});

describe('bill due-date math', () => {
  it('isOverdue / daysOverdue / daysUntilDue', () => {
    const bill = { id: 'rent', nextDueAt: T0 };
    expect(isOverdue(bill, T0 - 1)).toBe(false);
    expect(isOverdue(bill, T0 + 1)).toBe(true);
    expect(daysOverdue(bill, T0 - DAY_MS)).toBe(0);
    expect(daysOverdue(bill, T0 + 2.5 * DAY_MS)).toBe(2);
    expect(daysUntilDue(bill, T0 + 3 * DAY_MS)).toBe(-3);
    expect(daysUntilDue(bill, T0 - 3 * DAY_MS)).toBe(3);
  });
});

describe('billLateFee', () => {
  const rent = STARTING_BILLS[0]; // $1200
  it('is zero before the due date', () => {
    const bill = { id: 'rent', nextDueAt: T0 + DAY_MS };
    expect(billLateFee(rent, bill, T0)).toBe(0);
  });

  it('accrues 1% per whole day overdue', () => {
    const bill = { id: 'rent', nextDueAt: T0 };
    expect(billLateFee(rent, bill, T0 + 3 * DAY_MS)).toBeCloseTo(rent.amount * 0.03, 6);
  });

  it('caps at 50% of the bill amount', () => {
    const bill = { id: 'rent', nextDueAt: T0 };
    expect(billLateFee(rent, bill, T0 + 1000 * DAY_MS)).toBe(rent.amount * BILL_LATE_FEE_CAP);
    // sanity on the constants too
    expect(BILL_LATE_FEE_RATE_PER_DAY).toBeGreaterThan(0);
    expect(BILL_LATE_FEE_CAP).toBeGreaterThan(BILL_LATE_FEE_RATE_PER_DAY);
  });
});

describe('billTotalDue', () => {
  const rent = STARTING_BILLS[0];
  it('returns face amount when not overdue', () => {
    const bill = { id: 'rent', nextDueAt: T0 + DAY_MS };
    expect(billTotalDue(rent, bill, T0)).toBe(rent.amount);
  });
  it('returns face amount + late fee when overdue', () => {
    const bill = { id: 'rent', nextDueAt: T0 };
    expect(billTotalDue(rent, bill, T0 + 5 * DAY_MS)).toBeCloseTo(rent.amount * 1.05, 6);
  });
});

describe('applyBillPayment', () => {
  it('advances the due date by exactly one cycle from now', () => {
    const bill = { id: 'rent', nextDueAt: T0 };
    const paid = applyBillPayment(bill, T0 + 3 * DAY_MS);
    expect(paid.nextDueAt).toBe(T0 + 3 * DAY_MS + BILL_CYCLE_DAYS * DAY_MS);
    expect(paid.id).toBe('rent');
  });
  it('is pure — original bill unchanged', () => {
    const bill = { id: 'rent', nextDueAt: T0 };
    applyBillPayment(bill, T0 + DAY_MS);
    expect(bill.nextDueAt).toBe(T0);
  });
});

describe('billsTotalDue', () => {
  it('sums every bill including late fees', () => {
    const bank = createBank(T0);
    // No fees at start.
    const faceTotal = STARTING_BILLS.reduce((s, b) => s + b.amount, 0);
    expect(billsTotalDue(bank, STARTING_BILLS, T0)).toBe(faceTotal);
    // Walk forward 10 days past the cycle so every bill is 3 days overdue.
    const later = T0 + (BILL_CYCLE_DAYS + 3) * DAY_MS;
    const expectedFees = STARTING_BILLS.reduce(
      (s, b) => s + b.amount * 3 * BILL_LATE_FEE_RATE_PER_DAY,
      0,
    );
    expect(billsTotalDue(bank, STARTING_BILLS, later)).toBeCloseTo(faceTotal + expectedFees, 6);
  });
});

describe('findBillDefinition / findLoanTier', () => {
  it('finds by id', () => {
    expect(findBillDefinition(STARTING_BILLS, 'rent')?.name).toBe('Rent');
    expect(findLoanTier('tier_5k')?.principal).toBe(5_000);
  });
  it('returns undefined for unknown ids', () => {
    expect(findBillDefinition(STARTING_BILLS, 'mortgage')).toBeUndefined();
    expect(findLoanTier('tier_100k')).toBeUndefined();
  });
});

describe('loan math', () => {
  it('flat-interest weekly payment for each tier', () => {
    // 1k @ 8% for 4 weeks: interest = 1000 * .08 * 4/52 ≈ 6.154; weekly ≈ 251.538
    expect(loanWeeklyPayment(LOAN_TIERS[0])).toBeCloseTo(251.538, 2);
    // 5k @ 14% for 8 weeks: interest ≈ 107.69; weekly ≈ 638.46
    expect(loanWeeklyPayment(LOAN_TIERS[1])).toBeCloseTo(638.461, 2);
    // 20k @ 22% for 16 weeks: interest ≈ 1353.85; weekly ≈ 1334.62
    expect(loanWeeklyPayment(LOAN_TIERS[2])).toBeCloseTo(1334.615, 2);
  });
  it('total cost = principal + total interest', () => {
    for (const tier of LOAN_TIERS) {
      expect(loanTotalCost(tier)).toBeCloseTo(tier.principal + loanTotalInterest(tier), 6);
    }
  });
});

describe('createLoan', () => {
  it('returns loan state + cash credit for the principal', () => {
    const tier = LOAN_TIERS[1]; // 5k
    const { loan, cashCredit } = createLoan(tier, T0);
    expect(cashCredit).toBe(tier.principal);
    expect(loan.tierId).toBe(tier.id);
    expect(loan.weeklyPayment).toBeCloseTo(loanWeeklyPayment(tier), 6);
    expect(loan.totalRemaining).toBeCloseTo(loanTotalCost(tier), 6);
    expect(loan.nextPaymentDueAt).toBe(T0 + LOAN_INSTALLMENT_DAYS * DAY_MS);
    expect(loan.missedPayments).toBe(0);
    expect(loan.takenAt).toBe(T0);
  });
});

describe('installments', () => {
  it('nextInstallmentCost is weeklyPayment, but never more than what is owed', () => {
    const tier = LOAN_TIERS[0];
    const { loan } = createLoan(tier, T0);
    expect(nextInstallmentCost(loan)).toBeCloseTo(loan.weeklyPayment, 6);
    // After three installments the balance should be down to ~one payment.
    let cur = loan;
    cur = applyInstallment(cur, T0 + DAY_MS)!;
    cur = applyInstallment(cur, T0 + 2 * DAY_MS)!;
    cur = applyInstallment(cur, T0 + 3 * DAY_MS)!;
    expect(nextInstallmentCost(cur)).toBeLessThanOrEqual(cur.weeklyPayment + 0.01);
    expect(nextInstallmentCost(cur)).toBeCloseTo(cur.totalRemaining, 6);
  });

  it('applyInstallment advances the due date by one cycle', () => {
    const { loan } = createLoan(LOAN_TIERS[0], T0);
    const next = applyInstallment(loan, T0 + 2 * DAY_MS)!;
    expect(next.nextPaymentDueAt).toBe(T0 + 2 * DAY_MS + LOAN_INSTALLMENT_DAYS * DAY_MS);
  });

  it('applyInstallment returns null when the loan is paid off', () => {
    const { loan } = createLoan(LOAN_TIERS[0], T0); // 4 installments
    let cur: ReturnType<typeof applyInstallment> = loan;
    for (let i = 0; i < 4; i++) {
      cur = applyInstallment(cur!, T0 + i * DAY_MS);
    }
    expect(cur).toBeNull();
  });
});

describe('accrueMissedInstallments', () => {
  it('is a no-op when nothing is past due', () => {
    const { loan } = createLoan(LOAN_TIERS[1], T0);
    const after = accrueMissedInstallments(loan, T0 + 3 * DAY_MS);
    expect(after).toEqual(loan);
  });

  it('compounds the penalty per missed week and advances the due date', () => {
    const { loan } = createLoan(LOAN_TIERS[1], T0);
    // Skip 3 full weeks past the first due date.
    const skipTo = loan.nextPaymentDueAt + 3 * LOAN_INSTALLMENT_DAYS * DAY_MS;
    const after = accrueMissedInstallments(loan, skipTo);
    expect(after.missedPayments).toBe(loan.missedPayments + 3);
    const expectedBalance = loan.totalRemaining * Math.pow(1 + LOAN_MISSED_PENALTY_RATE, 3);
    expect(after.totalRemaining).toBeCloseTo(expectedBalance, 6);
    expect(after.nextPaymentDueAt).toBe(loan.nextPaymentDueAt + 3 * LOAN_INSTALLMENT_DAYS * DAY_MS);
  });

  it('weekly payment never changes once the loan is taken', () => {
    const { loan } = createLoan(LOAN_TIERS[2], T0);
    const after = accrueMissedInstallments(
      loan,
      loan.nextPaymentDueAt + 5 * LOAN_INSTALLMENT_DAYS * DAY_MS,
    );
    expect(after.weeklyPayment).toBe(loan.weeklyPayment);
  });
});

describe('formatBillDueLine', () => {
  it('describes upcoming and overdue bills', () => {
    const bank = createBank(T0);
    const rent = bank.bills.find((b) => b.id === 'rent')!;
    expect(formatBillDueLine(rent, T0)).toMatch(/Due in \d+ days/);
    const overdueAt = rent.nextDueAt + 2 * DAY_MS;
    expect(formatBillDueLine(rent, overdueAt)).toBe('Overdue by 2 days');
  });
});

describe('mostUrgentBill', () => {
  it('picks the bill due soonest', () => {
    const bank = createBank(T0);
    const urgent = mostUrgentBill(STARTING_BILLS, bank.bills, T0);
    expect(urgent).not.toBeNull();
    const days = bank.bills.map((b) => daysUntilDue(b, T0));
    expect(daysUntilDue(urgent!.bill, T0)).toBe(Math.min(...days));
  });
});
