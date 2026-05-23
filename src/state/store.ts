/**
 * store.ts — the central game store (Zustand).
 * ------------------------------------------------------------------
 * The single place all live game state lives. The engine updates it
 * through actions; screens read from it with selectors. See CLAUDE.md
 * §5.
 *
 * Holds the clock, core stats, the market, the player's holdings, the
 * player's own launched tokens, and which app is open.
 */
import { create } from 'zustand';
import {
  createClock,
  dayNumber,
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
  type SimParams,
} from '../engine/market';
import {
  MAX_PLAYER_TOKENS,
  STARTING_BILLS,
  accrueMissedInstallments,
  applyBillPayment,
  applyInstallment,
  applySwipe,
  billTotalDue,
  createBank,
  createCashSwipe,
  createLoan,
  createPlayerToken,
  findBillDefinition,
  findLoanTier,
  followersFromDump,
  followersFromPump,
  nextInstallmentCost,
  playerTokenParams,
  quoteBuy,
  quoteSell,
  tokenLaunchCost,
  type BankState,
  type CashSwipeState,
  type PlayerTokenDef,
} from '../engine/economy';
import { TOKEN_BY_ID } from '../data/tokens';
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

/** Identity of a launched player token. */
export type { PlayerTokenDef };

/** What `launchToken` needs to mint a token. */
export interface LaunchTokenInput {
  id: string;
  name: string;
  emoji: string;
  gradient: readonly [string, string];
}

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
  holdings: Record<string, number>;
  playerTokens: PlayerTokenDef[];
  bank: BankState;
  cashSwipe: CashSwipeState;
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
  /** Tokens the player has launched (at most MAX_PLAYER_TOKENS). */
  playerTokens: PlayerTokenDef[];
  /** Bills and loans — the Bank app's persistent state. */
  bank: BankState;
  /** Daily swipe cap state for the CashSwipe minigame. */
  cashSwipe: CashSwipeState;
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
  /** Launch a player-created token; no-op if the rules forbid it. */
  launchToken: (input: LaunchTokenInput) => void;
  /** Pay a bill in full (face amount + any accrued late fee). */
  payBill: (billId: string, now: number) => void;
  /** Take out a new loan; no-op if one is already active. */
  takeLoan: (tierId: string, now: number) => void;
  /** Pay one weekly installment on the active loan. */
  repayLoanInstallment: (now: number) => void;
  /** Spend one CashSwipe swipe; credits $1 when below the daily cap. */
  swipeOnce: (now: number) => void;
  /** Open an in-game app. */
  openApp: (id: AppId) => void;
  /** Return to the home screen. */
  closeApp: () => void;
}

/** The fresh-game state slice (everything except the actions). */
function freshGame(now: number): Pick<
  GameState,
  | 'clock'
  | 'cash'
  | 'followers'
  | 'handle'
  | 'market'
  | 'holdings'
  | 'playerTokens'
  | 'bank'
  | 'cashSwipe'
  | 'openAppId'
> {
  return {
    clock: createClock(now),
    cash: STARTING_CASH,
    followers: 0,
    handle: DEFAULT_HANDLE,
    market: createMarket(createRandom(now)),
    holdings: {},
    playerTokens: [],
    bank: createBank(now),
    cashSwipe: createCashSwipe(now),
    openAppId: null,
  };
}

/** Whole market ticks elapsed across an offline gap, capped. */
function catchUpTicks(elapsedMs: number): number {
  return Math.min(Math.floor(elapsedMs / MARKET_TICK_MS), MARKET_CATCHUP_CAP);
}

/**
 * A sim-params lookup that knows the player's own tokens — their
 * volatility scales with the player's followers (Design Bible §9).
 */
function paramsFor(
  playerTokens: PlayerTokenDef[],
  followers: number,
): (id: string) => SimParams {
  const owned = new Set(playerTokens.map((t) => t.id));
  return (id) =>
    owned.has(id) ? playerTokenParams(followers) : TOKEN_BY_ID[id];
}

export const useGameStore = create<GameState>()((set) => ({
  ...freshGame(Date.now()),

  newGame: (now) => set(freshGame(now)),
  tick: (now) => set((s) => ({ clock: tickClock(s.clock, now) })),
  tickMarket: () =>
    set((s) => ({
      market: tickMarketEngine(
        s.market,
        marketRand,
        paramsFor(s.playerTokens, s.followers),
      ),
    })),
  resume: (now) =>
    set((s) => {
      const resumed = resumeClock(s.clock, now);
      const loan = s.bank.loan
        ? accrueMissedInstallments(s.bank.loan, resumed.clock.now)
        : null;
      return {
        clock: resumed.clock,
        market: advanceMarket(
          s.market,
          catchUpTicks(resumed.elapsedMs),
          marketRand,
          paramsFor(s.playerTokens, s.followers),
        ),
        bank: loan === s.bank.loan ? s.bank : { bills: s.bank.bills, loan },
      };
    }),
  loadSaved: (saved, now) =>
    set(() => {
      const resumed = resumeClock(saved.clock, now);
      const loan = saved.bank.loan
        ? accrueMissedInstallments(saved.bank.loan, resumed.clock.now)
        : null;
      return {
        clock: resumed.clock,
        cash: saved.cash,
        followers: saved.followers,
        handle: saved.handle,
        market: advanceMarket(
          saved.market,
          catchUpTicks(resumed.elapsedMs),
          marketRand,
          paramsFor(saved.playerTokens, saved.followers),
        ),
        holdings: saved.holdings,
        playerTokens: saved.playerTokens,
        bank: { bills: saved.bank.bills, loan },
        cashSwipe: saved.cashSwipe,
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
      const isOwnToken = s.playerTokens.some((t) => t.id === tokenId);
      return {
        cash: s.cash - usd,
        holdings: {
          ...s.holdings,
          [tokenId]: (s.holdings[tokenId] ?? 0) + quote.tokenAmount,
        },
        // Pumping your own token earns followers (Design Bible §9).
        ...(isOwnToken
          ? { followers: s.followers + followersFromPump(s.followers) }
          : {}),
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
      const isOwnToken = s.playerTokens.some((t) => t.id === tokenId);
      return {
        cash: s.cash + quote.usd,
        holdings,
        // Dumping your own token costs you followers (Design Bible §9).
        ...(isOwnToken
          ? {
              followers: Math.max(
                0,
                s.followers - followersFromDump(s.followers),
              ),
            }
          : {}),
      };
    }),
  launchToken: (input) =>
    set((s) => {
      if (s.playerTokens.length >= MAX_PLAYER_TOKENS) {
        return {};
      }
      if (s.market.tokens[input.id]) {
        return {}; // ticker already taken
      }
      const cost = tokenLaunchCost(
        s.playerTokens.length + 1,
        dayNumber(s.clock),
      );
      if (cost > s.cash) {
        return {};
      }
      const { def, state } = createPlayerToken(
        input,
        dayNumber(s.clock),
        marketRand,
      );
      return {
        cash: s.cash - cost,
        playerTokens: [...s.playerTokens, def],
        market: { tokens: { ...s.market.tokens, [def.id]: state } },
      };
    }),
  payBill: (billId, now) =>
    set((s) => {
      const bill = s.bank.bills.find((b) => b.id === billId);
      const def = bill && findBillDefinition(STARTING_BILLS, billId);
      if (!bill || !def) return {};
      const cost = billTotalDue(def, bill, now);
      if (cost > s.cash) return {};
      return {
        cash: s.cash - cost,
        bank: {
          bills: s.bank.bills.map((b) =>
            b.id === billId ? applyBillPayment(b, now) : b,
          ),
          loan: s.bank.loan,
        },
      };
    }),
  takeLoan: (tierId, now) =>
    set((s) => {
      if (s.bank.loan) return {}; // one loan at a time
      const tier = findLoanTier(tierId);
      if (!tier) return {};
      const { loan, cashCredit } = createLoan(tier, now);
      return {
        cash: s.cash + cashCredit,
        bank: { bills: s.bank.bills, loan },
      };
    }),
  repayLoanInstallment: (now) =>
    set((s) => {
      if (!s.bank.loan) return {};
      const cost = nextInstallmentCost(s.bank.loan);
      if (cost > s.cash) return {};
      const nextLoan = applyInstallment(s.bank.loan, now);
      return {
        cash: s.cash - cost,
        bank: { bills: s.bank.bills, loan: nextLoan },
      };
    }),
  swipeOnce: (now) =>
    set((s) => {
      const result = applySwipe(s.cashSwipe, now);
      if (result.earned > 0) {
        return { cash: s.cash + result.earned, cashSwipe: result.state };
      }
      // Capped — only persist the day-refreshed state if it changed.
      if (result.state === s.cashSwipe) return {};
      return { cashSwipe: result.state };
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
    playerTokens: state.playerTokens,
    bank: state.bank,
    cashSwipe: state.cashSwipe,
  };
}
