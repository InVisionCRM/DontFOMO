/**
 * format.ts — display formatters.
 * ------------------------------------------------------------------
 * Pure functions that turn raw game values into the strings shown on
 * screen. Presentational helpers — they live in the UI layer, not the
 * engine, because formatting is a display concern.
 */

/** Format an epoch-ms timestamp as a 12-hour clock, e.g. "9:41". */
export function formatTime(epochMs: number): string {
  const d = new Date(epochMs);
  const h = d.getHours();
  const m = d.getMinutes();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m < 10 ? `0${m}` : m}`;
}

/** Status-bar clock with meridiem, e.g. "9:41 AM". */
export function formatStatusTime(epochMs: number): string {
  const d = new Date(epochMs);
  const h = d.getHours();
  const m = d.getMinutes();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? 'AM' : 'PM';
  return `${hour12}:${m < 10 ? `0${m}` : m} ${period}`;
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
