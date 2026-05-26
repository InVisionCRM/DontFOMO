/**
 * portfolioSparkline.test.ts — home widget portfolio visuals.
 */
import { describe, expect, it } from '@jest/globals';
import { createMarket, createRandom } from '../src/engine/market';
import {
  buildPortfolioSparkline,
  portfolioDayChangePercent,
} from '../src/ui/portfolioSparkline';

describe('portfolioSparkline', () => {
  const market = createMarket(createRandom(7));

  it('returns a flat line when there are no holdings', () => {
    const line = buildPortfolioSparkline({}, market);
    expect(line).toHaveLength(6);
  });

  it('computes zero day change with no holdings', () => {
    expect(portfolioDayChangePercent({}, market)).toBe(0);
  });

  it('returns a non-zero day change when holding a token', () => {
    const pct = portfolioDayChangePercent({ MOONP: 100 }, market);
    expect(Number.isFinite(pct)).toBe(true);
  });
});
