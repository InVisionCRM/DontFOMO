/**
 * identity.test.ts — player display helpers.
 */
import { describe, expect, it } from '@jest/globals';
import {
  followingCountApprox,
  resolveDisplayName,
} from '../src/engine/player/identity';

describe('resolveDisplayName', () => {
  it('prefers the stored display name', () => {
    expect(resolveDisplayName('Kyle G', '@kyleg')).toBe('Kyle G');
  });
  it('title-cases a handle slug when display name is empty', () => {
    expect(resolveDisplayName('', '@whale_king')).toBe('Whale King');
  });
  it('falls back to Player for the default handle', () => {
    expect(resolveDisplayName('', '@new_player')).toBe('Player');
  });
});

describe('followingCountApprox', () => {
  it('returns 0 when there are no followers', () => {
    expect(followingCountApprox(0)).toBe(0);
  });
  it('stays below the follower count', () => {
    const f = 10_000;
    expect(followingCountApprox(f)).toBeLessThan(f);
  });
});
