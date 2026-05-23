/**
 * store.test.ts — unit tests for the game store.
 * ------------------------------------------------------------------
 * The Zustand store works outside React (getState / setState), so the
 * actions and the save helpers can be tested headless through ts-jest.
 */
import { beforeEach, describe, expect, it } from '@jest/globals';
import { DAY_MS, dayNumber } from '../src/engine/time/clock';
import { createMarket, createRandom } from '../src/engine/market';
import {
  BILL_CYCLE_DAYS,
  CASH_SWIPE_DAILY_CAP,
  CHECK_MIN_USD,
  LOAN_INSTALLMENT_DAYS,
  LOAN_TIERS,
  STARTING_BILLS,
  createBank,
  createCashSwipe,
  loanWeeklyPayment,
  tokenLaunchCost,
  unemploymentAmount,
} from '../src/engine/economy';
import {
  DEFAULT_HANDLE,
  STARTING_CASH,
  serializeGame,
  useGameStore,
  type LaunchTokenInput,
  type SavedGame,
} from '../src/state/store';

/** A reusable launch request for the player-token tests. */
const SAMPLE_LAUNCH: LaunchTokenInput = {
  id: 'DEGEN',
  name: 'DegenCoin',
  emoji: '🚀',
  gradient: ['#7C5CFF', '#D4537E'],
};

describe('game store', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(1_000);
  });

  it('newGame produces a fresh game', () => {
    const state = useGameStore.getState();
    expect(state.cash).toBe(STARTING_CASH);
    expect(state.followers).toBe(0);
    expect(state.handle).toBe(DEFAULT_HANDLE);
    expect(state.openAppId).toBeNull();
    expect(state.holdings).toEqual({});
    expect(state.playerTokens).toEqual([]);
    expect(state.bank.bills).toHaveLength(STARTING_BILLS.length);
    expect(state.bank.loan).toBeNull();
    expect(state.cashSwipe.swipesUsed).toBe(0);
    expect(state.clock).toEqual({
      startedAt: 1_000,
      lastSeenAt: 1_000,
      now: 1_000,
    });
    expect(state.market.tokens.USDX).toBeDefined();
  });

  it('tick advances the clock', () => {
    useGameStore.getState().tick(9_000);
    expect(useGameStore.getState().clock.now).toBe(9_000);
  });

  it('tickMarket advances the market by one step', () => {
    const before = useGameStore.getState().market.tokens.MOONP.history.length;
    useGameStore.getState().tickMarket();
    const after = useGameStore.getState().market.tokens.MOONP.history.length;
    expect(after).toBe(before + 1);
  });

  it('openApp and closeApp set which app is open', () => {
    useGameStore.getState().openApp('exchange');
    expect(useGameStore.getState().openAppId).toBe('exchange');
    useGameStore.getState().closeApp();
    expect(useGameStore.getState().openAppId).toBeNull();
  });

  it('buyToken spends cash and adds a holding', () => {
    useGameStore.getState().buyToken('NEURA', 100);
    const state = useGameStore.getState();
    expect(state.cash).toBe(STARTING_CASH - 100);
    expect(state.holdings.NEURA).toBeGreaterThan(0);
  });

  it('buyToken refuses to spend more cash than you have', () => {
    useGameStore.getState().buyToken('NEURA', STARTING_CASH + 1);
    const state = useGameStore.getState();
    expect(state.cash).toBe(STARTING_CASH);
    expect(state.holdings.NEURA).toBeUndefined();
  });

  it('buyToken on a catalogue token does not move followers', () => {
    useGameStore.getState().buyToken('NEURA', 100);
    expect(useGameStore.getState().followers).toBe(0);
  });

  it('sellToken returns cash and clears a fully-sold holding', () => {
    useGameStore.getState().buyToken('NEURA', 100);
    const owned = useGameStore.getState().holdings.NEURA;
    useGameStore.getState().sellToken('NEURA', owned);
    const state = useGameStore.getState();
    expect(state.holdings.NEURA).toBeUndefined();
    expect(state.cash).toBeGreaterThan(STARTING_CASH - 100);
  });

  it('loadSaved restores a saved game and catches the clock up', () => {
    const saved: SavedGame = {
      clock: { startedAt: 0, lastSeenAt: 0, now: 0 },
      cash: 12_345,
      followers: 678,
      handle: '@whale',
      market: createMarket(createRandom(1)),
      holdings: { NEURA: 42 },
      playerTokens: [],
      bank: createBank(0),
      cashSwipe: createCashSwipe(0),
      peakNetWorth: 50_000,
      lastUnemploymentCheckAt: DAY_MS * 3, // future so loadSaved doesn't auto-credit
    };
    useGameStore.getState().loadSaved(saved, DAY_MS * 3);

    const state = useGameStore.getState();
    expect(state.cash).toBe(12_345);
    expect(state.followers).toBe(678);
    expect(state.handle).toBe('@whale');
    expect(state.holdings).toEqual({ NEURA: 42 });
    expect(state.playerTokens).toEqual([]);
    expect(state.bank.bills).toHaveLength(STARTING_BILLS.length);
    expect(state.bank.loan).toBeNull();
    expect(state.cashSwipe).toBeDefined();
    expect(state.openAppId).toBeNull();
    expect(state.clock.now).toBe(DAY_MS * 3);
  });

  it('serializeGame extracts only the persistent fields', () => {
    useGameStore.getState().openApp('news');
    const saved = serializeGame(useGameStore.getState());

    expect(Object.keys(saved).sort()).toEqual([
      'bank',
      'cash',
      'cashSwipe',
      'clock',
      'followers',
      'handle',
      'holdings',
      'lastUnemploymentCheckAt',
      'market',
      'peakNetWorth',
      'playerTokens',
    ]);
    expect(saved.cash).toBe(STARTING_CASH);
    expect(saved.handle).toBe(DEFAULT_HANDLE);
  });
});

describe('bank actions', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(1_000);
    useGameStore.setState({ cash: 50_000 }); // enough to cover bills and loans
  });

  it('payBill deducts cash and advances the bill due-date by one cycle', () => {
    const now = useGameStore.getState().clock.now + 3 * DAY_MS; // pay mid-cycle

    useGameStore.getState().payBill('rent', now);

    const after = useGameStore.getState();
    expect(after.cash).toBe(50_000 - 1_200); // rent is $1,200, not overdue
    const billAfter = after.bank.bills.find((b) => b.id === 'rent')!;
    // Paying mid-cycle resets the clock — next due is `now + 1 cycle`.
    expect(billAfter.nextDueAt).toBe(now + BILL_CYCLE_DAYS * DAY_MS);
  });

  it('payBill refuses when cash is short and leaves the bill alone', () => {
    useGameStore.setState({ cash: 10 });
    const before = useGameStore.getState();
    useGameStore.getState().payBill('rent', before.clock.now);
    const after = useGameStore.getState();
    expect(after.cash).toBe(10);
    expect(after.bank.bills.find((b) => b.id === 'rent')?.nextDueAt).toBe(
      before.bank.bills.find((b) => b.id === 'rent')?.nextDueAt,
    );
  });

  it('payBill on a late bill charges the accrued late fee', () => {
    const now = useGameStore.getState().clock.now;
    // Force rent into a 4-day overdue state.
    useGameStore.setState((s) => ({
      bank: {
        bills: s.bank.bills.map((b) =>
          b.id === 'rent' ? { ...b, nextDueAt: now - 4 * DAY_MS } : b,
        ),
        loan: s.bank.loan,
      },
    }));
    useGameStore.getState().payBill('rent', now);
    // Rent $1,200 + 4 days * 1% = $1,200 + $48 = $1,248
    expect(useGameStore.getState().cash).toBeCloseTo(50_000 - 1_248, 4);
  });

  it('takeLoan credits the principal in cash and opens a loan', () => {
    const tier = LOAN_TIERS[1]; // 5k tier
    const now = useGameStore.getState().clock.now;
    useGameStore.getState().takeLoan(tier.id, now);
    const after = useGameStore.getState();
    expect(after.cash).toBe(50_000 + tier.principal);
    expect(after.bank.loan).not.toBeNull();
    expect(after.bank.loan!.tierId).toBe(tier.id);
    expect(after.bank.loan!.weeklyPayment).toBeCloseTo(
      loanWeeklyPayment(tier),
      6,
    );
    expect(after.bank.loan!.nextPaymentDueAt).toBe(
      now + LOAN_INSTALLMENT_DAYS * DAY_MS,
    );
  });

  it('takeLoan refuses a second loan while one is active', () => {
    const now = useGameStore.getState().clock.now;
    useGameStore.getState().takeLoan('tier_1k', now);
    const cashAfterFirst = useGameStore.getState().cash;
    useGameStore.getState().takeLoan('tier_5k', now);
    expect(useGameStore.getState().cash).toBe(cashAfterFirst);
    expect(useGameStore.getState().bank.loan?.tierId).toBe('tier_1k');
  });

  it('takeLoan with an unknown tier is a no-op', () => {
    const before = useGameStore.getState();
    useGameStore.getState().takeLoan('tier_999k', before.clock.now);
    expect(useGameStore.getState().cash).toBe(before.cash);
    expect(useGameStore.getState().bank.loan).toBeNull();
  });

  it('repayLoanInstallment deducts the weekly payment and advances the due date', () => {
    const now = useGameStore.getState().clock.now;
    useGameStore.getState().takeLoan('tier_5k', now);
    const cashAfterTake = useGameStore.getState().cash;
    const loan = useGameStore.getState().bank.loan!;

    useGameStore.getState().repayLoanInstallment(now + DAY_MS);

    const after = useGameStore.getState();
    expect(after.cash).toBeCloseTo(cashAfterTake - loan.weeklyPayment, 4);
    expect(after.bank.loan!.totalRemaining).toBeCloseTo(
      loan.totalRemaining - loan.weeklyPayment,
      4,
    );
    expect(after.bank.loan!.nextPaymentDueAt).toBe(
      now + DAY_MS + LOAN_INSTALLMENT_DAYS * DAY_MS,
    );
  });

  it('repayLoanInstallment paying off the last installment clears the loan', () => {
    const now = useGameStore.getState().clock.now;
    useGameStore.getState().takeLoan('tier_1k', now); // 4-week loan
    for (let i = 0; i < 4; i++) {
      useGameStore.getState().repayLoanInstallment(now + (i + 1) * DAY_MS);
    }
    expect(useGameStore.getState().bank.loan).toBeNull();
  });

  it('repayLoanInstallment with no loan is a no-op', () => {
    const before = useGameStore.getState();
    useGameStore.getState().repayLoanInstallment(before.clock.now);
    expect(useGameStore.getState().cash).toBe(before.cash);
  });

  it('repayLoanInstallment refuses when cash is short of the installment', () => {
    const now = useGameStore.getState().clock.now;
    useGameStore.getState().takeLoan('tier_5k', now);
    useGameStore.setState({ cash: 1 });
    useGameStore.getState().repayLoanInstallment(now + DAY_MS);
    expect(useGameStore.getState().cash).toBe(1);
    expect(useGameStore.getState().bank.loan).not.toBeNull();
  });

  it('round-trips the bank through serialize and loadSaved', () => {
    const now = useGameStore.getState().clock.now;
    useGameStore.getState().takeLoan('tier_5k', now);
    useGameStore.getState().payBill('rent', now);
    const saved = serializeGame(useGameStore.getState());

    useGameStore.getState().newGame(2_000); // wipe
    expect(useGameStore.getState().bank.loan).toBeNull();

    useGameStore.getState().loadSaved(saved, now);
    const restored = useGameStore.getState();
    expect(restored.bank.loan?.tierId).toBe('tier_5k');
    expect(
      restored.bank.bills.find((b) => b.id === 'rent')?.nextDueAt,
    ).toBe(now + BILL_CYCLE_DAYS * DAY_MS);
  });
});

describe('unemployment check (Thursday 8pm Eastern)', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(1_000);
  });

  /** Thursday 2026-05-21 20:00 America/New_York = 2026-05-22 00:00 UTC. */
  const THU_8PM_EDT_UTC = Date.UTC(2026, 4, 22, 0, 0, 0);

  it('newGame initialises peakNetWorth to STARTING_CASH', () => {
    expect(useGameStore.getState().peakNetWorth).toBe(STARTING_CASH);
  });

  it('tick raises peakNetWorth when net worth grows', () => {
    useGameStore.setState({ cash: 5_000 });
    useGameStore.getState().tick(2_000);
    expect(useGameStore.getState().peakNetWorth).toBe(5_000);
  });

  it('tick never lowers peakNetWorth', () => {
    useGameStore.setState({ cash: 5_000 });
    useGameStore.getState().tick(2_000);
    useGameStore.setState({ cash: 100 }); // lose almost all the cash
    useGameStore.getState().tick(3_000);
    expect(useGameStore.getState().peakNetWorth).toBe(5_000);
  });

  it('credits the unemployment check at the Thursday 8pm Eastern boundary', () => {
    // Set the player up with a meaningful peak and a stale last-check.
    useGameStore.setState({
      cash: 1_000,
      peakNetWorth: 100_000, // 4% of 100k = $4,000
      lastUnemploymentCheckAt: THU_8PM_EDT_UTC - 7 * DAY_MS, // a week ago
    });

    useGameStore.getState().tick(THU_8PM_EDT_UTC);

    const state = useGameStore.getState();
    expect(state.cash).toBe(1_000 + unemploymentAmount(100_000));
    expect(state.lastUnemploymentCheckAt).toBe(THU_8PM_EDT_UTC);
  });

  it('does not double-credit on the same Thursday', () => {
    useGameStore.setState({
      cash: 1_000,
      peakNetWorth: 10_000,
      lastUnemploymentCheckAt: THU_8PM_EDT_UTC - 7 * DAY_MS,
    });

    useGameStore.getState().tick(THU_8PM_EDT_UTC);
    const cashAfterFirst = useGameStore.getState().cash;
    // Another tick an hour later — still Thursday but already credited.
    useGameStore.getState().tick(THU_8PM_EDT_UTC + 3_600_000);
    expect(useGameStore.getState().cash).toBe(cashAfterFirst);
  });

  it('floors the check at CHECK_MIN_USD even with a zero peak', () => {
    useGameStore.setState({
      cash: 0,
      peakNetWorth: 0,
      lastUnemploymentCheckAt: THU_8PM_EDT_UTC - 7 * DAY_MS,
    });
    useGameStore.getState().tick(THU_8PM_EDT_UTC);
    expect(useGameStore.getState().cash).toBe(CHECK_MIN_USD);
  });

  it('credits one check on resume across an offline Thursday', () => {
    // Last check was a Wednesday two weeks ago; player returns the following Friday.
    const wedBefore = Date.UTC(2026, 4, 13, 14, 0, 0); // Wed 2026-05-13 10am EDT
    const friAfter = Date.UTC(2026, 4, 22, 18, 0, 0); // Fri 2026-05-22 2pm EDT
    useGameStore.setState({
      cash: 500,
      peakNetWorth: 25_000,
      lastUnemploymentCheckAt: wedBefore,
      clock: { startedAt: 0, lastSeenAt: wedBefore, now: wedBefore },
    });

    useGameStore.getState().resume(friAfter);

    const state = useGameStore.getState();
    expect(state.cash).toBe(500 + unemploymentAmount(25_000));
    expect(state.lastUnemploymentCheckAt).toBe(friAfter);
  });
});

describe('swipeOnce', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(1_000);
  });

  it('credits $1 cash and increments the swipe count', () => {
    const beforeCash = useGameStore.getState().cash;
    const now = useGameStore.getState().clock.now;
    useGameStore.getState().swipeOnce(now);
    const after = useGameStore.getState();
    expect(after.cash).toBe(beforeCash + 1);
    expect(after.cashSwipe.swipesUsed).toBe(1);
  });

  it('is a no-op once the daily cap is reached', () => {
    const now = useGameStore.getState().clock.now;
    // Force the cap.
    useGameStore.setState((s) => ({
      cashSwipe: { dayKey: s.cashSwipe.dayKey, swipesUsed: CASH_SWIPE_DAILY_CAP },
    }));
    const beforeCash = useGameStore.getState().cash;
    useGameStore.getState().swipeOnce(now);
    const after = useGameStore.getState();
    expect(after.cash).toBe(beforeCash);
    expect(after.cashSwipe.swipesUsed).toBe(CASH_SWIPE_DAILY_CAP);
  });

  it('refreshes the day before spending — a swipe after midnight pays $1', () => {
    // Force a yesterday-capped state.
    useGameStore.setState({
      cashSwipe: { dayKey: '2026-05-23', swipesUsed: CASH_SWIPE_DAILY_CAP },
    });
    const beforeCash = useGameStore.getState().cash;
    // Local midnight + 30 min on May 24.
    const tomorrow = new Date(2026, 4, 24, 0, 30, 0, 0).getTime();
    useGameStore.getState().swipeOnce(tomorrow);
    const after = useGameStore.getState();
    expect(after.cash).toBe(beforeCash + 1);
    expect(after.cashSwipe.dayKey).toBe('2026-05-24');
    expect(after.cashSwipe.swipesUsed).toBe(1);
  });

  it('round-trips through serialize / loadSaved', () => {
    const now = useGameStore.getState().clock.now;
    useGameStore.getState().swipeOnce(now);
    useGameStore.getState().swipeOnce(now);
    useGameStore.getState().swipeOnce(now);
    const saved = serializeGame(useGameStore.getState());
    expect(saved.cashSwipe.swipesUsed).toBe(3);

    useGameStore.getState().newGame(2_000);
    expect(useGameStore.getState().cashSwipe.swipesUsed).toBe(0);

    useGameStore.getState().loadSaved(saved, now);
    expect(useGameStore.getState().cashSwipe.swipesUsed).toBe(3);
  });
});

describe('launchToken', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(1_000);
  });

  it('mints the first token for free and adds it to the market', () => {
    useGameStore.getState().launchToken(SAMPLE_LAUNCH);
    const state = useGameStore.getState();
    expect(state.cash).toBe(STARTING_CASH); // first launch is free
    expect(state.playerTokens).toHaveLength(1);
    expect(state.playerTokens[0].id).toBe('DEGEN');
    expect(state.market.tokens.DEGEN).toBeDefined();
    expect(state.market.tokens.DEGEN.price).toBeGreaterThan(0);
  });

  it('rejects a ticker that already exists in the market', () => {
    useGameStore.getState().launchToken({ ...SAMPLE_LAUNCH, id: 'NEURA' });
    expect(useGameStore.getState().playerTokens).toHaveLength(0);
  });

  it('charges for the second token and refuses a third', () => {
    // Fund the player so the (paid) second launch is affordable.
    useGameStore.setState({ cash: 100_000 });
    // The day-2 launch cost, computed straight from the engine rule.
    const secondCost = tokenLaunchCost(
      2,
      dayNumber(useGameStore.getState().clock),
    );
    expect(secondCost).toBeGreaterThan(0);

    useGameStore.getState().launchToken(SAMPLE_LAUNCH); // first — free
    useGameStore
      .getState()
      .launchToken({ ...SAMPLE_LAUNCH, id: 'DEGEN2', name: 'DegenTwo' });
    expect(useGameStore.getState().playerTokens).toHaveLength(2);
    expect(useGameStore.getState().cash).toBe(100_000 - secondCost);

    // The third launch must be rejected (MAX_PLAYER_TOKENS is 2).
    useGameStore
      .getState()
      .launchToken({ ...SAMPLE_LAUNCH, id: 'DEGEN3', name: 'DegenThree' });
    expect(useGameStore.getState().playerTokens).toHaveLength(2);
  });

  it('grows followers when the player pumps (buys) their own token', () => {
    useGameStore.getState().launchToken(SAMPLE_LAUNCH);
    expect(useGameStore.getState().followers).toBe(0);
    useGameStore.getState().buyToken('DEGEN', 50);
    expect(useGameStore.getState().followers).toBeGreaterThan(0);
  });

  it('loses followers when the player dumps (sells) their own token', () => {
    useGameStore.getState().launchToken(SAMPLE_LAUNCH);
    useGameStore.getState().buyToken('DEGEN', 50);
    const afterPump = useGameStore.getState().followers;
    const owned = useGameStore.getState().holdings.DEGEN;
    useGameStore.getState().sellToken('DEGEN', owned);
    expect(useGameStore.getState().followers).toBeLessThan(afterPump);
  });

  it('keeps a launched token across a save / load round-trip', () => {
    useGameStore.getState().launchToken(SAMPLE_LAUNCH);
    const saved = serializeGame(useGameStore.getState());
    useGameStore.getState().newGame(2_000);
    expect(useGameStore.getState().playerTokens).toHaveLength(0);
    useGameStore.getState().loadSaved(saved, 2_000);
    const state = useGameStore.getState();
    expect(state.playerTokens).toHaveLength(1);
    expect(state.playerTokens[0].id).toBe('DEGEN');
    expect(state.market.tokens.DEGEN).toBeDefined();
  });
});
