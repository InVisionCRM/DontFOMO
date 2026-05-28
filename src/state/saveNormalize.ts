/**
 * saveNormalize.ts — defensive defaults for the persistent save slice.
 * ------------------------------------------------------------------
 * Every field on `SavedGame` is backstopped here so partial saves (stale
 * hot-reload blobs, pre-migration shapes, autosaves mid-schema-bump)
 * never poison load or disk. Both `loadSaved` and `serializeGame` call
 * `normalizeSavedGame` — single source of truth.
 */
import { createClock, type GameClock } from '../engine/time/clock';
import {
  createMarket,
  createRandom,
  type MarketState,
} from '../engine/market';
import {
  createBank,
  createCashSwipe,
  type BankState,
  type CashSwipeState,
} from '../engine/economy';
import { createDailyPostState, type DailyPostState } from '../engine/clout';
import {
  createDirectorState,
  createPacingState,
  type DirectorState,
} from '../engine/scam-director';
import { createRugRadar, type RugRadarState } from '../engine/rugRadar';
import { createStartingMail } from '../data/mail';
import { createStartingTunnel } from '../data/tunnel';
import { createStartingMessages } from '../data/messages';
import { createStartingClout, DEFAULT_BIO } from '../data/clout';
import type { MailMessage } from '../engine/mail';
import type { TunnelChat } from '../engine/tunnel';
import type { Conversation } from '../engine/messages';
import type { Tweet } from '../engine/clout';
import type { OwnedAsset } from '../engine/assets';
import type { ClipboardEntry } from '../engine/clipboard';
import type { PlayerTokenDef } from '../engine/economy';
import type { GoldenGiveawayTakeover } from '../data/goldenGiveaway';
import { DEFAULT_HANDLE, STARTING_CASH } from './constants';
import type { OnboardingState, SavedGame } from './store';

/**
 * Load/serialize input — top-level keys optional; nested slices may be
 * partial legacy shapes (e.g. bank without hold fields).
 */
export type PartialSavedInput = Omit<
  Partial<SavedGame>,
  'bank' | 'director' | 'cashSwipe' | 'rugRadar' | 'dailyPost' | 'onboarding'
> & {
  bank?: Partial<BankState>;
  director?: Partial<DirectorState>;
  cashSwipe?: Partial<CashSwipeState>;
  rugRadar?: Partial<RugRadarState>;
  dailyPost?: Partial<DailyPostState>;
  onboarding?: Partial<OnboardingState>;
};

function normalizeBank(bank: Partial<BankState> | undefined, now: number): BankState {
  if (!bank) {
    return createBank(now);
  }
  const fresh = createBank(now);
  return {
    bills: bank.bills ?? fresh.bills,
    loan: bank.loan ?? null,
    regulatoryHold: bank.regulatoryHold ?? null,
    pendingWithdrawal: bank.pendingWithdrawal ?? null,
  };
}

function normalizeCashSwipe(
  cashSwipe: Partial<CashSwipeState> | undefined,
  now: number,
): CashSwipeState {
  if (!cashSwipe) {
    return createCashSwipe(now);
  }
  const fresh = createCashSwipe(now);
  return {
    dayKey: cashSwipe.dayKey ?? fresh.dayKey,
    swipesUsed: cashSwipe.swipesUsed ?? 0,
  };
}

function normalizeDailyPost(
  dailyPost: Partial<DailyPostState> | undefined,
): DailyPostState {
  if (!dailyPost) {
    return createDailyPostState();
  }
  const fresh = createDailyPostState();
  return {
    lastPostAt: dailyPost.lastPostAt ?? fresh.lastPostAt,
    currentStreakDays: dailyPost.currentStreakDays ?? 0,
    graceDays: dailyPost.graceDays ?? 0,
  };
}

/**
 * Pre-v13 saves omit `onboarding` entirely — those players already
 * finished the flow, so default to `hasOnboarded: true`.
 */
function normalizeOnboarding(
  onboarding: Partial<OnboardingState> | undefined,
): OnboardingState {
  if (onboarding === undefined) {
    return { hasOnboarded: true, pendingSeedPhrase: null };
  }
  return {
    hasOnboarded: onboarding.hasOnboarded ?? true,
    pendingSeedPhrase: onboarding.pendingSeedPhrase ?? null,
  };
}

function normalizeDirector(
  director: Partial<DirectorState> | undefined,
  now: number,
): DirectorState {
  if (!director) {
    return createDirectorState(now);
  }
  return {
    instances: director.instances ?? [],
    lastTickAt: director.lastTickAt ?? now,
    totalArmed: director.totalArmed ?? 0,
    totalCaught: director.totalCaught ?? 0,
    totalFellFor: director.totalFellFor ?? 0,
    pacing: director.pacing ?? createPacingState(now),
  };
}

function normalizeRugRadar(
  rugRadar: Partial<RugRadarState> | undefined,
  now: number,
): RugRadarState {
  if (!rugRadar) {
    return createRugRadar(now);
  }
  const fresh = createRugRadar(now);
  return {
    dayKey: rugRadar.dayKey ?? fresh.dayKey,
    decksUsedToday: rugRadar.decksUsedToday ?? 0,
    lifetimeEarned: rugRadar.lifetimeEarned ?? 0,
    lifetimeCorrect: rugRadar.lifetimeCorrect ?? 0,
    lifetimeAnswered: rugRadar.lifetimeAnswered ?? 0,
    lifetimeBestStreak: rugRadar.lifetimeBestStreak ?? 0,
    session: rugRadar.session ?? null,
  };
}

/**
 * Coerce a partial or legacy save blob into a complete `SavedGame`.
 * `now` anchors clock/market defaults and director pacing backfills.
 */
export function normalizeSavedGame(
  input: PartialSavedInput,
  now: number,
): SavedGame {
  const clock: GameClock = input.clock ?? createClock(now);
  const market: MarketState =
    input.market ?? createMarket(createRandom(now));

  return {
    clock,
    cash: input.cash ?? STARTING_CASH,
    followers: input.followers ?? 0,
    handle: input.handle ?? DEFAULT_HANDLE,
    market,
    holdings: input.holdings ?? {},
    playerTokens: input.playerTokens ?? [],
    bank: normalizeBank(input.bank, now),
    cashSwipe: normalizeCashSwipe(input.cashSwipe, now),
    peakNetWorth: input.peakNetWorth ?? STARTING_CASH,
    lastUnemploymentCheckAt: input.lastUnemploymentCheckAt ?? now,
    mail: (input.mail ?? createStartingMail(now)) as MailMessage[],
    tunnel: (input.tunnel ?? createStartingTunnel(now)) as TunnelChat[],
    messages: (input.messages ?? createStartingMessages(now)) as Conversation[],
    bio: input.bio ?? DEFAULT_BIO,
    cloutFeed: (input.cloutFeed ?? createStartingClout(now)) as Tweet[],
    dailyPost: normalizeDailyPost(input.dailyPost),
    diamonds: input.diamonds ?? 0,
    assets: (input.assets ?? []) as OwnedAsset[],
    clipboard: (input.clipboard ?? []) as ClipboardEntry[],
    onboarding: normalizeOnboarding(input.onboarding),
    director: normalizeDirector(input.director, now),
    rugRadar: normalizeRugRadar(input.rugRadar, now),
    cloutTakeover: (input.cloutTakeover ?? null) as GoldenGiveawayTakeover | null,
  };
}
