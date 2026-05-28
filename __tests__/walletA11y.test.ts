/**
 * walletA11y.test.ts — unit tests for the Wallet screen-reader label
 * helpers. Pure functions, no React Native imports — safe under
 * ts-jest.
 */
import { describe, expect, it } from '@jest/globals';
import {
  buildHoldingA11yLabel,
  describeDayChange,
} from '../src/ui/wallet/walletA11y';

describe('describeDayChange', () => {
  it('reads positive moves as "up N percent today"', () => {
    expect(describeDayChange(2.4)).toBe('up 2.4 percent today');
  });

  it('reads negative moves as "down N percent today" (no minus sign)', () => {
    // The whole point of the helper: VoiceOver should not have to
    // sound out a "-" symbol. Magnitude is positive, direction is a
    // word.
    expect(describeDayChange(-7.21)).toBe('down 7.2 percent today');
    expect(describeDayChange(-7.21)).not.toContain('-');
  });

  it('reads very small moves as "unchanged today"', () => {
    expect(describeDayChange(0)).toBe('unchanged today');
    expect(describeDayChange(0.04)).toBe('unchanged today');
    expect(describeDayChange(-0.049)).toBe('unchanged today');
  });

  it('rounds to one decimal place to match the visual', () => {
    expect(describeDayChange(1.249)).toBe('up 1.2 percent today');
    expect(describeDayChange(1.25)).toBe('up 1.3 percent today');
  });
});

describe('buildHoldingA11yLabel', () => {
  it('assembles the full row sentence in name → amount → value → change order', () => {
    const label = buildHoldingA11yLabel({
      name: 'Ethereum',
      amount: 1.5,
      symbol: 'ETH',
      usd: 4500,
      dayChangePct: 2.4,
    });
    expect(label).toBe(
      'Ethereum, 1.5 ETH, worth $4,500.00, up 2.4 percent today',
    );
  });

  it('uses the symbol verbatim so VoiceOver gets the ticker, not the name twice', () => {
    const label = buildHoldingA11yLabel({
      name: 'Solana',
      amount: 42,
      symbol: 'SOL',
      usd: 6300,
      dayChangePct: -3.1,
    });
    expect(label).toContain('42 SOL');
    expect(label).toContain('down 3.1 percent today');
  });

  it('never contains a bare "+" or "-" in the day-change phrase', () => {
    const up = buildHoldingA11yLabel({
      name: 'Bitcoin',
      amount: 0.05,
      symbol: 'BTC',
      usd: 5000,
      dayChangePct: 1.5,
    });
    const down = buildHoldingA11yLabel({
      name: 'Bitcoin',
      amount: 0.05,
      symbol: 'BTC',
      usd: 5000,
      dayChangePct: -1.5,
    });
    expect(up).not.toContain('+');
    expect(down.split('worth')[1]).not.toContain('-');
  });
});
