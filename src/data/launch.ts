/**
 * launch.ts — content for the player token-launch flow.
 * ------------------------------------------------------------------
 * The launch wizard is data-driven (CLAUDE.md §5): the emoji a player
 * can pick, and the satirical "about" blurb shown on a player token's
 * detail screen, both live here as DATA — not baked into components.
 *
 * Pure data — no React, no React Native imports.
 */

/**
 * The curated logo emoji a player can choose from when launching their
 * own token. A fixed, on-theme "degen" set — controlled and readable,
 * with no keyboard fuss. 24 entries, laid out as a 6-wide grid.
 */
export const LAUNCH_EMOJIS: readonly string[] = [
  '🚀',
  '🌙',
  '🐶',
  '🐸',
  '💎',
  '🔥',
  '💰',
  '🦍',
  '🐱',
  '🦄',
  '⚡',
  '🌈',
  '👑',
  '🍀',
  '🎰',
  '💀',
  '🤡',
  '🛸',
  '🪙',
  '📈',
  '🐂',
  '🐻',
  '🧠',
  '✨',
];

/**
 * The "about" blurb shown on a player-created token's detail screen,
 * in the same satirical voice as the token catalogue. Generic — it is
 * the same for every player token, because the joke is that there is
 * nothing more to say.
 */
export const PLAYER_TOKEN_ABOUT =
  'Your coin. You picked the emoji, you picked the name, and that is ' +
  'the entire whitepaper — which, around here, is one page more than ' +
  'most. Its price is whatever your followers believe it is worth: ' +
  'pump it and they pile in, dump it and they remember. No utility, ' +
  'no roadmap — just a chart with your name on it.';
