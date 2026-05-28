/**
 * walletA11y.ts — pure screen-reader label helpers for the Wallet app.
 *
 * Builders here turn token-row data into one continuous sentence
 * VoiceOver / TalkBack can read without stumbling on "+" / "-"
 * punctuation. Kept pure (no React) so they can be unit-tested
 * directly.
 */
import { formatCurrency, formatTokenAmount } from '../format';

/** A change small enough to read as "unchanged" rather than a tiny up/down. */
const FLAT_THRESHOLD_PCT = 0.05;

export type HoldingRowA11yInput = {
  readonly name: string;
  readonly amount: number;
  readonly symbol: string;
  readonly usd: number;
  readonly dayChangePct: number;
};

/**
 * Build a screen-reader label for one Wallet token row. Uses "up" /
 * "down" / "unchanged" words instead of "+" / "-" so VoiceOver and
 * TalkBack don't trip on the punctuation.
 */
export function buildHoldingA11yLabel(input: HoldingRowA11yInput): string {
  const change = describeDayChange(input.dayChangePct);
  return (
    `${input.name}, ` +
    `${formatTokenAmount(input.amount)} ${input.symbol}, ` +
    `worth ${formatCurrency(input.usd)}, ` +
    `${change}`
  );
}

/** "up 2.4 percent today", "down 7.2 percent today", "unchanged today". */
export function describeDayChange(pct: number): string {
  if (pct > FLAT_THRESHOLD_PCT) {
    return `up ${Math.abs(pct).toFixed(1)} percent today`;
  }
  if (pct < -FLAT_THRESHOLD_PCT) {
    return `down ${Math.abs(pct).toFixed(1)} percent today`;
  }
  return 'unchanged today';
}
