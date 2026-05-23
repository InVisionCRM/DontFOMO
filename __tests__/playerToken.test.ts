/**
 * playerToken.test.ts — unit tests for player-created token logic.
 * ------------------------------------------------------------------
 * Pure logic — runs headless through ts-jest.
 */
import { describe, expect, it } from '@jest/globals';
import { createRandom } from '../src/engine/market';
import {
  MAX_PLAYER_TOKENS,
  createPlayerToken,
  followerVolatility,
  followersFromDump,
  followersFromPump,
  tokenLaunchCost,
} from '../src/engine/economy';

describe('tokenLaunchCost', () => {
  it('is free for the first token, whatever day it is', () => {
    expect(tokenLaunchCost(1, 0)).toBe(0);
    expect(tokenLaunchCost(1, 80)).toBe(0);
  });

  it('charges for the second token and rises with days survived', () => {
    const day0 = tokenLaunchCost(2, 0);
    const day20 = tokenLaunchCost(2, 20);
    expect(day0).toBeGreaterThan(0);
    expect(day20).toBeGreaterThan(day0);
  });
});

describe('followerVolatility', () => {
  it('is zero with no followers', () => {
    expect(followerVolatility(0)).toBe(0);
  });

  it('rises with followers but stays bounded', () => {
    expect(followerVolatility(2000)).toBeGreaterThan(followerVolatility(100));
    expect(followerVolatility(10_000_000)).toBeLessThan(0.1);
  });
});

describe('followersFromPump', () => {
  it('always grants at least one follower', () => {
    expect(followersFromPump(9_999_999)).toBeGreaterThanOrEqual(1);
  });

  it('grants more to a small account than a large one', () => {
    expect(followersFromPump(0)).toBeGreaterThan(followersFromPump(5000));
  });
});

describe('followersFromDump', () => {
  it('costs more the larger the account (founder scrutiny)', () => {
    expect(followersFromDump(5000)).toBeGreaterThan(followersFromDump(0));
  });
});

describe('createPlayerToken', () => {
  it('builds a definition and an initial market state', () => {
    const { def, state } = createPlayerToken(
      { id: 'DMOON', name: 'DogeMoon', emoji: '🐶', gradient: ['#fff', '#000'] },
      7,
      createRandom(3),
    );
    expect(def.id).toBe('DMOON');
    expect(def.name).toBe('DogeMoon');
    expect(def.launchedOnDay).toBe(7);
    expect(state.id).toBe('DMOON');
    expect(state.price).toBeGreaterThan(0);
    expect(state.history.length).toBeGreaterThan(1);
  });
});

describe('MAX_PLAYER_TOKENS', () => {
  it('is two', () => {
    expect(MAX_PLAYER_TOKENS).toBe(2);
  });
});
