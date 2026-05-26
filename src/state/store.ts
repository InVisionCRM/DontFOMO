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
  isCheckDue,
  nextInstallmentCost,
  playerTokenParams,
  quoteBuy,
  quoteSell,
  tokenLaunchCost,
  unemploymentAmount,
  type BankState,
  type CashSwipeState,
  type PlayerTokenDef,
} from '../engine/economy';
import {
  appendPortfolioSample,
  computeNetWorth,
} from '../engine/economy/netWorth';
import {
  addMessage,
  deleteMessage,
  markRead,
  type MailMessage,
} from '../engine/mail';
import {
  addTunnelMessage,
  markChatRead,
  type TunnelChat,
  type TunnelMessage,
} from '../engine/tunnel';
import {
  addConversationMessage,
  markConversationRead,
  type Conversation,
  type MessageItem,
} from '../engine/messages';
import {
  applyDailyPost as applyDailyPostEngine,
  createDailyPostState,
  pushTweet as pushTweetEngine,
  type DailyPostState,
  type Tweet,
} from '../engine/clout';
import {
  addOwned,
  findAsset,
  isOwned,
  removeOwned,
  resaleValue,
  type OwnedAsset,
} from '../engine/assets';
import {
  addEntry as addClipboardEntry,
  deleteEntry as deleteClipboardEntryEngine,
  type ClipboardEntry,
} from '../engine/clipboard';
import { phraseToText, pickPhrase } from '../engine/onboarding';
import { TOKEN_BY_ID } from '../data/tokens';
import { createStartingMail } from '../data/mail';
import { createStartingTunnel } from '../data/tunnel';
import { createStartingMessages } from '../data/messages';
import { createStartingClout, DEFAULT_BIO } from '../data/clout';
import { ASSET_CATALOG } from '../data/assets';
import type { AppId } from '../data/apps';

/**
 * Starting cash for a fresh game. Onboarding (Bible §13) does not
 * currently customise this — the player enters the game with this
 * balance once the flow completes.
 */
export const STARTING_CASH = 500;

/**
 * Placeholder handle a fresh game holds until onboarding completes.
 * Real handles are derived from the display name the player enters
 * in the Profile step via `setProfile`.
 */
export const DEFAULT_HANDLE = '@new_player';

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
 * Onboarding state (Bible §13). `hasOnboarded` gates the top-level
 * shell — until it flips true, the player sees the onboarding flow
 * instead of the phone. `pendingSeedPhrase` is the wallet's 12-word
 * phrase generated in the Wallet Intro step and consumed by the
 * Seed and Confirm steps; it is cleared on `finishOnboarding`. The
 * Clipboard Scam (Scam Library v1.1 Event #5) is armed when the
 * player taps "Copy to clipboard" during the Seed step — that copy
 * lives on in `clipboard`, defusable in the Clipboard app.
 */
export interface OnboardingState {
  hasOnboarded: boolean;
  pendingSeedPhrase: readonly string[] | null;
}

/** Build a fresh OnboardingState for a brand-new game. */
export function createOnboardingState(): OnboardingState {
  return { hasOnboarded: false, pendingSeedPhrase: null };
}

/**
 * A top-edge banner notification (Bible §5). Lives transiently in the
 * store so any action can fire one and the global `<Banner />` mount
 * can show it; the component dismisses it after a short visible
 * window. The `id` is unique per post so re-posting the same text
 * still re-animates.
 */
export interface BannerMessage {
  id: number;
  title: string;
  body: string;
}

/** USD formatter used in banner text. Inlined so the store does not depend on UI. */
function fmtUSD(n: number): string {
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Build a fresh BannerMessage with a unique id. */
function bannerOf(title: string, body: string): BannerMessage {
  return { id: Date.now() + Math.random(), title, body };
}

/**
 * The persistent slice of a game — exactly the fields written to disk.
 * Transient UI state (such as which app is open) is not saved.
 */
export interface SavedGame {
  clock: GameClock;
  cash: number;
  followers: number;
  /** Display name from onboarding Profile step. */
  displayName: string;
  handle: string;
  market: MarketState;
  holdings: Record<string, number>;
  playerTokens: PlayerTokenDef[];
  bank: BankState;
  cashSwipe: CashSwipeState;
  /** Highest net worth (cash + crypto) the player has ever reached. */
  peakNetWorth: number;
  /** Recent net-worth samples for the home Portfolio sparkline. */
  portfolioHistory: number[];
  /** Last time an unemployment check was credited (epoch ms). */
  lastUnemploymentCheckAt: number;
  /** The Mail inbox — newest first. */
  mail: MailMessage[];
  /** Tunnel chats — newest activity first. */
  tunnel: TunnelChat[];
  /** Messages conversations — real friends, newest first. */
  messages: Conversation[];
  /** The player's Clout bio — shown on the profile header. */
  bio: string;
  /** The Clout feed — capped to the first N for the home view. */
  cloutFeed: Tweet[];
  /** Daily Post streak state. */
  dailyPost: DailyPostState;
  /** Diamond balance — the skill-tree premium currency (Bible §12). */
  diamonds: number;
  /** Market assets the player currently owns. */
  assets: OwnedAsset[];
  /** Clipboard history — newest first. Where the Clipboard Scam arms. */
  clipboard: ClipboardEntry[];
  /** Onboarding gate + transient seed-phrase slot. */
  onboarding: OnboardingState;
}

export interface GameState {
  /** The game clock. */
  clock: GameClock;
  /** Cash on hand, in dollars. */
  cash: number;
  /** Clout (X) follower count — the master reputation stat. */
  followers: number;
  /** Display name shown in Clout, Wallet, Settings. */
  displayName: string;
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
  /** Lifetime peak net worth — the anchor for the unemployment check. */
  peakNetWorth: number;
  /** Recent net-worth samples (oldest first) for the home widget chart. */
  portfolioHistory: number[];
  /** Last time an unemployment check was credited (epoch ms). */
  lastUnemploymentCheckAt: number;
  /** The Mail inbox — newest first. */
  mail: MailMessage[];
  /** Tunnel chats — newest activity first. */
  tunnel: TunnelChat[];
  /** Messages conversations — real friends, newest first. */
  messages: Conversation[];
  /** The player's Clout bio — shown on the profile header. */
  bio: string;
  /** The Clout feed — newest first. */
  cloutFeed: Tweet[];
  /** Daily Post streak state. */
  dailyPost: DailyPostState;
  /** Diamond balance — Bible §12's premium currency. */
  diamonds: number;
  /** Market assets the player currently owns. */
  assets: OwnedAsset[];
  /** Clipboard history — where the Clipboard Scam arms (Bible §11). */
  clipboard: ClipboardEntry[];
  /** Onboarding gate + transient seed-phrase slot (Bible §13). */
  onboarding: OnboardingState;
  /** The top-edge banner currently being shown; null = none. */
  banner: BannerMessage | null;
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
  /**
   * Dev affordance — reset today's CashSwipe counter to zero so a
   * tester can keep swiping after hitting the cap. Wired through a
   * `__DEV__`-gated button on the EmptyCap state; the production
   * build never exposes this path.
   */
  resetCashSwipeToday: (now: number) => void;
  /** Open a mail message — flips its unread state to read. */
  openMailMessage: (id: string) => void;
  /** Delete a mail message by id. */
  deleteMailMessage: (id: string) => void;
  /** Push a new mail message into the inbox (newest first). */
  pushMailMessage: (msg: MailMessage) => void;
  /** Open a Tunnel chat — zeroes its unread count. */
  openTunnelChat: (chatId: string) => void;
  /** Push a new message into a Tunnel chat. */
  pushTunnelMessage: (chatId: string, msg: TunnelMessage) => void;
  /** Open a Messages conversation — zeroes its unread count. */
  openConversation: (convId: string) => void;
  /** Push a new item into a Messages conversation. */
  pushConversationMessage: (convId: string, msg: MessageItem) => void;
  /**
   * Fire the daily Clout post. Awards followers + (possibly) a
   * Diamond per Bible §6's streak rules. No-op if the player has
   * already posted today.
   */
  postDailyClout: (now: number) => void;
  /** Push a new tweet onto the Clout feed (newest first). */
  pushTweet: (tweet: Tweet) => void;
  /**
   * Buy a Market asset by id. Charges its `price` from cash and
   * applies its `followersBoost`. No-op if cash is short, the asset
   * id is unknown, or the player already owns it.
   */
  buyAsset: (id: string, now: number) => void;
  /**
   * Sell a Market asset by id. Credits `resaleValue` to cash and
   * removes the asset's follower boost (floored at 0).
   */
  sellAsset: (id: string, now: number) => void;
  /** Show a top-edge banner notification. */
  postBanner: (title: string, body: string) => void;
  /** Clear the current banner if its id matches. */
  dismissBanner: (id: number) => void;
  /** Open an in-game app. */
  openApp: (id: AppId) => void;
  /** Return to the home screen. */
  closeApp: () => void;
  /**
   * Onboarding — Profile step. Sets the player's display name (used
   * to derive the handle) and bio. Trims and slugifies; no-op on an
   * empty name.
   */
  setProfile: (displayName: string, bio: string) => void;
  /**
   * Onboarding — Wallet Intro step. Generates a fresh 12-word seed
   * phrase using the given seed (defaults to `Date.now()`) and parks
   * it on the transient onboarding slice. Re-callable.
   */
  generateWallet: (seed?: number) => void;
  /**
   * Onboarding — Seed step. Adds the pending seed phrase to the
   * Clipboard as a SENSITIVE entry. No-op if no phrase is pending.
   * This is the arming action for the Clipboard Scam (Bible §11).
   */
  copySeedToClipboard: (now: number) => void;
  /** Delete one entry from the Clipboard — the player's defuse path. */
  deleteClipboardEntry: (id: string) => void;
  /**
   * Onboarding — Done step. Flips `hasOnboarded` and clears the
   * pending phrase. The phone shell takes over after this fires.
   */
  finishOnboarding: () => void;
}

/** The fresh-game state slice (everything except the actions). */
function freshGame(now: number): Pick<
  GameState,
  | 'clock'
  | 'cash'
  | 'followers'
  | 'displayName'
  | 'handle'
  | 'market'
  | 'holdings'
  | 'playerTokens'
  | 'bank'
  | 'cashSwipe'
  | 'peakNetWorth'
  | 'portfolioHistory'
  | 'lastUnemploymentCheckAt'
  | 'mail'
  | 'tunnel'
  | 'messages'
  | 'bio'
  | 'cloutFeed'
  | 'dailyPost'
  | 'diamonds'
  | 'assets'
  | 'clipboard'
  | 'onboarding'
  | 'banner'
  | 'openAppId'
> {
  return {
    clock: createClock(now),
    cash: STARTING_CASH,
    followers: 0,
    displayName: '',
    handle: DEFAULT_HANDLE,
    market: createMarket(createRandom(now)),
    holdings: {},
    playerTokens: [],
    bank: createBank(now),
    cashSwipe: createCashSwipe(now),
    peakNetWorth: STARTING_CASH,
    portfolioHistory: [STARTING_CASH],
    // Anchor at game start — the first check fires the next Thursday 8pm Eastern.
    lastUnemploymentCheckAt: now,
    mail: createStartingMail(now),
    tunnel: createStartingTunnel(now),
    messages: createStartingMessages(now),
    bio: DEFAULT_BIO,
    cloutFeed: createStartingClout(now),
    dailyPost: createDailyPostState(),
    diamonds: 0,
    assets: [],
    clipboard: [],
    onboarding: createOnboardingState(),
    banner: null,
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
  tick: (now) =>
    set((s) => {
      const clock = tickClock(s.clock, now);
      const netWorth = computeNetWorth(
        s.cash,
        s.holdings,
        s.market,
        s.assets ?? [],
      );
      const peakNetWorth = Math.max(s.peakNetWorth, netWorth);
      if (isCheckDue(s.lastUnemploymentCheckAt, now)) {
        const amount = unemploymentAmount(peakNetWorth);
        return {
          clock,
          peakNetWorth,
          cash: s.cash + amount,
          lastUnemploymentCheckAt: now,
          banner: bannerOf(
            'Unemployment',
            `Your check for ${fmtUSD(amount)} arrived.`,
          ),
        };
      }
      return { clock, peakNetWorth };
    }),
  tickMarket: () =>
    set((s) => {
      const market = tickMarketEngine(
        s.market,
        marketRand,
        paramsFor(s.playerTokens, s.followers),
      );
      const netWorth = computeNetWorth(
        s.cash,
        s.holdings,
        market,
        s.assets ?? [],
      );
      return {
        market,
        portfolioHistory: appendPortfolioSample(
          s.portfolioHistory ?? [STARTING_CASH],
          netWorth,
        ),
      };
    }),
  resume: (now) =>
    set((s) => {
      const resumed = resumeClock(s.clock, now);
      const loan = s.bank.loan
        ? accrueMissedInstallments(s.bank.loan, resumed.clock.now)
        : null;
      const market = advanceMarket(
        s.market,
        catchUpTicks(resumed.elapsedMs),
        marketRand,
        paramsFor(s.playerTokens, s.followers),
      );
      const netWorth = computeNetWorth(
        s.cash,
        s.holdings,
        market,
        s.assets ?? [],
      );
      const peakNetWorth = Math.max(s.peakNetWorth, netWorth);
      const due = isCheckDue(s.lastUnemploymentCheckAt, now);
      const amount = due ? unemploymentAmount(peakNetWorth) : 0;
      return {
        clock: resumed.clock,
        market,
        bank: loan === s.bank.loan ? s.bank : { bills: s.bank.bills, loan },
        peakNetWorth,
        ...(due
          ? {
              cash: s.cash + amount,
              lastUnemploymentCheckAt: now,
              banner: bannerOf(
                'Unemployment',
                `Your check for ${fmtUSD(amount)} arrived.`,
              ),
            }
          : {}),
      };
    }),
  loadSaved: (saved, now) =>
    set(() => {
      // Normalize the loaded shape — any field missing because of a
      // partial save (e.g. one persisted from a stale hot-reload
      // state pre-schema-bump) gets a sensible default so we never
      // re-poison the store. Proper migrations are Stage 7.
      const holdings = saved.holdings ?? {};
      const playerTokens = saved.playerTokens ?? [];
      const bank = saved.bank ?? createBank(now);
      const cashSwipe = saved.cashSwipe ?? createCashSwipe(now);
      const seededPeakNetWorth = saved.peakNetWorth ?? STARTING_CASH;
      const seededLastCheckAt = saved.lastUnemploymentCheckAt ?? now;
      const seededMail = saved.mail ?? createStartingMail(now);
      const seededTunnel = saved.tunnel ?? createStartingTunnel(now);
      const seededMessages = saved.messages ?? createStartingMessages(now);
      const seededBio = saved.bio ?? DEFAULT_BIO;
      const seededCloutFeed = saved.cloutFeed ?? createStartingClout(now);
      const seededDailyPost = saved.dailyPost ?? createDailyPostState();
      const seededDiamonds = saved.diamonds ?? 0;
      const seededAssets = saved.assets ?? [];
      const seededClipboard = saved.clipboard ?? [];
      // Pre-v13 saves predate onboarding — those players already
      // played, so default to `hasOnboarded: true` to skip the flow.
      const seededOnboarding =
        saved.onboarding ?? { hasOnboarded: true, pendingSeedPhrase: null };

      const resumed = resumeClock(saved.clock, now);
      const loan = bank.loan
        ? accrueMissedInstallments(bank.loan, resumed.clock.now)
        : null;
      const market = advanceMarket(
        saved.market,
        catchUpTicks(resumed.elapsedMs),
        marketRand,
        paramsFor(playerTokens, saved.followers),
      );
      const netWorth = computeNetWorth(
        saved.cash,
        holdings,
        market,
        saved.assets ?? [],
      );
      const peakNetWorth = Math.max(seededPeakNetWorth, netWorth);
      const due = isCheckDue(seededLastCheckAt, now);
      const amount = due ? unemploymentAmount(peakNetWorth) : 0;
      return {
        clock: resumed.clock,
        cash: saved.cash + amount,
        followers: saved.followers,
        displayName: saved.displayName ?? '',
        handle: saved.handle,
        market,
        holdings,
        playerTokens,
        bank: { bills: bank.bills, loan },
        cashSwipe,
        peakNetWorth,
        portfolioHistory:
          saved.portfolioHistory ??
          appendPortfolioSample([STARTING_CASH], netWorth),
        lastUnemploymentCheckAt: due ? now : seededLastCheckAt,
        mail: seededMail,
        tunnel: seededTunnel,
        messages: seededMessages,
        bio: seededBio,
        cloutFeed: seededCloutFeed,
        dailyPost: seededDailyPost,
        diamonds: seededDiamonds,
        assets: seededAssets,
        clipboard: seededClipboard,
        onboarding: seededOnboarding,
        banner: due
          ? bannerOf(
              'Unemployment',
              `Your check for ${fmtUSD(amount)} arrived.`,
            )
          : null,
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
        banner: bannerOf('Bank', `Paid ${def.name} ${fmtUSD(cost)}`),
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
        banner: bannerOf(
          'Bank',
          `Borrowed ${fmtUSD(cashCredit)} — funds added to cash`,
        ),
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
        banner: bannerOf('Bank', `Repaid ${fmtUSD(cost)} toward your loan`),
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
  resetCashSwipeToday: (now) =>
    set(() => ({ cashSwipe: createCashSwipe(now) })),
  openMailMessage: (id) =>
    set((s) => ({ mail: markRead(s.mail ?? [], id) })),
  deleteMailMessage: (id) =>
    set((s) => ({ mail: deleteMessage(s.mail ?? [], id) })),
  pushMailMessage: (msg) =>
    set((s) => ({ mail: addMessage(s.mail ?? [], msg) })),
  openTunnelChat: (chatId) =>
    set((s) => ({ tunnel: markChatRead(s.tunnel ?? [], chatId) })),
  pushTunnelMessage: (chatId, msg) =>
    set((s) => ({ tunnel: addTunnelMessage(s.tunnel ?? [], chatId, msg) })),
  openConversation: (convId) =>
    set((s) => ({ messages: markConversationRead(s.messages ?? [], convId) })),
  pushConversationMessage: (convId, msg) =>
    set((s) => ({
      messages: addConversationMessage(s.messages ?? [], convId, msg),
    })),
  postDailyClout: (now) =>
    set((s) => {
      const dailyPost = s.dailyPost ?? createDailyPostState();
      const result = applyDailyPostEngine(dailyPost, now);
      if (
        result.followersEarned === 0 &&
        result.diamondsEarned === 0 &&
        result.state === dailyPost
      ) {
        return {}; // already posted today — no-op
      }
      const followers = Math.max(
        0,
        (s.followers ?? 0) + result.followersEarned,
      );
      const diamonds = (s.diamonds ?? 0) + result.diamondsEarned;
      // Build the confirmation banner copy.
      const sign = result.followersEarned >= 0 ? '+' : '';
      const followerLine = `${sign}${result.followersEarned} followers`;
      const body = result.streakBroken
        ? `Streak broken — back to day 1. ${followerLine}.`
        : result.diamondsEarned > 0
          ? `Day ${result.state.currentStreakDays}. ${followerLine}, +${result.diamondsEarned} diamond.`
          : `Day ${result.state.currentStreakDays}. ${followerLine}.`;
      return {
        dailyPost: result.state,
        followers,
        diamonds,
        banner: bannerOf('Clout', body),
      };
    }),
  pushTweet: (tweet) =>
    set((s) => ({ cloutFeed: pushTweetEngine(s.cloutFeed ?? [], tweet) })),
  buyAsset: (id, now) =>
    set((s) => {
      const def = findAsset(ASSET_CATALOG, id);
      if (!def) return {};
      const owned = s.assets ?? [];
      if (isOwned(owned, id)) return {};
      if (def.price > (s.cash ?? 0)) return {};
      return {
        cash: s.cash - def.price,
        assets: addOwned(owned, id, now),
        followers: (s.followers ?? 0) + def.followersBoost,
        banner: bannerOf(
          'Market',
          `Bought ${def.name} for ${fmtUSD(def.price)} (+${def.followersBoost.toLocaleString('en-US')} followers).`,
        ),
      };
    }),
  sellAsset: (id, _now) =>
    set((s) => {
      const def = findAsset(ASSET_CATALOG, id);
      if (!def) return {};
      const owned = s.assets ?? [];
      if (!isOwned(owned, id)) return {};
      const proceeds = resaleValue(def);
      const followers = Math.max(
        0,
        (s.followers ?? 0) - def.followersBoost,
      );
      return {
        cash: (s.cash ?? 0) + proceeds,
        assets: removeOwned(owned, id),
        followers,
        banner: bannerOf(
          'Market',
          `Sold ${def.name} for ${fmtUSD(proceeds)} (-${def.followersBoost.toLocaleString('en-US')} followers).`,
        ),
      };
    }),
  postBanner: (title, body) => set({ banner: bannerOf(title, body) }),
  dismissBanner: (id) =>
    set((s) => (s.banner?.id === id ? { banner: null } : {})),
  openApp: (id) => set({ openAppId: id }),
  closeApp: () => set({ openAppId: null }),
  setProfile: (displayName, bio) =>
    set((s) => {
      const trimmedName = displayName.trim();
      if (!trimmedName) return {}; // a profile requires a name
      const slug = trimmedName.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const handle = slug.length > 0 ? `@${slug}` : s.handle;
      return { displayName: trimmedName, handle, bio: bio.trim() };
    }),
  generateWallet: (seed) =>
    set((s) => ({
      onboarding: {
        hasOnboarded: s.onboarding?.hasOnboarded ?? false,
        pendingSeedPhrase: pickPhrase(seed ?? Date.now()),
      },
    })),
  copySeedToClipboard: (now) =>
    set((s) => {
      const phrase = s.onboarding?.pendingSeedPhrase;
      if (!phrase || phrase.length === 0) return {};
      const entry: ClipboardEntry = {
        id: `clip-${now}-${Math.floor(Math.random() * 1e6).toString(36)}`,
        content: phraseToText(phrase),
        copiedAt: now,
        isSensitive: true,
        // The on-screen cue. Names what the entry actually is so a
        // careful player sees the danger at a glance.
        source: 'Recovery phrase',
      };
      return { clipboard: addClipboardEntry(s.clipboard ?? [], entry) };
    }),
  deleteClipboardEntry: (id) =>
    set((s) => ({
      clipboard: deleteClipboardEntryEngine(s.clipboard ?? [], id),
    })),
  finishOnboarding: () =>
    set(() => ({
      onboarding: { hasOnboarded: true, pendingSeedPhrase: null },
    })),
}));

/**
 * Extract the persistent slice of the current game — used by the save
 * system to write the game to disk.
 */
export function serializeGame(state: GameState): SavedGame {
  // Defensive `??` on the optional/nullable slices: if a stale
  // hot-reload left a field undefined, we'd otherwise persist that
  // undefined and poison every future load.
  return {
    clock: state.clock,
    cash: state.cash,
    followers: state.followers,
    displayName: state.displayName ?? '',
    handle: state.handle,
    market: state.market,
    holdings: state.holdings ?? {},
    playerTokens: state.playerTokens ?? [],
    bank: state.bank,
    cashSwipe: state.cashSwipe,
    peakNetWorth: state.peakNetWorth ?? STARTING_CASH,
    portfolioHistory: state.portfolioHistory ?? [STARTING_CASH],
    lastUnemploymentCheckAt: state.lastUnemploymentCheckAt ?? state.clock.now,
    mail: state.mail ?? [],
    tunnel: state.tunnel ?? [],
    messages: state.messages ?? [],
    bio: state.bio ?? DEFAULT_BIO,
    cloutFeed: state.cloutFeed ?? [],
    dailyPost: state.dailyPost ?? createDailyPostState(),
    diamonds: state.diamonds ?? 0,
    assets: state.assets ?? [],
    clipboard: state.clipboard ?? [],
    onboarding: state.onboarding ?? createOnboardingState(),
  };
}
