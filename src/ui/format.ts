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
