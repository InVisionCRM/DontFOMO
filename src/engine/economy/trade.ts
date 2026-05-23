/**
 * trade.ts — Exchange trading math.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5). The buy / sell
 * quote math and portfolio valuation — every function pure and
 * unit-tested.
 */
import type { MarketState } from '../market';

/** The Exchange's trading fee — 0.3% of the trade value. */
export const EXCHANGE_FEE_RATE = 0.003;

/** The result of pricing a buy order. */
export interface BuyQuote {
  /** USD spent (the input). */
  usd: number;
  /** Exchange fee, in USD. */
  fee: number;
  /** Token amount received after the fee. */
  tokenAmount: number;
}

/** The result of pricing a sell order. */
export interface SellQuote {
  /** Token amount sold (the input). */
  tokenAmount: number;
  /** Exchange fee, in USD. */
  fee: number;
  /** USD received after the fee. */
  usd: number;
}

/** Quote a buy: spend `usd` on a token at `price`. */
export function quoteBuy(
  usd: number,
  price: number,
  feeRate: number = EXCHANGE_FEE_RATE,
): BuyQuote {
  const fee = usd * feeRate;
  const tokenAmount = price > 0 ? (usd - fee) / price : 0;
  return { usd, fee, tokenAmount };
}

/** Quote a sell: sell `tokenAmount` of a token at `price`. */
export function quoteSell(
  tokenAmount: number,
  price: number,
  feeRate: number = EXCHANGE_FEE_RATE,
): SellQuote {
  const gross = tokenAmount * price;
  const fee = gross * feeRate;
  return { tokenAmount, fee, usd: gross - fee };
}

/** Total USD value of a holdings map at current market prices. */
export function holdingsValue(
  holdings: Record<string, number>,
  market: MarketState,
): number {
  let total = 0;
  for (const id of Object.keys(holdings)) {
    const token = market.tokens[id];
    if (token) {
      total += holdings[id] * token.price;
    }
  }
  return total;
}
