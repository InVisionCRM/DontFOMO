import { describe, expect, it } from '@jest/globals';
import { computeNetWorth } from '../src/engine/economy/netWorth';
import { createMarket, createRandom } from '../src/engine/market';

describe('computeNetWorth', () => {
  it('sums cash, crypto, and owned assets', () => {
    const market = createMarket(createRandom(1));
    const nw = computeNetWorth(
      500,
      {},
      market,
      [{ id: 'car-hatchback', acquiredAt: 0 }],
    );
    expect(nw).toBeGreaterThan(500);
  });
});
