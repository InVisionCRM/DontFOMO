/**
 * identity.ts — player display identity helpers.
 * ------------------------------------------------------------------
 * Pure formatters for names shown in Clout, Wallet, and Settings.
 */

/** Warm-orange avatar gradient used across onboarding and profile UI. */
export const PLAYER_AVATAR_GRADIENT = ['#FB923C', '#EA580C'] as const;

/**
 * Resolve the label shown in profile headers. Falls back to a
 * title-cased handle slug when `displayName` was never set (pre-v14
 * saves or dev fresh games before onboarding).
 */
export function resolveDisplayName(
  displayName: string | undefined,
  handle: string,
): string {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  const slug = handle.startsWith('@') ? handle.slice(1) : handle;
  if (!slug || slug === 'new_player') return 'Player';
  return slug
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Flavour-only "Following" count for Clout — scales with followers but
 * stays below the follower total so the strip reads believably.
 */
export function followingCountApprox(followers: number): number {
  if (followers <= 0) return 0;
  return Math.max(8, Math.min(followers - 1, Math.round(followers * 0.11 + 24)));
}
