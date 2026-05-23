/**
 * bank.ts — bills and loans (Stage 4 money pressure).
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5). All state changes
 * are pure functions returning new state.
 *
 * Bills run on fixed 7-day cycles (KG, 2026-05-23). When overdue, a
 * late fee accrues daily, capped. Loans use a flat-interest model:
 * the player receives the principal in cash and owes principal +
 * interest, repaid as equal weekly installments. Missing a weekly
 * installment compounds 2% onto the remaining balance.
 */

import { DAY_MS } from '../time';

/** ------------------------------------------------------------------
 *  Bills
 *  ----------------------------------------------------------------*/

/** Every bill runs on a fixed 7-day cycle (Design Bible §15.5; KG 2026-05-23). */
export const BILL_CYCLE_DAYS = 7;

/** Late fee accrual: 1% of the bill's face amount per day overdue. */
export const BILL_LATE_FEE_RATE_PER_DAY = 0.01;

/** Maximum late fee, as a fraction of the bill's face amount. */
export const BILL_LATE_FEE_CAP = 0.5;

/** Static definition of a recurring bill. Lives in `src/data/` later. */
export interface BillDefinition {
  id: string;
  name: string;
  amount: number;
}

/** The catalogue of starter bills the game seeds for every player. */
export const STARTING_BILLS: BillDefinition[] = [
  { id: 'rent', name: 'Rent', amount: 1200 },
  { id: 'utilities', name: 'Utilities', amount: 180 },
  { id: 'phone', name: 'Phone plan', amount: 60 },
];

/** Mutable per-bill state — just when the next payment is due. */
export interface BillState {
  id: string;
  nextDueAt: number;
}

/** Lookup a bill definition by id. Returns undefined if unknown. */
export function findBillDefinition(
  defs: readonly BillDefinition[],
  id: string,
): BillDefinition | undefined {
  return defs.find((d) => d.id === id);
}

/** Days until a bill is due — negative when overdue. */
export function daysUntilDue(bill: BillState, now: number): number {
  return (bill.nextDueAt - now) / DAY_MS;
}

/** Whole days a bill is overdue (0 if not overdue). */
export function daysOverdue(bill: BillState, now: number): number {
  const overdue = (now - bill.nextDueAt) / DAY_MS;
  return overdue > 0 ? Math.floor(overdue) : 0;
}

export function isOverdue(bill: BillState, now: number): boolean {
  return now > bill.nextDueAt;
}

/** Accrued late fee in USD for a single bill at the moment `now`. */
export function billLateFee(
  def: BillDefinition,
  bill: BillState,
  now: number,
): number {
  const days = daysOverdue(bill, now);
  if (days <= 0) return 0;
  const rate = Math.min(BILL_LATE_FEE_CAP, days * BILL_LATE_FEE_RATE_PER_DAY);
  return def.amount * rate;
}

/** Total USD owed on a bill right now — face amount + late fee. */
export function billTotalDue(
  def: BillDefinition,
  bill: BillState,
  now: number,
): number {
  return def.amount + billLateFee(def, bill, now);
}

/**
 * Apply a bill payment. Returns the new bill state with `nextDueAt`
 * advanced by one full cycle from `now` (paying early or paying late
 * both reset the clock — the cycle restarts from when the player
 * cleared the bill). Does NOT touch cash — the caller deducts the
 * cost returned by `billTotalDue`.
 */
export function applyBillPayment(bill: BillState, now: number): BillState {
  return { id: bill.id, nextDueAt: now + BILL_CYCLE_DAYS * DAY_MS };
}

/** ------------------------------------------------------------------
 *  Loans
 *  ----------------------------------------------------------------*/

/** Each loan tier the player can borrow. APR is in basis points (8% = 800). */
export interface LoanTierDefinition {
  id: string;
  principal: number;
  aprBps: number;
  termWeeks: number;
}

/** The three loan tiers shown in the Bank's borrow sheet (mockup). */
export const LOAN_TIERS: readonly LoanTierDefinition[] = [
  { id: 'tier_1k', principal: 1_000, aprBps: 800, termWeeks: 4 },
  { id: 'tier_5k', principal: 5_000, aprBps: 1_400, termWeeks: 8 },
  { id: 'tier_20k', principal: 20_000, aprBps: 2_200, termWeeks: 16 },
];

/** Penalty added to the remaining balance for each week missed. */
export const LOAN_MISSED_PENALTY_RATE = 0.02;

/** Days between installments. */
export const LOAN_INSTALLMENT_DAYS = 7;

/** Mutable state for one active loan. v1: one loan at a time. */
export interface LoanState {
  tierId: string;
  /** Weekly installment amount, frozen at the moment the loan was taken. */
  weeklyPayment: number;
  /** Total USD still owed — pay-off when this hits 0. */
  totalRemaining: number;
  /** When the next installment is due. */
  nextPaymentDueAt: number;
  /** Count of missed weekly installments since the loan was taken. */
  missedPayments: number;
  takenAt: number;
}

/** Lookup a loan tier by id. */
export function findLoanTier(id: string): LoanTierDefinition | undefined {
  return LOAN_TIERS.find((t) => t.id === id);
}

/** Total interest charged over the full term (flat-interest model). */
export function loanTotalInterest(tier: LoanTierDefinition): number {
  const aprFraction = tier.aprBps / 10_000;
  const termYears = tier.termWeeks / 52;
  return tier.principal * aprFraction * termYears;
}

/** Flat-interest weekly installment. */
export function loanWeeklyPayment(tier: LoanTierDefinition): number {
  return (tier.principal + loanTotalInterest(tier)) / tier.termWeeks;
}

/** Total cost of the loan (principal + all interest). */
export function loanTotalCost(tier: LoanTierDefinition): number {
  return tier.principal + loanTotalInterest(tier);
}

/**
 * Take out a loan. Returns the new loan state and the principal that
 * should be credited to the player's cash. The caller is responsible
 * for refusing if the player already has a loan.
 */
export function createLoan(
  tier: LoanTierDefinition,
  now: number,
): { loan: LoanState; cashCredit: number } {
  const weeklyPayment = loanWeeklyPayment(tier);
  const totalRemaining = loanTotalCost(tier);
  const loan: LoanState = {
    tierId: tier.id,
    weeklyPayment,
    totalRemaining,
    nextPaymentDueAt: now + LOAN_INSTALLMENT_DAYS * DAY_MS,
    missedPayments: 0,
    takenAt: now,
  };
  return { loan, cashCredit: tier.principal };
}

/** Cost of the next installment, capped by what's still owed. */
export function nextInstallmentCost(loan: LoanState): number {
  return Math.min(loan.weeklyPayment, loan.totalRemaining);
}

/**
 * Apply one weekly installment. Returns the new loan state, or `null`
 * if the loan has been fully paid off. Does NOT touch cash — the
 * caller deducts the cost from `nextInstallmentCost` before calling.
 */
export function applyInstallment(
  loan: LoanState,
  now: number,
): LoanState | null {
  const paid = nextInstallmentCost(loan);
  const remaining = loan.totalRemaining - paid;
  if (remaining <= 0.005) return null;
  return {
    tierId: loan.tierId,
    weeklyPayment: loan.weeklyPayment,
    totalRemaining: remaining,
    nextPaymentDueAt: now + LOAN_INSTALLMENT_DAYS * DAY_MS,
    missedPayments: loan.missedPayments,
    takenAt: loan.takenAt,
  };
}

/**
 * Offline catch-up: for every full week past `nextPaymentDueAt` with
 * no payment, compound the missed-payment penalty onto the balance
 * and advance the due date by that many weeks. Pure — returns a new
 * loan state.
 */
export function accrueMissedInstallments(
  loan: LoanState,
  now: number,
): LoanState {
  const weekMs = LOAN_INSTALLMENT_DAYS * DAY_MS;
  const weeksMissed = Math.floor((now - loan.nextPaymentDueAt) / weekMs);
  if (weeksMissed <= 0) return loan;
  let totalRemaining = loan.totalRemaining;
  for (let i = 0; i < weeksMissed; i++) {
    totalRemaining = totalRemaining * (1 + LOAN_MISSED_PENALTY_RATE);
  }
  return {
    tierId: loan.tierId,
    weeklyPayment: loan.weeklyPayment,
    totalRemaining,
    nextPaymentDueAt: loan.nextPaymentDueAt + weeksMissed * weekMs,
    missedPayments: loan.missedPayments + weeksMissed,
    takenAt: loan.takenAt,
  };
}

/** ------------------------------------------------------------------
 *  Bank state
 *  ----------------------------------------------------------------*/

/** All of the Bank app's persistent state. */
export interface BankState {
  bills: BillState[];
  loan: LoanState | null;
}

/**
 * Seed bank state for a fresh game. All starter bills are due exactly
 * one cycle from `now`, giving the new player a full week to acclimate
 * before any pressure hits.
 */
export function createBank(now: number): BankState {
  return {
    bills: STARTING_BILLS.map((d) => ({
      id: d.id,
      nextDueAt: now + BILL_CYCLE_DAYS * DAY_MS,
    })),
    loan: null,
  };
}

/** Sum of every bill's total-due-right-now. */
export function billsTotalDue(
  state: BankState,
  defs: readonly BillDefinition[],
  now: number,
): number {
  let total = 0;
  for (const bill of state.bills) {
    const def = findBillDefinition(defs, bill.id);
    if (def) total += billTotalDue(def, bill, now);
  }
  return total;
}
