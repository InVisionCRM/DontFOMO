/**
 * store.ts — the central game store (Zustand).
 * ------------------------------------------------------------------
 * The single place all live game state lives. The engine updates it
 * through actions; screens read from it with selectors. See CLAUDE.md
 * §5.
 *
 * Checkpoint 2 holds the clock, the core stats, and which app is open.
 * Later stages add the market, the wallet, scams, and so on.
 */
import { create } from 'zustand';
import {
  createClock,
  resumeClock,
  tickClock,
  type GameClock,
} from '../engine/time/clock';
import type { AppId } from '../data/apps';

/**
 * Starting cash for a fresh game. PLACEHOLDER — the onboarding flow
 * (a later stage) sets the real starting balance.
 */
export const STARTING_CASH = 500;

/** PLACEHOLDER default handle — onboarding lets the player choose one. */
export const DEFAULT_HANDLE = '@degen_kyle';

export interface GameState {
  /** The game clock. */
  clock: GameClock;
  /** Cash on hand, in dollars. */
  cash: number;
  /** Clout (X) follower count — the master reputation stat. */
  followers: number;
  /** The player's Clout handle. */
  handle: string;
  /** Which in-game app is open; null = the home screen. */
  openAppId: AppId | null;

  /** Start a brand-new game at time `now` (epoch ms). */
  newGame: (now: number) => void;
  /** Advance the clock to `now` — the regular foreground tick. */
  tick: (now: number) => void;
  /** Offline catch-up after the game was away; resumes at `now`. */
  resume: (now: number) => void;
  /** Open an in-game app. */
  openApp: (id: AppId) => void;
  /** Return to the home screen. */
  closeApp: () => void;
}

/** The fresh-game state slice (everything except the actions). */
function freshGame(now: number): Pick<
  GameState,
  'clock' | 'cash' | 'followers' | 'handle' | 'openAppId'
> {
  return {
    clock: createClock(now),
    cash: STARTING_CASH,
    followers: 0,
    handle: DEFAULT_HANDLE,
    openAppId: null,
  };
}

export const useGameStore = create<GameState>()((set) => ({
  ...freshGame(Date.now()),

  newGame: (now) => set(freshGame(now)),
  tick: (now) => set((s) => ({ clock: tickClock(s.clock, now) })),
  resume: (now) => set((s) => ({ clock: resumeClock(s.clock, now).clock })),
  openApp: (id) => set({ openAppId: id }),
  closeApp: () => set({ openAppId: null }),
}));
