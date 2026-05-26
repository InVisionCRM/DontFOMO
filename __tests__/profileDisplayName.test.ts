/**
 * profileDisplayName.test.ts — identity helper tests.
 */
import { describe, expect, it } from '@jest/globals';
import {
  approxFollowingCount,
  displayNameFromHandle,
} from '../src/engine/profile/displayName';

describe('displayNameFromHandle', () => {
  it('title-cases underscore slugs', () => {
    expect(displayNameFromHandle('@kyle_g')).toBe('Kyle G');
  });

  it('returns New Player for the default handle', () => {
    expect(displayNameFromHandle('@new_player')).toBe('New Player');
  });
});

describe('approxFollowingCount', () => {
  it('stays in a believable band for small accounts', () => {
    expect(approxFollowingCount(0)).toBe(12);
    expect(approxFollowingCount(500)).toBeGreaterThan(50);
  });
});
