/**
 * format.ts — display formatters.
 * ------------------------------------------------------------------
 * Pure functions that turn raw game values into the strings shown on
 * screen. Presentational helpers — they live in the UI layer, not the
 * engine, because formatting is a display concern.
 */
import type { MarketState } from '../engine/market';

/** Format an epoch-ms timestamp as a 12-hour clock, e.g. "9:41". */
export function formatTime(epochMs: number): string {
  const d = new Date(epochMs);
  const h = d.getHours();
  const m = d.getMinutes();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m < 10 ? `0${m}` : m}`;
}

/** Format an epoch-ms timestamp as a short date, e.g. "Fri, May 22". */
export function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Format a dollar amount as currency, e.g. "$500.00". */
export function formatCurrency(dollars: number): string {
  return `$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a token price — more decimal places the smaller the price,
 * so sub-cent meme coins still read clearly. e.g. "$1.84", "$0.000071".
 */
export function formatTokenPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(8)}`;
}

/** Format a percentage change with a sign, e.g. "+2.4%", "-7.2%". */
export function formatSignedPercent(percent: number): string {
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
}

/**
 * Format a token quantity — commas for large amounts, a few decimals
 * for small ones. e.g. "19,400,000", "54.20", "0.000142".
 */
export function formatTokenAmount(amount: number): string {
  if (amount >= 1000) {
    return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  if (amount >= 1) {
    return amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return amount.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

/**
 * Inbox-style relative time: same-day → "h:mm", yesterday →
 * "Yesterday", within a week → short weekday ("Mon"), older → short
 * month/day ("May 21").
 */
/** Turn a Clout handle into a readable name when `displayName` is missing. */
export function deriveDisplayName(handle: string): string {
  const slug = handle.startsWith('@') ? handle.slice(1) : handle;
  if (!slug || slug === 'new_player') return 'Player';
  return slug
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * One-line caption under the home Portfolio widget — reflects how much
 * of net worth is cash vs crypto vs owned assets.
 */
export function portfolioCaption(
  netWorth: number,
  cash: number,
  cryptoValue: number,
  assetValue: number,
  startingCash: number,
): string {
  if (
    netWorth <= startingCash + 0.01 &&
    cryptoValue < 0.01 &&
    assetValue < 0.01
  ) {
    return 'Starting balance';
  }
  if (cryptoValue < 0.01 && assetValue < 0.01) {
    return 'All cash';
  }
  const parts: string[] = [];
  if (cryptoValue >= 1) parts.push('crypto');
  if (assetValue >= 1) parts.push('assets');
  if (parts.length === 0) return 'Mostly cash';
  const cashShare = cash / Math.max(netWorth, 1);
  if (cashShare >= 0.85) return `${parts.join(' · ')} · cash-heavy`;
  return parts.join(' · ');
}

/**
 * Sparkline series for the home Portfolio widget — the player's largest
 * holding when they have one, otherwise the flagship meme token so the
 * line still moves with the live market.
 */
export function pickPortfolioSparkline(
  market: MarketState,
  holdings: Record<string, number>,
): number[] {
  const heldIds = Object.keys(holdings).filter((id) => (holdings[id] ?? 0) > 0);
  let seriesId = 'MOONP';
  if (heldIds.length > 0) {
    let bestVal = 0;
    for (const id of heldIds) {
      const tok = market.tokens[id];
      if (!tok) continue;
      const val = (holdings[id] ?? 0) * tok.price;
      if (val > bestVal) {
        bestVal = val;
        seriesId = id;
      }
    }
  }
  return market.tokens[seriesId]?.history.slice(-24) ?? [];
}

/** Flavour "following" count that scales with followers but stays below it. */
export function cloutFollowingCount(followers: number): number {
  return Math.min(
    followers,
    Math.max(12, Math.round(48 + Math.sqrt(Math.max(followers, 0)) * 2.8)),
  );
}

export function formatRelativeTime(at: number, now: number): string {
  const a = new Date(at);
  const n = new Date(now);
  if (a.toDateString() === n.toDateString()) {
    return formatTime(at);
  }
  const yesterday = new Date(n);
  yesterday.setDate(n.getDate() - 1);
  if (a.toDateString() === yesterday.toDateString()) return 'Yesterday';
  const daysAgo = Math.floor((n.getTime() - a.getTime()) / 86_400_000);
  if (daysAgo < 7) {
    return a.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return a.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
