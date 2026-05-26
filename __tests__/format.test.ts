/**
 * format.test.ts — display helper unit tests.
 */
import { describe, expect, it } from '@jest/globals';
import { createMarket, createRandom } from '../src/engine/market';
import {
  cloutFollowingCount,
  deriveDisplayName,
  pickPortfolioSparkline,
  portfolioCaption,
} from '../src/ui/format';
import { STARTING_CASH } from '../src/state/store';

describe('deriveDisplayName', () => {
  it('title-cases an underscored handle', () => {
    expect(deriveDisplayName('@whale_king')).toBe('Whale King');
  });
  it('falls back for the default handle', () => {
    expect(deriveDisplayName('@new_player')).toBe('Player');
  });
});

describe('portfolioCaption', () => {
  it('shows starting balance for a fresh wallet', () => {
    expect(portfolioCaption(500, 500, 0, 0, STARTING_CASH)).toBe(
      'Starting balance',
    );
  });
  it('mentions crypto when holdings exist', () => {
    expect(portfolioCaption(600, 100, 500, 0, STARTING_CASH)).toContain('crypto');
  });
});

describe('pickPortfolioSparkline', () => {
  it('returns market history for the flagship token when flat', () => {
    const market = createMarket(createRandom(1));
    const data = pickPortfolioSparkline(market, {});
    expect(data.length).toBeGreaterThan(1);
  });
});

describe('cloutFollowingCount', () => {
  it('stays below follower count and grows with reputation', () => {
    expect(cloutFollowingCount(10_000)).toBeLessThan(10_000);
    expect(cloutFollowingCount(10_000)).toBeGreaterThan(cloutFollowingCount(100));
  });
});
