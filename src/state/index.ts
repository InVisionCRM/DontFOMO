/**
 * src/state — the Zustand store.
 * ------------------------------------------------------------------
 * Holds the live game state. The engine writes to it; screens read
 * from it. This is the bridge between the headless engine and the UI.
 *
 * Also the home of "which in-game app is open" — that is GAME STATE,
 * not navigation. Expo Router is only for top-level flows. See
 * CLAUDE.md §5.
 *
 * Empty for now — populated alongside the engine in Stage 2.
 */
export {};
