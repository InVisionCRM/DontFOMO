/**
 * format.test.ts — unit tests for the UI display formatters.
 * ------------------------------------------------------------------
 * Pure functions, no React Native imports — safe under ts-jest.
 */
import { describe, expect, it } from '@jest/globals';
import {
  formatCurrency,
  formatRelativeTime,
  formatSignedPercent,
  formatTime,
  formatTokenAmount,
  formatTokenPrice,
} from '../src/ui/format';

/**
 * Fixed base instant so the relative-time buckets are stable
 * regardless of the host's clock. 2026-05-22 (Friday) at 14:30 local.
 */
const NOW = new Date(2026, 4, 22, 14, 30, 0, 0).getTime();

function at(offsetMs: number): number {
  return NOW - offsetMs;
}

describe('formatRelativeTime', () => {
  it('renders same-day messages as a 12-hour clock time', () => {
    // Two hours earlier on the same calendar day.
    const earlier = new Date(2026, 4, 22, 12, 15, 0, 0).getTime();
    expect(formatRelativeTime(earlier, NOW)).toBe('12:15');
  });

  it('renders messages from the prior calendar day as "Yesterday"', () => {
    const yesterday = new Date(2026, 4, 21, 23, 0, 0, 0).getTime();
    expect(formatRelativeTime(yesterday, NOW)).toBe('Yesterday');
  });

  it('renders messages within a week as a short weekday', () => {
    // Three days ago — same week.
    const earlier = at(3 * 86_400_000);
    const weekday = new Date(earlier).toLocaleDateString('en-US', {
      weekday: 'short',
    });
    expect(formatRelativeTime(earlier, NOW)).toBe(weekday);
  });

  it('renders older messages as a short month + day', () => {
    // Twenty days ago.
    const old = at(20 * 86_400_000);
    const md = new Date(old).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    expect(formatRelativeTime(old, NOW)).toBe(md);
  });
});

describe('formatTime', () => {
  it('renders midnight as 12:00 in the 12-hour clock', () => {
    const midnight = new Date(2026, 4, 22, 0, 0, 0, 0).getTime();
    expect(formatTime(midnight)).toBe('12:00');
  });

  it('zero-pads single-digit minutes', () => {
    const t = new Date(2026, 4, 22, 9, 4, 0, 0).getTime();
    expect(formatTime(t)).toBe('9:04');
  });
});

describe('formatCurrency', () => {
  it('renders whole dollars with two decimals', () => {
    expect(formatCurrency(500)).toBe('$500.00');
  });

  it('uses thousands separators for large amounts', () => {
    expect(formatCurrency(1234567.5)).toBe('$1,234,567.50');
  });
});

describe('formatTokenPrice', () => {
  it('uses two decimals for prices >= $1', () => {
    expect(formatTokenPrice(1.84)).toBe('$1.84');
  });

  it('uses four decimals for prices in [$0.01, $1)', () => {
    expect(formatTokenPrice(0.5)).toBe('$0.5000');
  });

  it('uses six decimals for prices in [$0.0001, $0.01)', () => {
    expect(formatTokenPrice(0.001234)).toBe('$0.001234');
  });

  it('uses eight decimals for sub-fraction-of-a-cent prices', () => {
    expect(formatTokenPrice(0.0000007)).toBe('$0.00000070');
  });
});

describe('formatSignedPercent', () => {
  it('prefixes positive values with +', () => {
    expect(formatSignedPercent(2.4)).toBe('+2.4%');
  });

  it('leaves negative values with their leading minus', () => {
    expect(formatSignedPercent(-7.2)).toBe('-7.2%');
  });
});

describe('formatTokenAmount', () => {
  it('drops decimals for amounts >= 1000', () => {
    expect(formatTokenAmount(19_400_000)).toBe('19,400,000');
  });

  it('keeps up to two decimals for amounts in [1, 1000)', () => {
    expect(formatTokenAmount(54.2)).toBe('54.2');
  });

  it('keeps up to six decimals for sub-1 amounts', () => {
    expect(formatTokenAmount(0.000142)).toBe('0.000142');
  });
});
