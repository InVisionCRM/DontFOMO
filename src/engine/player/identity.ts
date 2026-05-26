/**
 * identity.ts — player display identity helpers.
 * ------------------------------------------------------------------
 * Pure formatters for names shown in Clout, Wallet, and Settings.
 */
export const PLAYER_AVATAR_GRADIENT = ['#FB923C', '#EA580C'] as const;

/**
 * Resolve the label shown in profile headers. Falls back to a
 * title-cased handle slug when `displayName` was never set.
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
