/**
 * displayName.ts — player identity helpers.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 */

/** Default label before onboarding sets a real name. */
export const DEFAULT_DISPLAY_NAME = 'New Player';

/**
 * Best-effort display name from a Clout handle slug, e.g. `@kyle_g`
 * → `Kyle G`. Used when loading saves that only stored handle.
 */
export function displayNameFromHandle(handle: string): string {
  const slug = handle.startsWith('@') ? handle.slice(1) : handle;
  if (!slug || slug === 'new_player') {
    return DEFAULT_DISPLAY_NAME;
  }
  return slug
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Flavour "following" count that scales with followers but stays below
 * a believable cap for early-game accounts.
 */
export function approxFollowingCount(followers: number): number {
  return Math.max(12, Math.min(2_400, Math.floor(followers * 0.18 + 12)));
}
