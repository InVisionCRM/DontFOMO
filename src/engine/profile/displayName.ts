/**
 * displayName.ts — derive a human-readable name from a Clout handle.
 * ------------------------------------------------------------------
 * Pure TypeScript. The store persists `@slug` handles from onboarding;
 * screens show a title-cased display name without a separate save field.
 */

/** Fallback when the handle is empty or still the pre-onboarding default. */
export const DEFAULT_DISPLAY_NAME = 'New player';

/**
 * Turn `@john_doe` into `John Doe`. Underscores become spaces; each word
 * is title-cased. The pre-onboarding `@new_player` maps to the default.
 */
export function displayNameFromHandle(handle: string): string {
  const raw = handle.startsWith('@') ? handle.slice(1) : handle.trim();
  if (!raw || raw === 'new_player') return DEFAULT_DISPLAY_NAME;
  const words = raw.split('_').filter((w) => w.length > 0);
  if (words.length === 0) return DEFAULT_DISPLAY_NAME;
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
