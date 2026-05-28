/**
 * saveNormalize.test.ts — defensive defaults for load + serialize paths.
 */
import { createMarket, createRandom } from '../src/engine/market';
import { createBank, createCashSwipe, type BankState } from '../src/engine/economy';
import { createDirectorState } from '../src/engine/scam-director';
import { normalizeSavedGame } from '../src/state/saveNormalize';
import {
  DEFAULT_HANDLE,
  STARTING_CASH,
  serializeGame,
  useGameStore,
  type SavedGame,
} from '../src/state/store';

describe('normalizeSavedGame', () => {
  const now = 1_700_000_000_000;

  it('fills an empty partial blob with fresh-game defaults', () => {
    const out = normalizeSavedGame({}, now);
    expect(out.cash).toBe(STARTING_CASH);
    expect(out.followers).toBe(0);
    expect(out.handle).toBe(DEFAULT_HANDLE);
    expect(out.holdings).toEqual({});
    expect(out.bank.regulatoryHold).toBeNull();
    expect(out.bank.pendingWithdrawal).toBeNull();
    expect(out.onboarding.hasOnboarded).toBe(true);
    expect(out.cloutTakeover).toBeNull();
    expect(out.director.pacing).toBeDefined();
  });

  it('backfills bank hold fields on a legacy bank slice', () => {
    const legacyBank: Partial<BankState> = {
      bills: createBank(now).bills,
      loan: null,
    };
    const out = normalizeSavedGame({ bank: legacyBank }, now);
    expect(out.bank.regulatoryHold).toBeNull();
    expect(out.bank.pendingWithdrawal).toBeNull();
  });

  it('preserves explicit onboarding for mid-flow saves', () => {
    const out = normalizeSavedGame(
      {
        onboarding: { hasOnboarded: false, pendingSeedPhrase: ['abandon'] },
      },
      now,
    );
    expect(out.onboarding.hasOnboarded).toBe(false);
    expect(out.onboarding.pendingSeedPhrase).toEqual(['abandon']);
  });

  it('serializeGame output matches normalizeSavedGame on the same slice', () => {
    useGameStore.getState().newGame(now);
    const fromStore = serializeGame(useGameStore.getState());
    const fromNormalize = normalizeSavedGame(fromStore, now);
    expect(fromNormalize).toEqual(fromStore);
  });

  it('loadSaved tolerates a v12-shaped partial (no clipboard / onboarding)', () => {
    const v12: Partial<SavedGame> = {
      clock: { startedAt: 0, lastSeenAt: 0, now: 0 },
      cash: 250,
      followers: 5,
      handle: '@returning',
      market: createMarket(createRandom(2)),
      holdings: {},
      playerTokens: [],
      bank: createBank(0),
      cashSwipe: createCashSwipe(0),
      peakNetWorth: 250,
      lastUnemploymentCheckAt: now + 86_400_000,
      mail: [],
      tunnel: [],
      messages: [],
      bio: 'legacy',
      cloutFeed: [],
      dailyPost: { lastPostAt: 0, currentStreakDays: 0, graceDays: 0 },
      diamonds: 0,
      assets: [],
      director: createDirectorState(0),
    };
    const normalized = normalizeSavedGame(v12, now);
    expect(normalized.clipboard).toEqual([]);
    expect(normalized.onboarding.hasOnboarded).toBe(true);
    expect(normalized.cloutTakeover).toBeNull();
  });
});
