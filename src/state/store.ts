/**
 * store.ts — the central game store (Zustand).
 * ------------------------------------------------------------------
 * The single place all live game state lives. The engine updates it
 * through actions; screens read from it with selectors. See CLAUDE.md
 * §5.
 *
 * Holds the clock, core stats, the market, the player's holdings, and
 * which app is open. Later stages add scams and so on.
 */
import { create } from 'zustand';
import {
  createClock,
  resumeClock,
  tickClock,
  type GameClock,
} from '../engine/time/clock';
import {
  MARKET_TICK_MS,
  advanceMarket,
  createMarket,
  createRandom,
  tickMarket as tickMarketEngine,
  type MarketState,
} from '../engine/market';
import { quoteBuy, quoteSell } from '../engine/economy';
import type { AppId } from '../data/apps';

/**
 * Starting cash for a fresh game. PLACEHOLDER — the onboarding flow
 * (a later stage) sets the real starting balance.
 */
export const STARTING_CASH = 500;

/** PLACEHOLDER default handle — onboarding lets the player choose one. */
export const DEFAULT_HANDLE = '@degen_kyle';

/** The most market ticks an offline catch-up will ever simulate. */
const MARKET_CATCHUP_CAP = 600;

/** A holding smaller than this is treated as dust and dropped. */
const DUST = 1e-8;

/**
 * Entropy for ongoing market ticks. Not part of the saved state — the
 * saved prices are what matters; each session continues from them with
 * a fresh generator.
 */
const marketRand = createRandom(Date.now());

/**
 * The persistent slice of a game — exactly the fields written to disk.
 * Transient UI state (such as which app is open) is not saved.
 */
export interface SavedGame {
  clock: GameClock;
  cash: number;
  followers: number;
  handle: string;
  market: MarketState;
  /** Token holdings — ticker → amount owned. */
  holdings: Record<string, number>;
}

export interface GameState {
  /** The game clock. */
  clock: GameClock;
  /** Cash on hand, in dollars. */
  cash: number;
  /** Clout (X) follower count — the master reputation stat. */
  followers: number;
  /** The player's Clout handle. */
  handle: string;
  /** The live crypto market simulation. */
  market: MarketState;
  /** Token holdings — ticker → amount owned. */
  holdings: Record<string, number>;
  /** Which in-game app is open; null = the home screen. */
  openAppId: AppId | null;

  /** Start a brand-new game at time `now` (epoch ms). */
  newGame: (now: number) => void;
  /** Advance the calendar clock to `now` — the regular foreground tick. */
  tick: (now: number) => void;
  /** Advance the market one step — the fast market tick. */
  tickMarket: () => void;
  /** Offline catch-up after the game was away; resumes at `now`. */
  resume: (now: number) => void;
  /** Apply a loaded save, then run the offline catch-up to `now`. */
  loadSaved: (saved: SavedGame, now: number) => void;
  /** Buy a token: spend `usd` of cash on it at the current price. */
  buyToken: (tokenId: string, usd: number) => void;
  /** Sell `tokenAmount` of a token at the current price. */
  sellToken: (tokenId: string, tokenAmount: number) => void;
  /** Open an in-game app. */
  openApp: (id: AppId) => void;
  /** Return to the home screen. */
  closeApp: () => void;
}

/** The fresh-game state slice (everything except the actions). */
function freshGame(now: number): Pick<
  GameState,
  'clock' | 'cash' | 'followers' | 'handle' | 'market' | 'holdings' | 'openAppId'
> {
  return {
    clock: createClock(now),
    cash: STARTING_CASH,
    followers: 0,
    handle: DEFAULT_HANDLE,
    market: createMarket(createRandom(now)),
    holdings: {},
    openAppId: null,
  };
}

/** Whole market ticks elapsed across an offline gap, capped. */
function catchUpTicks(elapsedMs: number): number {
  return Math.min(Math.floor(elapsedMs / MARKET_TICK_MS), MARKET_CATCHUP_CAP);
}

export const useGameStore = create<GameState>()((set) => ({
  ...freshGame(Date.now()),

  newGame: (now) => set(freshGame(now)),
  tick: (now) => set((s) => ({ clock: tickClock(s.clock, now) })),
  tickMarket: () =>
    set((s) => ({ market: tickMarketEngine(s.market, marketRand) })),
  resume: (now) =>
    set((s) => {
      const resumed = resumeClock(s.clock, now);
      return {
        clock: resumed.clock,
        market: advanceMarket(
          s.market,
          catchUpTicks(resumed.elapsedMs),
          marketRand,
        ),
      };
    }),
  loadSaved: (saved, now) =>
    set(() => {
      const resumed = resumeClock(saved.clock, now);
      return {
        clock: resumed.clock,
        cash: saved.cash,
        followers: saved.followers,
        handle: saved.handle,
        market: advanceMarket(
          saved.market,
          catchUpTicks(resumed.elapsedMs),
          marketRand,
        ),
        holdings: saved.holdings,
        openAppId: null,
      };
    }),
  buyToken: (tokenId, usd) =>
    set((s) => {
      const token = s.market.tokens[tokenId];
      if (!token || usd <= 0 || usd > s.cash) {
        return {};
      }
      const quote = quoteBuy(usd, token.price);
      return {
        cash: s.cash - usd,
        holdings: {
          ...s.holdings,
          [tokenId]: (s.holdings[tokenId] ?? 0) + quote.tokenAmount,
        },
      };
    }),
  sellToken: (tokenId, tokenAmount) =>
    set((s) => {
      const token = s.market.tokens[tokenId];
      const owned = s.holdings[tokenId] ?? 0;
      const amount = Math.min(tokenAmount, owned);
      if (!token || amount <= 0) {
        return {};
      }
      const quote = quoteSell(amount, token.price);
      const holdings = { ...s.holdings };
      const remaining = owned - amount;
      if (remaining > DUST) {
        holdings[tokenId] = remaining;
      } else {
        delete holdings[tokenId];
      }
      return { cash: s.cash + quote.usd, holdings };
    }),
  openApp: (id) => set({ openAppId: id }),
  closeApp: () => set({ openAppId: null }),
}));

/**
 * Extract the persistent slice of the current game — used by the save
 * system to write the game to disk.
 */
export function serializeGame(state: GameState): SavedGame {
  return {
    clock: state.clock,
    cash: state.cash,
    followers: state.followers,
    handle: state.handle,
    market: state.market,
    holdings: state.holdings,
  };
}
