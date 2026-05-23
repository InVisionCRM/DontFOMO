/**
 * useGameLoop.ts — drives the game from real time and persistence.
 * ------------------------------------------------------------------
 * The game's main loop, mounted exactly once at the app root:
 *  - on mount: load any saved game, then catch up to real time;
 *  - while open: tick the clock, and autosave on an interval;
 *  - on focus change: catch up when refocused, save when backgrounded.
 *
 * This is wiring between the engine, the store and the device — not a
 * presentational component — which is why the timers live here.
 */
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { serializeGame, useGameStore, type SavedGame } from './store';
import { SAVE_VERSION, saveAdapter } from '../save';

/** How often the clock ticks while the app is in the foreground (ms). */
const TICK_INTERVAL_MS = 20_000;
/** How often the game autosaves while open (ms). */
const SAVE_INTERVAL_MS = 30_000;

export function useGameLoop(): void {
  useEffect(() => {
    let cancelled = false;

    /** Write the current game to disk; never throws. */
    const save = (): void => {
      saveAdapter
        .save<SavedGame>(serializeGame(useGameStore.getState()))
        .catch((error) => console.warn('[CryptoLife] save failed:', error));
    };

    // Load a saved game (if any), then catch up to real time.
    saveAdapter
      .load<SavedGame>()
      .then((envelope) => {
        if (cancelled) return;
        if (envelope && envelope.version === SAVE_VERSION) {
          useGameStore.getState().loadSaved(envelope.data, Date.now());
          console.log('[CryptoLife] save loaded.');
        } else {
          if (envelope) {
            console.warn(
              `[CryptoLife] unsupported save version ${envelope.version} — starting fresh.`,
            );
          } else {
            console.log('[CryptoLife] no save found — starting a fresh game.');
          }
          useGameStore.getState().resume(Date.now());
        }
        // Ensure a current save exists on disk from here on.
        save();
      })
      .catch((error) => {
        console.warn(
          '[CryptoLife] save load failed — starting fresh:',
          error,
        );
        if (!cancelled) useGameStore.getState().resume(Date.now());
      });

    // Foreground tick + periodic autosave.
    const tickInterval = setInterval(
      () => useGameStore.getState().tick(Date.now()),
      TICK_INTERVAL_MS,
    );
    const saveInterval = setInterval(save, SAVE_INTERVAL_MS);

    // Catch up when refocused; checkpoint + save when backgrounded.
    const onAppStateChange = (next: AppStateStatus): void => {
      useGameStore.getState().resume(Date.now());
      if (next !== 'active') {
        save();
      }
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);

    return () => {
      cancelled = true;
      clearInterval(tickInterval);
      clearInterval(saveInterval);
      subscription.remove();
      save();
    };
  }, []);
}
