/**
 * rugRadar.ts — the Rug Radar minigame engine.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * Rug Radar is the second minigame (Bible §15 — explicitly left open
 * for future minigames). The player is shown a small deck of cards —
 * a token launch, a tweet, a DM, an email, a wallet signature
 * request — and judges each LEGIT or SCAM. Correct calls pay USD
 * (the income-floor rule from Bible §4 — minigames pay USD); a 3-in-
 * a-row streak pays a bonus and a small follower bump (the cleanest
 * expression of Bible §11's vigilance reward); a flawless deck pays
 * a one-shot bonus.
 *
 * Capped at **one deck per local calendar day**, reset at local
 * midnight — the same anchor CashSwipe uses, so the player's notion
 * of "today" is consistent across both minigames. The cards in a
 * deck themselves live in `src/data/rugRadar.ts`; this file owns
 * only the rules.
 *
 * Daily-cap helpers — `localDayKey` and `msUntilLocalMidnight` —
 * already live in `cashSwipe.ts` and are exported from the economy
 * barrel. We import them here for internal use; callers that need
 * them in a UI context import from the economy module directly to
 * keep a single source of truth.
 */
import { localDayKey } from '../economy/cashSwipe';

/** Cards per deck — the daily cap is `DECK_SIZE` cards. */
export const RUG_RADAR_DECK_SIZE = 10;

/** USD bonus paid every time the player completes a 3-card streak. */
export const RUG_RADAR_STREAK_BONUS_USD = 50;

/** Follower bump paid every time the player completes a 3-card streak. */
export const RUG_RADAR_STREAK_BONUS_FOLLOWERS = 5;

/** USD bonus paid when every card in a deck is judged correctly. */
export const RUG_RADAR_PERFECT_DECK_BONUS_USD = 100;

/**
 * A Rug Radar card. Content shape varies by `type` — the UI picks the
 * right renderer from a discriminated union (`content` typed in the
 * data file). The engine cares only about `id`, `isScam`, and `pay`.
 */
export interface RugRadarCard {
  /** Stable id within the library. */
  id: string;
  /** Surface this card mimics — drives the UI's renderer. */
  type: 'token' | 'tweet' | 'dm' | 'email' | 'perm';
  /** Short label shown on the result screen ("CZ giveaway tweet"). */
  shortLabel: string;
  /** Tag shown on the card chip ("Clout post", "Mail", "New token launch"). */
  tag: string;
  /** True when the correct verdict is SCAM. */
  isScam: boolean;
  /** USD paid for a correct call. */
  pay: number;
  /** 1 (obvious teacher) to 5 (subtle, expert). Display only — tuning is in `pay`. */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Educational tagline shown in the post-judgement banner. */
  reason: string;
  /** Free-form, type-specific payload. UI knows the shape per `type`. */
  content: unknown;
}

/** One entry in the player's results trail for the current session. */
export interface RugRadarResult {
  cardId: string;
  /** What the player said. */
  calledScam: boolean;
  /** Did it match `card.isScam`? */
  correct: boolean;
  /** USD awarded for this card (0 if wrong). Excludes streak/perfect bonuses. */
  payout: number;
}

/**
 * A live, in-progress session. Only one is ever active. Cleared on
 * session completion; persisted so a reload mid-deck does not lose
 * the player's progress.
 */
export interface RugRadarSession {
  /** Epoch ms the session started — the local day's cap is "spent" once a session exists. */
  startedAt: number;
  /** The 10-card deck for this session, in order. */
  deck: readonly RugRadarCard[];
  /** Index of the next card the player will judge (0..deck.length). */
  idx: number;
  /** USD earned so far this session (excludes the perfect-deck bonus). */
  earned: number;
  /** Current consecutive-correct streak (resets on a wrong call). */
  streak: number;
  /** Best streak the player hit during this session. */
  bestStreak: number;
  /** Followers earned so far this session (from streak bonuses). */
  followers: number;
  /** Per-card results, in deck order. */
  results: readonly RugRadarResult[];
}

/**
 * Persistent slice — what gets saved to disk. Lifetime totals + the
 * daily-cap anchor + (optionally) the live session.
 */
export interface RugRadarState {
  /** Local calendar day `decksUsedToday` belongs to. */
  dayKey: string;
  /** Decks the player has started today — caps at 1 in v1. */
  decksUsedToday: number;
  /** Total USD earned across all decks ever. */
  lifetimeEarned: number;
  /** Total cards the player has correctly judged across all decks. */
  lifetimeCorrect: number;
  /** Total cards the player has judged across all decks. */
  lifetimeAnswered: number;
  /** Longest unbroken correct-streak the player has ever hit. */
  lifetimeBestStreak: number;
  /** Live session if the player is mid-deck; null otherwise. */
  session: RugRadarSession | null;
}

/** Build a fresh, blank Rug Radar state for a new game. */
export function createRugRadar(now: number): RugRadarState {
  return {
    dayKey: localDayKey(now),
    decksUsedToday: 0,
    lifetimeEarned: 0,
    lifetimeCorrect: 0,
    lifetimeAnswered: 0,
    lifetimeBestStreak: 0,
    session: null,
  };
}

/**
 * If `now` is in a different local day than the state's `dayKey`,
 * reset the daily counter. Pure — returns the original state when the
 * day has not changed. Any live session is preserved across the
 * boundary so a player mid-deck at midnight can finish it.
 */
export function refreshRugRadarDay(
  state: RugRadarState,
  now: number,
): RugRadarState {
  const today = localDayKey(now);
  if (today === state.dayKey) return state;
  return { ...state, dayKey: today, decksUsedToday: 0 };
}

/** Decks the player can still start today (0 or 1 in v1). */
export function decksRemainingToday(
  state: RugRadarState,
  now: number,
): number {
  const today = refreshRugRadarDay(state, now);
  return Math.max(0, 1 - today.decksUsedToday);
}

/** True when no more decks can be started today AND no session is live. */
export function isDeckCapReached(state: RugRadarState, now: number): boolean {
  const today = refreshRugRadarDay(state, now);
  return today.session === null && today.decksUsedToday >= 1;
}

/** Lifetime accuracy as a 0..1 fraction (0 when no cards have been answered). */
export function lifetimeAccuracy(state: RugRadarState): number {
  if (state.lifetimeAnswered === 0) return 0;
  return state.lifetimeCorrect / state.lifetimeAnswered;
}

/**
 * Start a new session against the supplied deck. No-op (returns the
 * original state unchanged) if the daily cap is already spent or a
 * session is already live — the caller decides what to do in those
 * cases.
 */
export function startSession(
  state: RugRadarState,
  deck: readonly RugRadarCard[],
  now: number,
): RugRadarState {
  const today = refreshRugRadarDay(state, now);
  if (today.session !== null) return today;
  if (today.decksUsedToday >= 1) return today;
  return {
    ...today,
    decksUsedToday: today.decksUsedToday + 1,
    session: {
      startedAt: now,
      deck,
      idx: 0,
      earned: 0,
      streak: 0,
      bestStreak: 0,
      followers: 0,
      results: [],
    },
  };
}

/** Outcome of one judgement — passed back to the store so it can banner. */
export interface JudgeOutcome {
  /** The new state after applying the judgement. */
  state: RugRadarState;
  /** The card the player just judged. */
  card: RugRadarCard;
  /** Did the player call it correctly? */
  correct: boolean;
  /** USD awarded for this card (0 if wrong). Excludes the streak bonus. */
  payout: number;
  /** Followers awarded for this card (only on a completed streak). */
  followersAwarded: number;
  /** True when this judgement just completed a 3-in-a-row streak. */
  streakBonusFired: boolean;
  /** True when this judgement consumed the final card in the deck. */
  deckComplete: boolean;
  /** When `deckComplete`, the end-of-deck summary. Null otherwise. */
  summary: SessionSummary | null;
}

/** End-of-deck summary — surfaced once when the player judges the last card. */
export interface SessionSummary {
  /** USD earned across all cards, plus any streak bonuses, plus the perfect-deck bonus. */
  totalEarned: number;
  /** USD from the perfect-deck bonus alone (0 unless every card was correct). */
  perfectBonus: number;
  /** Followers earned across the session (from streak bonuses). */
  totalFollowers: number;
  /** Cards judged correctly. */
  correctCount: number;
  /** Total cards in the deck. */
  totalCount: number;
  /** Best streak hit during the session. */
  bestStreak: number;
}

/**
 * Apply one judgement to a live session. Returns the new state, plus
 * everything the store needs to banner and credit the player.
 *
 * Throws if no session is live or the deck is already exhausted —
 * those are caller programming errors, not user-input cases.
 */
export function judgeCard(
  state: RugRadarState,
  calledScam: boolean,
): JudgeOutcome {
  const session = state.session;
  if (!session) {
    throw new Error('judgeCard called with no live session');
  }
  if (session.idx >= session.deck.length) {
    throw new Error('judgeCard called on an exhausted deck');
  }
  const card = session.deck[session.idx];
  const correct = calledScam === card.isScam;
  const payout = correct ? card.pay : 0;

  const newStreak = correct ? session.streak + 1 : 0;
  const streakBonusFired = correct && newStreak > 0 && newStreak % 3 === 0;
  const streakBonusUsd = streakBonusFired ? RUG_RADAR_STREAK_BONUS_USD : 0;
  const followersAwarded = streakBonusFired
    ? RUG_RADAR_STREAK_BONUS_FOLLOWERS
    : 0;

  const result: RugRadarResult = {
    cardId: card.id,
    calledScam,
    correct,
    payout,
  };

  const nextIdx = session.idx + 1;
  const nextEarned = session.earned + payout + streakBonusUsd;
  const nextBestStreak = Math.max(session.bestStreak, newStreak);
  const nextFollowers = session.followers + followersAwarded;
  const nextResults = [...session.results, result];
  const deckComplete = nextIdx >= session.deck.length;

  let summary: SessionSummary | null = null;
  let nextSessionField: RugRadarSession | null;
  let lifetimeBump = {
    earnedAdd: payout + streakBonusUsd,
    correctAdd: correct ? 1 : 0,
    answeredAdd: 1,
    bestStreak: Math.max(state.lifetimeBestStreak, newStreak),
  };

  if (deckComplete) {
    const correctCount = nextResults.filter((r) => r.correct).length;
    const isPerfect = correctCount === nextResults.length;
    const perfectBonus = isPerfect ? RUG_RADAR_PERFECT_DECK_BONUS_USD : 0;
    summary = {
      totalEarned: nextEarned + perfectBonus,
      perfectBonus,
      totalFollowers: nextFollowers,
      correctCount,
      totalCount: nextResults.length,
      bestStreak: nextBestStreak,
    };
    lifetimeBump = {
      ...lifetimeBump,
      earnedAdd: lifetimeBump.earnedAdd + perfectBonus,
    };
    // End of deck — drop the session entirely. Lifetime totals carry over.
    nextSessionField = null;
  } else {
    nextSessionField = {
      startedAt: session.startedAt,
      deck: session.deck,
      idx: nextIdx,
      earned: nextEarned,
      streak: newStreak,
      bestStreak: nextBestStreak,
      followers: nextFollowers,
      results: nextResults,
    };
  }

  const nextState: RugRadarState = {
    ...state,
    lifetimeEarned: state.lifetimeEarned + lifetimeBump.earnedAdd,
    lifetimeCorrect: state.lifetimeCorrect + lifetimeBump.correctAdd,
    lifetimeAnswered: state.lifetimeAnswered + lifetimeBump.answeredAdd,
    lifetimeBestStreak: lifetimeBump.bestStreak,
    session: nextSessionField,
  };

  return {
    state: nextState,
    card,
    correct,
    payout,
    followersAwarded,
    streakBonusFired,
    deckComplete,
    summary,
  };
}

/**
 * Abandon a live session without paying out. The deck slot is NOT
 * refunded — once the player has started a session, the day's deck
 * is considered spent. v1 has no UI for abandonment; this exists for
 * tests and a possible future "give up" button.
 */
export function abandonSession(state: RugRadarState): RugRadarState {
  if (!state.session) return state;
  return { ...state, session: null };
}
