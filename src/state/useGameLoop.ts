/**
 * useGameLoop.ts — drives the game store from real time.
 * ------------------------------------------------------------------
 * Bridges the headless clock to React: a tick interval keeps the clock
 * current while the app is open, and an AppState listener runs the
 * offline catch-up whenever the app returns to the foreground.
 *
 * Mounted exactly once, at the app root. This is wiring between the
 * engine's sense of time and the device — not a presentational
 * component — which is why the timer lives here and not in a screen.
 */
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useGameStore } from './store';

/** How often the clock ticks while the app is in the foreground (ms). */
const TICK_INTERVAL_MS = 20_000;

export function useGameLoop(): void {
  useEffect(() => {
    const { tick, resume } = useGameStore.getState();

    // Catch up immediately, then keep ticking while in the foreground.
    resume(Date.now());
    const interval = setInterval(() => tick(Date.now()), TICK_INTERVAL_MS);

    // Re-run the offline catch-up every time the app refocuses.
    const onChange = (next: AppStateStatus): void => {
      if (next === 'active') {
        resume(Date.now());
      }
    };
    const subscription = AppState.addEventListener('change', onChange);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
}
