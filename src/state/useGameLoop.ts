/**
 * useGameLoop.ts — drives the game from real time and persistence.
 * ------------------------------------------------------------------
 * The game's main loop, mounted exactly once at the app root:
 *  - on mount: load any saved game, then catch up to real time;
 *  - while open: tick the calendar clock, tick the market faster, and
 *    autosave on an interval;
 *  - on focus change: catch up when refocused, save when backgrounded.
 *
 * This is wiring between the engine, the store and the device — not a
 * presentational component — which is why the timers live here.
 */
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { serializeGame, useGameStore, type SavedGame } from './store';
import { isSaveLoadable, migrateEnvelope, saveAdapter } from '../save';
import { MARKET_TICK_MS } from '../engine/market';

/** How often the calendar clock ticks in the foreground (ms). */
const CLOCK_TICK_MS = 20_000;
/** How often the game autosaves while open (ms). */
const SAVE_INTERVAL_MS = 30_000;

export function useGameLoop(): void {
  useEffect(() => {
    let cancelled = false;

    /** Write the current game to disk; never throws. */
    const save = (): void => {
      saveAdapter
        .save<SavedGame>(serializeGame(useGameStore.getState()))
        .catch((error) => console.warn('[DontFOMO] save failed:', error));
    };

    // Load a saved game (if any), then catch up to real time.
    saveAdapter
      .load<SavedGame>()
      .then((envelope) => {
        if (cancelled) return;
        if (envelope && isSaveLoadable(envelope.version)) {
          const migrated = migrateEnvelope(envelope);
          if (migrated.version !== envelope.version) {
            console.log(
              `[DontFOMO] save migrated v${envelope.version} → v${migrated.version}.`,
            );
          }
          useGameStore.getState().loadSaved(migrated.data, Date.now());
          console.log('[DontFOMO] save loaded.');
        } else {
          if (envelope) {
            console.warn(
              `[DontFOMO] unsupported save version ${envelope.version} — starting fresh.`,
            );
          } else {
            console.log('[DontFOMO] no save found — starting a fresh game.');
          }
          useGameStore.getState().resume(Date.now());
        }
        save();
      })
      .catch((error) => {
        console.warn(
          '[DontFOMO] save load failed — starting fresh:',
          error,
        );
        if (!cancelled) useGameStore.getState().resume(Date.now());
      });

    // Foreground tick loops: the calendar clock, the faster market,
    // and the periodic autosave.
    const clockInterval = setInterval(
      () => useGameStore.getState().tick(Date.now()),
      CLOCK_TICK_MS,
    );
    const marketInterval = setInterval(
      () => useGameStore.getState().tickMarket(),
      MARKET_TICK_MS,
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
      clearInterval(clockInterval);
      clearInterval(marketInterval);
      clearInterval(saveInterval);
      subscription.remove();
      save();
    };
  }, []);
}
