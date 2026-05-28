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
  holdingsValue,
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
  addMessage as addMailMessage,
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
  ownedValue,
  removeOwned,
  resaleValue,
  type OwnedAsset,
} from '../engine/assets';
import {
  addEntry as addClipboardEntry,
  deleteEntry as deleteClipboardEntryEngine,
  type ClipboardEntry,
} from '../engine/clipboard';
import {
  RUG_RADAR_STREAK_BONUS_USD,
  createRugRadar,
  judgeCard as judgeRugRadarCardEngine,
  startSession as startRugRadarSessionEngine,
  type RugRadarState,
  type SessionSummary,
} from '../engine/rugRadar';
import { dailyDeck as rugRadarDailyDeck } from '../data/rugRadar';
import { phraseToText, pickPhrase } from '../engine/onboarding';
import {
  createDirectorState,
  deployFrozenWithdrawal,
  resolveScamFromPlayer,
  tickDirector,
  vigilanceRewardFor,
  type DirectorEffect,
  type DirectorGameSnapshot,
  type DirectorState,
} from '../engine/scam-director';
import { findScamTeaching } from '../data/scamTeachings';
import {
  buildAuthorityNoticePair,
  buildRegulatoryHoldNotice,
} from '../data/authorityNotice';
import {
  buildFrozenWithdrawalPair,
  FROZEN_WITHDRAWAL_MIN_USD,
  withdrawalReference,
} from '../data/frozenWithdrawal';
import {
  buildGoldenGiveawayTakeover,
  type GoldenGiveawayTakeover,
} from '../data/goldenGiveaway';
import { TOKEN_BY_ID } from '../data/tokens';
import { createStartingMail } from '../data/mail';
import { createStartingTunnel } from '../data/tunnel';
import { createStartingMessages } from '../data/messages';
import { createStartingClout, DEFAULT_BIO } from '../data/clout';
import { ASSET_CATALOG } from '../data/assets';
import type { AppId } from '../data/apps';
import { saveAdapter } from '../save';
import { DEFAULT_HANDLE, STARTING_CASH } from './constants';
import { normalizeSavedGame } from './saveNormalize';

export { STARTING_CASH, DEFAULT_HANDLE } from './constants';

/** The most market ticks an offline catch-up will ever simulate. */
const MARKET_CATCHUP_CAP = 600;

/** A holding smaller than this is treated as dust and dropped. */
const DUST = 1e-8;

/**
 * Follower reward for defusing the Clipboard Scam (severity: minor).
 * Re-exported for the existing Clipboard-flow tests; new code should
 * call `vigilanceRewardFor(severity)` directly so the reward scales
 * with the catalog entry. See `VIGILANCE_REWARDS` in the engine.
 */
export const VIGILANCE_REWARD_FOLLOWERS = vigilanceRewardFor('minor');

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
 * Optional haptic intensity attached to a banner (Bible §5). The
 * Banner component is the only place that consumes it — keeping the
 * field in the message keeps the store free of any RN/native import.
 *
 * - `success`: confirmed money-moved / completed action.
 * - `warning`: caution-worthy moments.
 * - `error`: hostile events (drains, lockouts, scam detonations).
 *
 * Banners without a haptic level stay silent; the screen update is the
 * confirmation per Bible §5.
 */
export type BannerHaptic = 'success' | 'warning' | 'error';

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
  haptic?: BannerHaptic;
}

/** USD formatter used in banner text. Inlined so the store does not depend on UI. */
function fmtUSD(n: number): string {
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Build a fresh BannerMessage with a unique id. */
function bannerOf(
  title: string,
  body: string,
  haptic?: BannerHaptic,
): BannerMessage {
  const msg: BannerMessage = { id: Date.now() + Math.random(), title, body };
  if (haptic) msg.haptic = haptic;
  return msg;
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
  /** Highest net worth (cash + crypto) the player has ever reached. */
  peakNetWorth: number;
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
  /** Scam Director — live scam instances + lifetime counters. */
  director: DirectorState;
  /** Rug Radar minigame state — daily cap, live session, lifetime totals. */
  rugRadar: RugRadarState;
  /**
   * Live Golden Giveaway takeover, or null when none is in flight.
   * Stage 6.5a. When non-null, the Clout app renders the full-screen
   * takeover over the feed; "Verify @handle" opens the side-by-side
   * compare with the real founder. Mirrors the `bank.regulatoryHold`
   * pattern from 6.4 but lives at the top level because Clout has no
   * dedicated state slice in v1.
   */
  cloutTakeover: GoldenGiveawayTakeover | null;
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
  /** Lifetime peak net worth — the anchor for the unemployment check. */
  peakNetWorth: number;
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
  /** Scam Director state — live instances + lifetime counters. */
  director: DirectorState;
  /** Rug Radar minigame state — daily cap, live session, lifetime totals. */
  rugRadar: RugRadarState;
  /**
   * Live Golden Giveaway takeover, or null when none is in flight
   * (Stage 6.5a). See `SavedGame.cloutTakeover`.
   */
  cloutTakeover: GoldenGiveawayTakeover | null;
  /** The top-edge banner currently being shown; null = none. */
  banner: BannerMessage | null;
  /** Which in-game app is open; null = the home screen. */
  openAppId: AppId | null;
  /**
   * Wall-clock time (epoch ms) the save adapter last wrote a save, or
   * `null` if the game hasn't written one yet this session. Ephemeral —
   * not part of `SavedGame`; rehydrated from the envelope's `savedAt`
   * when a save is loaded. Surfaced in Settings as the "last saved" hint.
   */
  lastSavedAt: number | null;

  /** Start a brand-new game at time `now` (epoch ms). */
  newGame: (now: number) => void;
  /**
   * Wipe on-device progress and return to onboarding. Clears the save
   * file, resets every slice to `freshGame`, then writes the new save.
   */
  resetGame: (now: number) => Promise<void>;
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
  /**
   * Resolve a live proactive scam instance — the player tapped one of
   * the paired action buttons in Mail (Stage 6.4+). The Director
   * applies the outcome's bookkeeping and the store applies the
   * consequence side-effects (drain or reward, lift hold, teaching).
   */
  resolveScamInstance: (
    instanceId: string,
    caught: boolean,
    decision?: 'cancelled',
  ) => void;
  /**
   * Start a bank withdrawal to an external wallet. Amounts at or above
   * `FROZEN_WITHDRAWAL_MIN_USD` may trigger the Frozen Withdrawal scam
   * (6.5b) when pacing permits.
   */
  initiateBankWithdrawal: (
    amount: number,
    destinationWallet: string,
    now: number,
  ) => void;
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
   * Record that the save adapter just wrote (or just loaded) a save at
   * `at` (epoch ms). Sets `lastSavedAt`. Called from `useGameLoop`'s
   * `save()` after a successful write, and on hydrate with the loaded
   * envelope's `savedAt`. Surfaced in Settings.
   */
  markSaved: (at: number) => void;
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
  /**
   * Rug Radar — start today's deck. No-op if the daily cap is spent
   * or a session is already live. The deck is drawn from
   * `dailyDeck(dayKey)` so reload mid-session is stable.
   */
  startRugRadarSession: (now: number) => void;
  /**
   * Rug Radar — judge the current card. `calledScam = true` means the
   * player said it was a scam. Pays out USD / streak bonuses /
   * follower bonuses, and on the final card credits the perfect-
   * deck bonus and posts the end-of-deck banner. Returns the engine's
   * outcome so the screen can drive its card-exit animation and the
   * deck-complete transition without calling the engine itself.
   */
  judgeRugRadarCard: (calledScam: boolean) => RugRadarJudgeOutcome | null;
}

/**
 * What `judgeRugRadarCard` hands back to the screen. Mirrors the
 * engine's `JudgeOutcome` but renamed at the store boundary so the
 * UI doesn't import an engine type directly.
 */
export interface RugRadarJudgeOutcome {
  /** True when the player called the card correctly. */
  correct: boolean;
  /** True when the just-judged card completed the deck. */
  deckComplete: boolean;
  /** The end-of-deck summary, present only on the final card. */
  summary: SessionSummary | null;
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
  | 'peakNetWorth'
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
  | 'director'
  | 'rugRadar'
  | 'cloutTakeover'
  | 'banner'
  | 'openAppId'
  | 'lastSavedAt'
> {
  return {
    clock: createClock(now),
    cash: STARTING_CASH,
    followers: 0,
    handle: DEFAULT_HANDLE,
    market: createMarket(createRandom(now), now),
    holdings: {},
    playerTokens: [],
    bank: createBank(now),
    cashSwipe: createCashSwipe(now),
    peakNetWorth: STARTING_CASH,
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
    director: createDirectorState(now),
    rugRadar: createRugRadar(now),
    cloutTakeover: null,
    banner: null,
    openAppId: null,
    lastSavedAt: null,
  };
}

/**
 * Compute net worth from a slice of state. Cash + crypto holdings +
 * Market-app asset book value (Bible §14). The full formula now;
 * `peakNetWorth` tracks the running max.
 */
function netWorthOf(
  cash: number,
  holdings: Record<string, number>,
  market: MarketState,
  assets: readonly OwnedAsset[],
): number {
  return (
    cash + holdingsValue(holdings, market) + ownedValue(ASSET_CATALOG, assets)
  );
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

/**
 * Apply the Scam Director's effects to a state snapshot, returning
 * a partial update touching only the fields each effect actually
 * mutates. Pure — caller merges the partial into the next state.
 *
 * Each effect maps deliberately:
 *  - `armed`     → silent (Bible §11 — the mistake is invisible at
 *                  the moment of action; only the Clipboard badge
 *                  hints at it).
 *  - `detonated` → drain crypto, clear the sensitive clipboard
 *                  entries (the drainer "consumed" them so the
 *                  Director doesn't immediately rearm), fire a
 *                  danger banner, and push the friend-voice
 *                  fell-for thread into Messages.
 *  - `defused`   → vigilance reward in followers (Bible §11), push
 *                  the friend-voice caught thread into Messages.
 *                  No banner — Bible §5 keeps wins quiet/pull-based.
 */
function applyDirectorEffects(
  state: GameState,
  effects: readonly DirectorEffect[],
  now: number,
): Partial<GameState> {
  if (effects.length === 0) return {};

  let holdings = state.holdings;
  let clipboard = state.clipboard;
  let messages = state.messages;
  let mail = state.mail;
  let followers = state.followers;
  let banner = state.banner;
  let bank = state.bank;
  let cash = state.cash;
  let cloutTakeover = state.cloutTakeover;
  const touched = {
    holdings: false,
    clipboard: false,
    messages: false,
    mail: false,
    followers: false,
    banner: false,
    bank: false,
    cash: false,
    cloutTakeover: false,
  };

  for (const effect of effects) {
    if (effect.type === 'clipboard-scam-detonated') {
      holdings = {};
      touched.holdings = true;
      clipboard = clipboard.filter((e) => !e.isSensitive);
      touched.clipboard = true;
      banner = bannerOf(
        'Wallet drained',
        'Your crypto was scraped from the clipboard. The bank is untouched.',
      );
      touched.banner = true;
      const teaching = findScamTeaching('clipboard-scam');
      if (teaching) {
        for (const line of teaching.fellFor) {
          messages = addConversationMessage(
            messages,
            teaching.contactConversationId,
            {
              id: `${effect.instanceId}-${line.idSuffix}`,
              text: line.text,
              sentAt: now,
            },
          );
        }
        touched.messages = true;
      }
    } else if (effect.type === 'clipboard-scam-defused') {
      followers = followers + VIGILANCE_REWARD_FOLLOWERS;
      touched.followers = true;
      const teaching = findScamTeaching('clipboard-scam');
      if (teaching) {
        for (const line of teaching.caught) {
          messages = addConversationMessage(
            messages,
            teaching.contactConversationId,
            {
              id: `${effect.instanceId}-${line.idSuffix}`,
              text: line.text,
              sentAt: now,
            },
          );
        }
        touched.messages = true;
      }
    } else if (effect.type === 'authority-notice-deployed') {
      // Place the bank hold and push the two paired emails. The Mail
      // app screen routes the action-button tap to `resolveScamInstance`
      // via the `scamResolution` metadata on each MailAction.
      const notice = buildRegulatoryHoldNotice(
        effect.instanceId,
        effect.expiresAt,
      );
      bank = {
        ...bank,
        regulatoryHold: {
          scamId: 'authority-notice',
          instanceId: effect.instanceId,
          caseRef: notice.caseRef,
          expiresAt: notice.expiresAt,
        },
      };
      touched.bank = true;
      const pair = buildAuthorityNoticePair(
        effect.instanceId,
        notice.caseRef,
        now,
      );
      mail = addMailMessage(mail, pair.fake);
      mail = addMailMessage(mail, pair.real);
      touched.mail = true;
      banner = bannerOf(
        'Bank',
        'Regulatory hold placed. Check Mail to resolve.',
      );
      touched.banner = true;
    } else if (effect.type === 'authority-notice-resolved') {
      // Either path (correct / wrong) lifts the hold and removes the
      // two paired emails. Difference is the consequence + teaching.
      if (
        bank.regulatoryHold &&
        bank.regulatoryHold.instanceId === effect.instanceId
      ) {
        bank = { ...bank, regulatoryHold: null };
        touched.bank = true;
      }
      mail = mail.filter(
        (m) =>
          m.id !== `${effect.instanceId}-fake` &&
          m.id !== `${effect.instanceId}-real`,
      );
      touched.mail = true;

      const teaching = findScamTeaching('authority-notice');
      const lines = effect.caught ? teaching?.caught : teaching?.fellFor;
      if (teaching && lines) {
        for (const line of lines) {
          messages = addConversationMessage(
            messages,
            teaching.contactConversationId,
            {
              id: `${effect.instanceId}-${line.idSuffix}`,
              text: line.text,
              sentAt: now,
            },
          );
        }
        touched.messages = true;
      }

      if (effect.caught) {
        followers = followers + vigilanceRewardFor('major');
        touched.followers = true;
        banner = bannerOf(
          'Bank',
          'Hold cleared. The bank confirmed the routine charge.',
        );
        touched.banner = true;
      } else {
        // Drain all bank cash. Crypto + assets untouched (Bible §11
        // "graduated consequences" — Cash Swipe + Rug Radar + the
        // Thursday check guarantee a comeback).
        if (cash > 0) {
          cash = 0;
          touched.cash = true;
        }
        const subtitle =
          effect.reason === 'expired'
            ? "You ignored the hold; your cash was 'settled' to a scammer."
            : 'You wired your cash to a fake compliance settlement wallet.';
        banner = bannerOf('Bank drained', subtitle);
        touched.banner = true;
      }
    } else if (effect.type === 'frozen-withdrawal-deployed') {
      const reference = withdrawalReference(effect.instanceId);
      bank = {
        ...bank,
        pendingWithdrawal: {
          scamId: 'frozen-withdrawal',
          instanceId: effect.instanceId,
          amount: effect.amount,
          destinationWallet: effect.destinationWallet,
          reference,
          holdExpiresAt: effect.expiresAt,
        },
      };
      touched.bank = true;
      const pair = buildFrozenWithdrawalPair(
        effect.instanceId,
        reference,
        effect.amount,
        effect.destinationWallet,
        now,
      );
      mail = addMailMessage(mail, pair.genuine);
      mail = addMailMessage(mail, pair.trap);
      touched.mail = true;
      banner = bannerOf(
        'Bank',
        'Withdrawal on hold. Check Mail — match the sender to your Bank screen.',
      );
      touched.banner = true;
    } else if (effect.type === 'frozen-withdrawal-resolved') {
      const pendingHold =
        bank.pendingWithdrawal?.instanceId === effect.instanceId
          ? bank.pendingWithdrawal
          : null;
      if (pendingHold) {
        bank = { ...bank, pendingWithdrawal: null };
        touched.bank = true;
      }
      mail = mail.filter(
        (m) =>
          m.id !== `${effect.instanceId}-genuine` &&
          m.id !== `${effect.instanceId}-trap`,
      );
      touched.mail = true;

      const teaching = findScamTeaching('frozen-withdrawal');
      const lines =
        effect.outcome === 'paid'
          ? teaching?.fellFor
          : effect.outcome === 'waited'
            ? teaching?.caught
            : undefined;
      if (teaching && lines) {
        for (const line of lines) {
          messages = addConversationMessage(
            messages,
            teaching.contactConversationId,
            {
              id: `${effect.instanceId}-${line.idSuffix}`,
              text: line.text,
              sentAt: now,
            },
          );
        }
        touched.messages = true;
      }

      if (effect.outcome === 'waited') {
        followers = followers + vigilanceRewardFor('major');
        touched.followers = true;
        banner = bannerOf(
          'Bank',
          'Withdrawal released. Funds are on their way to your wallet.',
        );
        touched.banner = true;
      } else if (effect.outcome === 'paid') {
        if (cash > 0) {
          cash = 0;
          touched.cash = true;
        }
        banner = bannerOf(
          'Bank drained',
          'You paid a fake release fee. Your withdrawal never completed.',
        );
        touched.banner = true;
      } else if (effect.outcome === 'cancelled' && pendingHold) {
        cash = cash + pendingHold.amount;
        touched.cash = true;
        banner = bannerOf(
          'Bank',
          'Withdrawal cancelled. Funds returned to your balance.',
        );
        touched.banner = true;
      }
    } else if (effect.type === 'golden-giveaway-deployed') {
      // Pin the takeover snapshot; the Clout screen renders the
      // full-screen overlay while this is non-null. Banner is the
      // single buzz the player gets — the Clout app icon's existing
      // badge model surfaces the rest pull-style (Bible §5).
      cloutTakeover = buildGoldenGiveawayTakeover(
        effect.instanceId,
        effect.expiresAt,
      );
      touched.cloutTakeover = true;
      banner = bannerOf(
        'Clout',
        'A "giveaway" took over Clout. Open Clout to handle it.',
      );
      touched.banner = true;
    } else if (effect.type === 'golden-giveaway-resolved') {
      // Clear the takeover (whichever path got us here) and apply the
      // outcome. The teaching thread always lands so the post-scam
      // teach rule (Bible §11) holds on both outcomes.
      if (
        cloutTakeover &&
        cloutTakeover.instanceId === effect.instanceId
      ) {
        cloutTakeover = null;
        touched.cloutTakeover = true;
      }
      const teaching = findScamTeaching('golden-giveaway');
      const lines = effect.caught ? teaching?.caught : teaching?.fellFor;
      if (teaching && lines) {
        for (const line of lines) {
          messages = addConversationMessage(
            messages,
            teaching.contactConversationId,
            {
              id: `${effect.instanceId}-${line.idSuffix}`,
              text: line.text,
              sentAt: now,
            },
          );
        }
        touched.messages = true;
      }
      if (effect.caught) {
        // Pay the vigilance reward on the `tapped` (Report) path. For
        // `expired` (player let the 3-day window pass without
        // engaging) we still credit caught — that IS the safe path on
        // an Inbound Lure (Bible §11) — but pay no follower bonus.
        // Rewarding inaction at the full minor tier would distort
        // the player-skill model the pacing layer reads from.
        if (effect.reason === 'tapped') {
          followers = followers + vigilanceRewardFor('minor');
          touched.followers = true;
          banner = bannerOf(
            'Clout',
            'Fake account reported. Your wallet stayed safe.',
          );
          touched.banner = true;
        }
        // No banner on `expired` — the takeover quietly de-arms.
      } else {
        // Drain 30% cash + 30% of each crypto holding (Scam Library
        // v1.1 Event 10). Bank balance, Market assets, and the player's
        // launched tokens' supply are untouched — the trap only takes
        // what the player actually sent.
        if (cash > 0) {
          cash = cash * 0.7;
          touched.cash = true;
        }
        let holdingsChanged = false;
        const drained: Record<string, number> = {};
        for (const [ticker, amount] of Object.entries(holdings)) {
          if (amount > 0) {
            const remaining = amount * 0.7;
            if (remaining > DUST) {
              drained[ticker] = remaining;
            }
            holdingsChanged = true;
          } else {
            drained[ticker] = amount;
          }
        }
        if (holdingsChanged) {
          holdings = drained;
          touched.holdings = true;
        }
        banner = bannerOf(
          'Wallet drained',
          "You 'participated' in the fake giveaway. 30% of your cash and crypto is gone.",
        );
        touched.banner = true;
      }
    }
    // `clipboard-scam-armed` is intentionally silent.
  }

  const out: Partial<GameState> = {};
  if (touched.holdings) out.holdings = holdings;
  if (touched.clipboard) out.clipboard = clipboard;
  if (touched.messages) out.messages = messages;
  if (touched.mail) out.mail = mail;
  if (touched.followers) out.followers = followers;
  if (touched.banner) out.banner = banner;
  if (touched.bank) out.bank = bank;
  if (touched.cash) out.cash = cash;
  if (touched.cloutTakeover) out.cloutTakeover = cloutTakeover;
  return out;
}

/**
 * Run one Director tick against the supplied state and fold its
 * effects into a partial update. Skipped entirely while onboarding
 * is in progress — scams cannot fire during setup.
 */
function runDirectorTick(
  state: GameState,
  now: number,
  netWorth: number,
): Partial<GameState> {
  if (!state.onboarding.hasOnboarded) {
    return {};
  }
  const snapshot: DirectorGameSnapshot = {
    followers: state.followers,
    netWorth,
    clipboard: state.clipboard,
  };
  const result = tickDirector(state.director, snapshot, now, marketRand);
  const projected: GameState = { ...state, director: result.state };
  const effectsPartial = applyDirectorEffects(projected, result.effects, now);
  return { director: result.state, ...effectsPartial };
}

export const useGameStore = create<GameState>()((set) => ({
  ...freshGame(Date.now()),

  newGame: (now) => set(freshGame(now)),
  resetGame: async (now) => {
    set(freshGame(now));
    await saveAdapter.clear();
    await saveAdapter.save(serializeGame(useGameStore.getState()));
  },
  tick: (now) =>
    set((s) => {
      const clock = tickClock(s.clock, now);
      const netWorth = netWorthOf(s.cash, s.holdings, s.market, s.assets ?? []);
      const peakNetWorth = Math.max(s.peakNetWorth, netWorth);
      let partial: Partial<GameState> = { clock, peakNetWorth };
      if (isCheckDue(s.lastUnemploymentCheckAt, now)) {
        const amount = unemploymentAmount(peakNetWorth);
        partial = {
          ...partial,
          cash: s.cash + amount,
          lastUnemploymentCheckAt: now,
          banner: bannerOf(
            'Unemployment',
            `Your check for ${fmtUSD(amount)} arrived.`,
          ),
        };
      }
      // Scam Director runs after unemployment so a detonation banner
      // wins over an unemployment banner on the same tick.
      const projected: GameState = { ...s, ...partial };
      const directorPartial = runDirectorTick(projected, now, netWorth);
      return { ...partial, ...directorPartial };
    }),
  tickMarket: () =>
    set((s) => ({
      market: tickMarketEngine(
        s.market,
        marketRand,
        paramsFor(s.playerTokens, s.followers),
        s.clock.now,
      ),
    })),
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
        resumed.clock.now,
      );
      const netWorth = netWorthOf(s.cash, s.holdings, market, s.assets ?? []);
      const peakNetWorth = Math.max(s.peakNetWorth, netWorth);
      const due = isCheckDue(s.lastUnemploymentCheckAt, now);
      const amount = due ? unemploymentAmount(peakNetWorth) : 0;
      let partial: Partial<GameState> = {
        clock: resumed.clock,
        market,
        bank: loan === s.bank.loan ? s.bank : { ...s.bank, loan },
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
      // Run the Director against the post-catch-up snapshot — any
      // scheduled detonation that came due during the offline gap
      // fires here.
      const projected: GameState = { ...s, ...partial };
      const directorPartial = runDirectorTick(projected, now, netWorth);
      return { ...partial, ...directorPartial };
    }),
  loadSaved: (saved, now) =>
    set((s) => {
      const normalized = normalizeSavedGame(saved, now);

      const resumed = resumeClock(normalized.clock, now);
      const loan = normalized.bank.loan
        ? accrueMissedInstallments(normalized.bank.loan, resumed.clock.now)
        : null;
      const market = advanceMarket(
        normalized.market,
        catchUpTicks(resumed.elapsedMs),
        marketRand,
        paramsFor(normalized.playerTokens, normalized.followers),
        resumed.clock.now,
      );
      const netWorth = netWorthOf(
        normalized.cash,
        normalized.holdings,
        market,
        normalized.assets,
      );
      const peakNetWorth = Math.max(normalized.peakNetWorth, netWorth);
      const due = isCheckDue(normalized.lastUnemploymentCheckAt, now);
      const amount = due ? unemploymentAmount(peakNetWorth) : 0;
      const loaded: Partial<GameState> = {
        clock: resumed.clock,
        cash: normalized.cash + amount,
        followers: normalized.followers,
        handle: normalized.handle,
        market,
        holdings: normalized.holdings,
        playerTokens: normalized.playerTokens,
        bank: { ...normalized.bank, loan },
        cashSwipe: normalized.cashSwipe,
        peakNetWorth,
        lastUnemploymentCheckAt: due ? now : normalized.lastUnemploymentCheckAt,
        mail: normalized.mail,
        tunnel: normalized.tunnel,
        messages: normalized.messages,
        bio: normalized.bio,
        cloutFeed: normalized.cloutFeed,
        dailyPost: normalized.dailyPost,
        diamonds: normalized.diamonds,
        assets: normalized.assets,
        clipboard: normalized.clipboard,
        onboarding: normalized.onboarding,
        director: normalized.director,
        rugRadar: normalized.rugRadar,
        cloutTakeover: normalized.cloutTakeover,
        banner: due
          ? bannerOf(
              'Unemployment',
              `Your check for ${fmtUSD(amount)} arrived.`,
            )
          : null,
        openAppId: null,
      };
      // Director tick after offline gap — any detonation that came
      // due while the player was away fires here.
      const projected: GameState = { ...s, ...loaded };
      const directorPartial = runDirectorTick(projected, now, netWorth);
      return { ...loaded, ...directorPartial };
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
        banner: bannerOf('Exchange', `Bought ${tokenId} — spent ${fmtUSD(usd)}`),
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
        banner: bannerOf(
          'Exchange',
          `Sold ${tokenId} — received ${fmtUSD(quote.usd)}`,
        ),
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
        banner: bannerOf(
          'Exchange',
          cost > 0
            ? `Launched $${def.id} — spent ${fmtUSD(cost)}`
            : `Launched $${def.id} — your first is on the house`,
        ),
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
          ...s.bank,
          bills: s.bank.bills.map((b) =>
            b.id === billId ? applyBillPayment(b, now) : b,
          ),
        },
        banner: bannerOf(
          'Bank',
          `Paid ${def.name} ${fmtUSD(cost)}`,
          'success',
        ),
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
        bank: { ...s.bank, loan },
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
        bank: { ...s.bank, loan: nextLoan },
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
    set((s) => ({ mail: addMailMessage(s.mail ?? [], msg) })),
  resolveScamInstance: (instanceId, caught, decision) =>
    set((s) => {
      const now = Date.now();
      const result = resolveScamFromPlayer(
        s.director,
        instanceId,
        { caught, decision },
        now,
      );
      if (result.effects.length === 0) return {};
      const projected: GameState = { ...s, director: result.state };
      const partial = applyDirectorEffects(projected, result.effects, now);
      return { director: result.state, ...partial };
    }),
  initiateBankWithdrawal: (amount, destinationWallet, now) =>
    set((s) => {
      if (!s.onboarding.hasOnboarded) return {};
      const trimmed = destinationWallet.trim();
      if (amount <= 0 || amount > s.cash || trimmed.length < 8) return {};
      if (s.bank.regulatoryHold || s.bank.pendingWithdrawal) return {};

      const cashAfter = s.cash - amount;

      if (amount < FROZEN_WITHDRAWAL_MIN_USD) {
        return {
          cash: cashAfter,
          banner: bannerOf(
            'Bank',
            `Sent ${fmtUSD(amount)} to ${trimmed.slice(0, 10)}…`,
          ),
        };
      }

      const deploy = deployFrozenWithdrawal(
        s.director,
        { amount, destinationWallet: trimmed },
        now,
        marketRand,
      );
      if (deploy.effects.length === 0) {
        return {
          cash: cashAfter,
          banner: bannerOf(
            'Bank',
            `Sent ${fmtUSD(amount)} to ${trimmed.slice(0, 10)}…`,
          ),
        };
      }
      const projected: GameState = {
        ...s,
        cash: cashAfter,
        director: deploy.state,
      };
      const partial = applyDirectorEffects(projected, deploy.effects, now);
      return { cash: cashAfter, director: deploy.state, ...partial };
    }),
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
  markSaved: (at) => set({ lastSavedAt: at }),
  setProfile: (displayName, bio) =>
    set((s) => {
      const trimmedName = displayName.trim();
      if (!trimmedName) return {}; // a profile requires a name
      const slug = trimmedName.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const handle = slug.length > 0 ? `@${slug}` : s.handle;
      return { handle, bio: bio.trim() };
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
  startRugRadarSession: (now) =>
    set((s) => {
      const current = s.rugRadar ?? createRugRadar(now);
      const deck = rugRadarDailyDeck(current.dayKey);
      const next = startRugRadarSessionEngine(current, deck, now);
      if (next === current) return {};
      return { rugRadar: next };
    }),
  judgeRugRadarCard: (calledScam) => {
    // Action returns the engine outcome — see the interface for why.
    // Read once, compute once, then dispatch the resulting partial.
    const s = useGameStore.getState();
    const current = s.rugRadar ?? createRugRadar(s.clock.now);
    if (!current.session) return null;

    const out = judgeRugRadarCardEngine(current, calledScam);
    const followers = Math.max(
      0,
      (s.followers ?? 0) + out.followersAwarded,
    );
    const cashFromCard =
      out.payout + (out.streakBonusFired ? RUG_RADAR_STREAK_BONUS_USD : 0);
    const cashFromPerfect = out.summary?.perfectBonus ?? 0;
    const nextCash = (s.cash ?? 0) + cashFromCard + cashFromPerfect;

    // Bible §5: meaningful actions confirm with a banner. We banner
    // only on deck completion — per-card feedback is the card itself
    // animating away (the screen handles the per-card stamp/state).
    let banner = s.banner;
    if (out.deckComplete && out.summary) {
      const accuracy = Math.round(
        (out.summary.correctCount / out.summary.totalCount) * 100,
      );
      const title =
        out.summary.perfectBonus > 0 ? 'Flawless deck' : 'Deck complete';
      const body =
        `${out.summary.correctCount}/${out.summary.totalCount} (${accuracy}%) · ` +
        `${fmtUSD(out.summary.totalEarned)}` +
        (out.summary.totalFollowers > 0
          ? ` · +${out.summary.totalFollowers} followers`
          : '');
      banner = bannerOf(title, body);
    }

    set({
      rugRadar: out.state,
      cash: nextCash,
      followers,
      banner,
    });

    return {
      correct: out.correct,
      deckComplete: out.deckComplete,
      summary: out.summary,
    };
  },
}));

/**
 * Extract the persistent slice of the current game — used by the save
 * system to write the game to disk.
 */
export function serializeGame(state: GameState): SavedGame {
  const now = state.clock?.now ?? Date.now();
  return normalizeSavedGame(
    {
      clock: state.clock,
      cash: state.cash,
      followers: state.followers,
      handle: state.handle,
      market: state.market,
      holdings: state.holdings,
      playerTokens: state.playerTokens,
      bank: state.bank,
      cashSwipe: state.cashSwipe,
      peakNetWorth: state.peakNetWorth,
      lastUnemploymentCheckAt: state.lastUnemploymentCheckAt,
      mail: state.mail,
      tunnel: state.tunnel,
      messages: state.messages,
      bio: state.bio,
      cloutFeed: state.cloutFeed,
      dailyPost: state.dailyPost,
      diamonds: state.diamonds,
      assets: state.assets,
      clipboard: state.clipboard,
      onboarding: state.onboarding,
      director: state.director,
      rugRadar: state.rugRadar,
      cloutTakeover: state.cloutTakeover,
    },
    now,
  );
}
