/**
 * store.test.ts — unit tests for the game store.
 * ------------------------------------------------------------------
 * The Zustand store works outside React (getState / setState), so the
 * actions and the save helpers can be tested headless through ts-jest.
 */
import { beforeEach, describe, expect, it } from '@jest/globals';
import { DAY_MS, dayNumber } from '../src/engine/time/clock';
import { createMarket, createRandom } from '../src/engine/market';
import { tokenLaunchCost } from '../src/engine/economy';
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
    };
    useGameStore.getState().loadSaved(saved, DAY_MS * 3);

    const state = useGameStore.getState();
    expect(state.cash).toBe(12_345);
    expect(state.followers).toBe(678);
    expect(state.handle).toBe('@whale');
    expect(state.holdings).toEqual({ NEURA: 42 });
    expect(state.playerTokens).toEqual([]);
    expect(state.openAppId).toBeNull();
    expect(state.clock.now).toBe(DAY_MS * 3);
  });

  it('serializeGame extracts only the persistent fields', () => {
    useGameStore.getState().openApp('news');
    const saved = serializeGame(useGameStore.getState());

    expect(Object.keys(saved).sort()).toEqual([
      'cash',
      'clock',
      'followers',
      'handle',
      'holdings',
      'market',
      'playerTokens',
    ]);
    expect(saved.cash).toBe(STARTING_CASH);
    expect(saved.handle).toBe(DEFAULT_HANDLE);
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
