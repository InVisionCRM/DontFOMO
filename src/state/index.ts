/**
 * src/state — the Zustand store.
 * ------------------------------------------------------------------
 * Holds the live game state. The engine updates it; screens read from
 * it. Also the home of "which in-game app is open" — that is GAME
 * STATE, not navigation. See CLAUDE.md §5.
 */
export { useGameStore, STARTING_CASH, DEFAULT_HANDLE } from './store';
export type { GameState } from './store';
export { useGameLoop } from './useGameLoop';
