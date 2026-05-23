/**
 * store.test.ts — unit tests for the game store.
 * ------------------------------------------------------------------
 * The Zustand store works outside React (getState / setState), so the
 * actions and the save helpers can be tested headless through ts-jest.
 */
import { beforeEach, describe, expect, it } from '@jest/globals';
import { DAY_MS } from '../src/engine/time/clock';
import { createMarket, createRandom } from '../src/engine/market';
import {
  DEFAULT_HANDLE,
  STARTING_CASH,
  serializeGame,
  useGameStore,
  type SavedGame,
} from '../src/state/store';

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
    };
    useGameStore.getState().loadSaved(saved, DAY_MS * 3);

    const state = useGameStore.getState();
    expect(state.cash).toBe(12_345);
    expect(state.followers).toBe(678);
    expect(state.handle).toBe('@whale');
    expect(state.holdings).toEqual({ NEURA: 42 });
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
    ]);
    expect(saved.cash).toBe(STARTING_CASH);
    expect(saved.handle).toBe(DEFAULT_HANDLE);
  });
});
