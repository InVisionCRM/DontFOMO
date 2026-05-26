/**
 * rugRadar.test.ts — unit tests for the Rug Radar engine.
 * ------------------------------------------------------------------
 * Pure logic, no React Native, no device — ts-jest harness.
 *
 * Day-boundary tests use the same local-time constructor as
 * cashSwipe.test.ts so the day math is timezone-stable across CI
 * and dev hosts.
 */
import { describe, expect, it } from '@jest/globals';
import {
  RUG_RADAR_DECK_SIZE,
  RUG_RADAR_PERFECT_DECK_BONUS_USD,
  RUG_RADAR_STREAK_BONUS_FOLLOWERS,
  RUG_RADAR_STREAK_BONUS_USD,
  abandonSession,
  createRugRadar,
  decksRemainingToday,
  isDeckCapReached,
  judgeCard,
  lifetimeAccuracy,
  refreshRugRadarDay,
  startSession,
  type RugRadarCard,
  type RugRadarState,
} from '../src/engine/rugRadar/rugRadar';

const localTime = (
  y: number,
  m: number,
  d: number,
  h = 0,
  min = 0,
): number => new Date(y, m, d, h, min, 0, 0).getTime();

/** Build a synthetic card for tests. Deterministic, no data-file dependency. */
function card(
  id: string,
  isScam: boolean,
  pay = 50,
): RugRadarCard {
  return {
    id,
    type: 'token',
    shortLabel: id,
    tag: 'Test card',
    isScam,
    pay,
    difficulty: 3,
    reason: `${id} reason`,
    content: null,
  };
}

/** Build an N-card deck of alternating scam/legit cards. */
function deckOf(n: number, pay = 50): readonly RugRadarCard[] {
  return Array.from({ length: n }, (_, i) => card(`c${i}`, i % 2 === 0, pay));
}

/** Run a session against a deck, calling `callFn(i)` for the i-th card. */
function playDeck(
  state: RugRadarState,
  deck: readonly RugRadarCard[],
  now: number,
  callFn: (i: number, card: RugRadarCard) => boolean,
): RugRadarState {
  let s = startSession(state, deck, now);
  for (let i = 0; i < deck.length; i++) {
    const out = judgeCard(s, callFn(i, deck[i]));
    s = out.state;
  }
  return s;
}

describe('createRugRadar', () => {
  it('starts blank with today as the day key', () => {
    const now = localTime(2026, 4, 23, 14, 0);
    const s = createRugRadar(now);
    expect(s.dayKey).toBe('2026-05-23');
    expect(s.decksUsedToday).toBe(0);
    expect(s.lifetimeEarned).toBe(0);
    expect(s.lifetimeCorrect).toBe(0);
    expect(s.lifetimeAnswered).toBe(0);
    expect(s.lifetimeBestStreak).toBe(0);
    expect(s.session).toBeNull();
  });
});

describe('decksRemainingToday', () => {
  it('starts at 1 for a fresh state', () => {
    const now = localTime(2026, 4, 23, 14, 0);
    expect(decksRemainingToday(createRugRadar(now), now)).toBe(1);
  });

  it('drops to 0 after a deck is started', () => {
    const now = localTime(2026, 4, 23, 14, 0);
    const started = startSession(createRugRadar(now), deckOf(3), now);
    expect(decksRemainingToday(started, now)).toBe(0);
  });

  it('refreshes to 1 after local midnight', () => {
    const today = localTime(2026, 4, 23, 14, 0);
    const tomorrow = localTime(2026, 4, 24, 0, 1);
    const started = startSession(createRugRadar(today), deckOf(3), today);
    expect(decksRemainingToday(started, today)).toBe(0);
    expect(decksRemainingToday(started, tomorrow)).toBe(1);
  });
});

describe('refreshRugRadarDay', () => {
  it('returns the same reference when the day has not changed', () => {
    const t1 = localTime(2026, 4, 23, 9, 0);
    const t2 = localTime(2026, 4, 23, 22, 0);
    const s = createRugRadar(t1);
    expect(refreshRugRadarDay(s, t2)).toBe(s);
  });

  it('zeroes the daily counter at midnight', () => {
    const today = localTime(2026, 4, 23, 14, 0);
    const tomorrow = localTime(2026, 4, 24, 0, 1);
    const used = { ...createRugRadar(today), decksUsedToday: 1 };
    const refreshed = refreshRugRadarDay(used, tomorrow);
    expect(refreshed.dayKey).toBe('2026-05-24');
    expect(refreshed.decksUsedToday).toBe(0);
  });

  it('does not clobber the live session at the boundary', () => {
    const today = localTime(2026, 4, 23, 23, 59);
    const tomorrow = localTime(2026, 4, 24, 0, 1);
    const started = startSession(createRugRadar(today), deckOf(3), today);
    const refreshed = refreshRugRadarDay(started, tomorrow);
    expect(refreshed.session).toBe(started.session);
  });
});

describe('isDeckCapReached', () => {
  it('is false on a fresh day', () => {
    const now = localTime(2026, 4, 23, 14, 0);
    expect(isDeckCapReached(createRugRadar(now), now)).toBe(false);
  });

  it('is false while a session is live, even after the daily counter ticked', () => {
    const now = localTime(2026, 4, 23, 14, 0);
    const started = startSession(createRugRadar(now), deckOf(3), now);
    expect(isDeckCapReached(started, now)).toBe(false);
  });

  it('is true once the deck is finished and no session is live', () => {
    const now = localTime(2026, 4, 23, 14, 0);
    const final = playDeck(createRugRadar(now), deckOf(3), now, (i, c) => c.isScam);
    expect(final.session).toBeNull();
    expect(isDeckCapReached(final, now)).toBe(true);
  });
});

describe('startSession', () => {
  it('puts a deck on the state and bumps decksUsedToday', () => {
    const now = localTime(2026, 4, 23, 14, 0);
    const deck = deckOf(3);
    const started = startSession(createRugRadar(now), deck, now);
    expect(started.session).not.toBeNull();
    expect(started.session?.deck).toBe(deck);
    expect(started.session?.idx).toBe(0);
    expect(started.decksUsedToday).toBe(1);
  });

  it('is a no-op when a session is already live', () => {
    const now = localTime(2026, 4, 23, 14, 0);
    const started = startSession(createRugRadar(now), deckOf(3), now);
    const again = startSession(started, deckOf(3), now);
    expect(again).toBe(started);
  });

  it('is a no-op when the daily cap is spent and no session is live', () => {
    const now = localTime(2026, 4, 23, 14, 0);
    const final = playDeck(createRugRadar(now), deckOf(3), now, (i, c) => c.isScam);
    const blocked = startSession(final, deckOf(3), now);
    expect(blocked).toBe(final);
  });

  it('lets the player start again after midnight rolls', () => {
    const today = localTime(2026, 4, 23, 14, 0);
    const tomorrow = localTime(2026, 4, 24, 9, 0);
    const final = playDeck(createRugRadar(today), deckOf(3), today, (i, c) => c.isScam);
    const fresh = startSession(final, deckOf(3), tomorrow);
    expect(fresh.session).not.toBeNull();
    expect(fresh.decksUsedToday).toBe(1);
    expect(fresh.dayKey).toBe('2026-05-24');
  });
});

describe('judgeCard', () => {
  const now = localTime(2026, 4, 23, 14, 0);

  it('pays the card payout on a correct call', () => {
    const started = startSession(createRugRadar(now), deckOf(3, 40), now);
    const out = judgeCard(started, true); // c0 is scam, calling scam = correct
    expect(out.correct).toBe(true);
    expect(out.payout).toBe(40);
    expect(out.state.session?.earned).toBe(40);
    expect(out.state.session?.streak).toBe(1);
  });

  it('pays nothing and breaks the streak on a wrong call', () => {
    const started = startSession(createRugRadar(now), deckOf(3, 40), now);
    const out = judgeCard(started, false); // c0 is scam, calling legit = wrong
    expect(out.correct).toBe(false);
    expect(out.payout).toBe(0);
    expect(out.state.session?.earned).toBe(0);
    expect(out.state.session?.streak).toBe(0);
  });

  it('fires the streak bonus on every 3rd correct in a row', () => {
    const deck = deckOf(6, 40);
    const final = playDeck(createRugRadar(now), deck, now, (i, c) => c.isScam);
    // 6 correct in a row → streak bonuses fire at idx 2 and 5.
    // Because the player went 6/6 the deck is flawless, so the perfect
    // bonus also lands on the final card.
    const expected =
      6 * 40 +
      2 * RUG_RADAR_STREAK_BONUS_USD +
      RUG_RADAR_PERFECT_DECK_BONUS_USD;
    expect(final.lifetimeEarned).toBe(expected);
    expect(final.lifetimeBestStreak).toBe(6);
  });

  it('credits followers only on a streak completion, not on every correct', () => {
    const deck = deckOf(3, 40);
    const s1 = startSession(createRugRadar(now), deck, now);
    const o1 = judgeCard(s1, deck[0].isScam);
    const o2 = judgeCard(o1.state, deck[1].isScam);
    const o3 = judgeCard(o2.state, deck[2].isScam);
    expect(o1.followersAwarded).toBe(0);
    expect(o2.followersAwarded).toBe(0);
    expect(o3.followersAwarded).toBe(RUG_RADAR_STREAK_BONUS_FOLLOWERS);
    expect(o3.streakBonusFired).toBe(true);
  });

  it('pays the perfect-deck bonus on a flawless run', () => {
    const deck = deckOf(RUG_RADAR_DECK_SIZE, 40);
    const final = playDeck(createRugRadar(now), deck, now, (i, c) => c.isScam);
    // 10 base + streak bonuses at idx 2, 5, 8 (three streaks) + perfect bonus.
    const expected =
      RUG_RADAR_DECK_SIZE * 40 +
      3 * RUG_RADAR_STREAK_BONUS_USD +
      RUG_RADAR_PERFECT_DECK_BONUS_USD;
    expect(final.lifetimeEarned).toBe(expected);
  });

  it('does NOT pay the perfect-deck bonus on a near-flawless run', () => {
    const deck = deckOf(RUG_RADAR_DECK_SIZE, 40);
    // Miss the very last card.
    let s = startSession(createRugRadar(now), deck, now);
    for (let i = 0; i < deck.length; i++) {
      const correct = i === deck.length - 1 ? !deck[i].isScam : deck[i].isScam;
      s = judgeCard(s, correct).state;
    }
    // No perfect bonus; the missed card is the very last (idx 9), so the
    // player still completed three streaks during the 9 consecutive
    // correct calls (idx 2, 5, 8). 9 correct * 40 + 3 streak bonuses.
    const expected = 9 * 40 + 3 * RUG_RADAR_STREAK_BONUS_USD;
    expect(s.lifetimeEarned).toBe(expected);
  });

  it('clears the session when the last card is judged', () => {
    const deck = deckOf(3, 40);
    const final = playDeck(createRugRadar(now), deck, now, (i, c) => c.isScam);
    expect(final.session).toBeNull();
  });

  it('returns a non-null summary only on the last card', () => {
    const deck = deckOf(3, 40);
    const s = startSession(createRugRadar(now), deck, now);
    const o1 = judgeCard(s, deck[0].isScam);
    const o2 = judgeCard(o1.state, deck[1].isScam);
    const o3 = judgeCard(o2.state, deck[2].isScam);
    expect(o1.summary).toBeNull();
    expect(o2.summary).toBeNull();
    expect(o3.summary).not.toBeNull();
    expect(o3.summary?.totalCount).toBe(3);
    expect(o3.summary?.correctCount).toBe(3);
  });

  it('throws when called with no live session', () => {
    expect(() => judgeCard(createRugRadar(now), true)).toThrow();
  });

  it('throws when called on an exhausted deck', () => {
    const deck = deckOf(1, 40);
    const s = startSession(createRugRadar(now), deck, now);
    const after = judgeCard(s, deck[0].isScam).state;
    // After 1 card, the session is gone. Synthesise a fake state with an
    // exhausted, non-null session to exercise the second guard.
    const exhausted: RugRadarState = {
      ...after,
      session: {
        startedAt: now,
        deck,
        idx: 1,
        earned: 40,
        streak: 1,
        bestStreak: 1,
        followers: 0,
        results: [
          { cardId: deck[0].id, calledScam: deck[0].isScam, correct: true, payout: 40 },
        ],
      },
    };
    expect(() => judgeCard(exhausted, true)).toThrow();
  });

  it('accumulates lifetime totals across decks', () => {
    const today = localTime(2026, 4, 23, 14, 0);
    const tomorrow = localTime(2026, 4, 24, 9, 0);
    const deckA = deckOf(3, 40);
    const deckB = deckOf(3, 40);
    const after1 = playDeck(createRugRadar(today), deckA, today, (i, c) => c.isScam);
    const after2 = playDeck(after1, deckB, tomorrow, (i, c) => c.isScam);
    expect(after2.lifetimeAnswered).toBe(6);
    expect(after2.lifetimeCorrect).toBe(6);
  });
});

describe('lifetimeAccuracy', () => {
  it('is 0 when no cards have been answered', () => {
    expect(lifetimeAccuracy(createRugRadar(0))).toBe(0);
  });

  it('reports correct/answered', () => {
    const state: RugRadarState = {
      ...createRugRadar(0),
      lifetimeCorrect: 7,
      lifetimeAnswered: 10,
    };
    expect(lifetimeAccuracy(state)).toBeCloseTo(0.7);
  });
});

describe('abandonSession', () => {
  it('drops the live session without refunding the daily counter', () => {
    const now = localTime(2026, 4, 23, 14, 0);
    const started = startSession(createRugRadar(now), deckOf(3), now);
    const after = abandonSession(started);
    expect(after.session).toBeNull();
    expect(after.decksUsedToday).toBe(1);
  });

  it('is a no-op with no live session', () => {
    const state = createRugRadar(0);
    expect(abandonSession(state)).toBe(state);
  });
});
