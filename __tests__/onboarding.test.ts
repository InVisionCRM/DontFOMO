/**
 * onboarding.test.ts — store-action tests for the onboarding flow.
 * ------------------------------------------------------------------
 * Covers `setProfile`, `generateWallet`, `copySeedToClipboard`,
 * `deleteClipboardEntry`, `finishOnboarding`, and the defensive
 * default that auto-grants `hasOnboarded` to pre-v13 saves.
 */
import { beforeEach, describe, expect, it } from '@jest/globals';
import { DAY_MS } from '../src/engine/time/clock';
import { createMarket, createRandom } from '../src/engine/market';
import { createBank, createCashSwipe } from '../src/engine/economy';
import {
  SEED_PHRASE_LENGTH,
  phraseToText,
  pickPhrase,
} from '../src/engine/onboarding';
import { findSensitive } from '../src/engine/clipboard';
import { scanClipboard } from '../src/engine/scam-director';
import {
  createOnboardingState,
  serializeGame,
  useGameStore,
  type SavedGame,
} from '../src/state/store';

describe('onboarding store actions', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(1_000);
  });

  it('newGame seeds onboarding to hasOnboarded=false and no pending phrase', () => {
    const { onboarding, clipboard } = useGameStore.getState();
    expect(onboarding.hasOnboarded).toBe(false);
    expect(onboarding.pendingSeedPhrase).toBeNull();
    expect(clipboard).toEqual([]);
  });

  describe('setProfile', () => {
    it('slugifies the display name into the handle and trims the bio', () => {
      useGameStore.getState().setProfile('Kyle G', '  surviving the trenches  ');
      const state = useGameStore.getState();
      expect(state.handle).toBe('@kyleg');
      expect(state.bio).toBe('surviving the trenches');
    });
    it('lowercases and strips non-alphanumerics from the handle', () => {
      useGameStore.getState().setProfile('Wh@le_King!', 'gm');
      expect(useGameStore.getState().handle).toBe('@whle_king');
    });
    it('no-ops on an empty name', () => {
      const before = useGameStore.getState().handle;
      useGameStore.getState().setProfile('   ', 'bio');
      expect(useGameStore.getState().handle).toBe(before);
    });
  });

  describe('generateWallet', () => {
    it('parks a 12-word phrase on the onboarding slice', () => {
      useGameStore.getState().generateWallet(42);
      const phrase = useGameStore.getState().onboarding.pendingSeedPhrase;
      expect(phrase).not.toBeNull();
      expect(phrase).toHaveLength(SEED_PHRASE_LENGTH);
    });
    it('is deterministic for an explicit seed', () => {
      useGameStore.getState().generateWallet(123);
      const a = useGameStore.getState().onboarding.pendingSeedPhrase;
      useGameStore.getState().newGame(1_000);
      useGameStore.getState().generateWallet(123);
      const b = useGameStore.getState().onboarding.pendingSeedPhrase;
      expect(a).toEqual(b);
    });
    it('regenerating overwrites the previous phrase', () => {
      useGameStore.getState().generateWallet(1);
      const first = useGameStore.getState().onboarding.pendingSeedPhrase;
      useGameStore.getState().generateWallet(2);
      const second = useGameStore.getState().onboarding.pendingSeedPhrase;
      expect(first).not.toEqual(second);
    });
  });

  describe('copySeedToClipboard — the trap arms', () => {
    it('adds a sensitive entry with the phrase as content', () => {
      useGameStore.getState().generateWallet(7);
      const phrase = useGameStore.getState().onboarding.pendingSeedPhrase!;
      useGameStore.getState().copySeedToClipboard(5_000);
      const { clipboard } = useGameStore.getState();
      expect(clipboard).toHaveLength(1);
      const entry = clipboard[0];
      expect(entry?.isSensitive).toBe(true);
      expect(entry?.content).toBe(phraseToText(phrase));
      expect(entry?.source).toBe('Recovery phrase');
      expect(entry?.copiedAt).toBe(5_000);
    });
    it('the scan tick now reports the armed scam', () => {
      useGameStore.getState().generateWallet(8);
      useGameStore.getState().copySeedToClipboard(5_000);
      const result = scanClipboard(useGameStore.getState().clipboard);
      expect(result.reason).toBe('isSensitive');
      expect(result.found?.isSensitive).toBe(true);
    });
    it('no-ops when there is no pending phrase', () => {
      useGameStore.getState().copySeedToClipboard(5_000);
      expect(useGameStore.getState().clipboard).toEqual([]);
    });
  });

  describe('deleteClipboardEntry — the defuse path', () => {
    it('removes the sensitive entry, leaving the scan clean', () => {
      useGameStore.getState().generateWallet(9);
      useGameStore.getState().copySeedToClipboard(5_000);
      const sensitive = findSensitive(useGameStore.getState().clipboard);
      expect(sensitive).not.toBeNull();
      useGameStore.getState().deleteClipboardEntry(sensitive!.id);
      expect(findSensitive(useGameStore.getState().clipboard)).toBeNull();
      expect(scanClipboard(useGameStore.getState().clipboard).reason).toBe(
        'none',
      );
    });
  });

  describe('finishOnboarding', () => {
    it('flips hasOnboarded and clears the pending phrase', () => {
      useGameStore.getState().generateWallet(10);
      useGameStore.getState().finishOnboarding();
      const { onboarding } = useGameStore.getState();
      expect(onboarding.hasOnboarded).toBe(true);
      expect(onboarding.pendingSeedPhrase).toBeNull();
    });
    it('does not touch a sensitive clipboard entry (the trap stays armed)', () => {
      useGameStore.getState().generateWallet(11);
      useGameStore.getState().copySeedToClipboard(5_000);
      useGameStore.getState().finishOnboarding();
      expect(findSensitive(useGameStore.getState().clipboard)).not.toBeNull();
    });
  });
});

describe('save round-trip', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(1_000);
  });

  it('serializeGame includes clipboard and onboarding', () => {
    useGameStore.getState().generateWallet(1);
    useGameStore.getState().copySeedToClipboard(2_000);
    const saved = serializeGame(useGameStore.getState());
    expect(saved.clipboard).toHaveLength(1);
    expect(saved.onboarding.hasOnboarded).toBe(false);
    expect(saved.onboarding.pendingSeedPhrase).toHaveLength(
      SEED_PHRASE_LENGTH,
    );
  });

  it('loadSaved restores both new slices', () => {
    const fakePhrase = pickPhrase(99);
    const saved: SavedGame = {
      clock: { startedAt: 0, lastSeenAt: 0, now: 0 },
      cash: 100,
      followers: 0,
      handle: '@x',
      market: createMarket(createRandom(1)),
      holdings: {},
      playerTokens: [],
      bank: createBank(0),
      cashSwipe: createCashSwipe(0),
      peakNetWorth: 100,
      lastUnemploymentCheckAt: DAY_MS * 3,
      mail: [],
      tunnel: [],
      messages: [],
      bio: 'bio',
      cloutFeed: [],
      dailyPost: { lastPostAt: 0, currentStreakDays: 0, graceDays: 0 },
      diamonds: 0,
      assets: [],
      clipboard: [
        {
          id: 'restored',
          content: phraseToText(fakePhrase),
          copiedAt: 1,
          isSensitive: true,
        },
      ],
      onboarding: { hasOnboarded: false, pendingSeedPhrase: fakePhrase },
      director: {
        instances: [],
        lastTickAt: 0,
        totalArmed: 0,
        totalCaught: 0,
        totalFellFor: 0,
        pacing: { cooldownUntil: 0, recentResolutions: [] },
      },
      rugRadar: {
        dayKey: '2026-01-01',
        decksUsedToday: 0,
        lifetimeEarned: 0,
        lifetimeCorrect: 0,
        lifetimeAnswered: 0,
        lifetimeBestStreak: 0,
        session: null,
      },
      cloutTakeover: null,
    };
    useGameStore.getState().loadSaved(saved, DAY_MS * 3);
    const state = useGameStore.getState();
    expect(state.clipboard).toHaveLength(1);
    expect(state.clipboard[0]?.isSensitive).toBe(true);
    expect(state.onboarding.hasOnboarded).toBe(false);
    expect(state.onboarding.pendingSeedPhrase).toEqual(fakePhrase);
  });

  it('a pre-v13 save (no clipboard / onboarding fields) loads with hasOnboarded=true', () => {
    // Construct the legacy shape by spreading a v13 save and stripping
    // the new fields. `as unknown as SavedGame` is the explicit
    // pre-migration cast — the runtime defensive defaults are what
    // we're exercising.
    const v12: Partial<SavedGame> = {
      clock: { startedAt: 0, lastSeenAt: 0, now: 0 },
      cash: 100,
      followers: 0,
      handle: '@returning',
      market: createMarket(createRandom(1)),
      holdings: {},
      playerTokens: [],
      bank: createBank(0),
      cashSwipe: createCashSwipe(0),
      peakNetWorth: 100,
      lastUnemploymentCheckAt: DAY_MS * 3,
      mail: [],
      tunnel: [],
      messages: [],
      bio: 'returning',
      cloutFeed: [],
      dailyPost: { lastPostAt: 0, currentStreakDays: 0, graceDays: 0 },
      diamonds: 0,
      assets: [],
    };
    useGameStore.getState().loadSaved(v12 as unknown as SavedGame, DAY_MS * 3);
    const state = useGameStore.getState();
    expect(state.onboarding.hasOnboarded).toBe(true);
    expect(state.onboarding.pendingSeedPhrase).toBeNull();
    expect(state.clipboard).toEqual([]);
  });

  it('createOnboardingState yields a fresh-game onboarding shape', () => {
    expect(createOnboardingState()).toEqual({
      hasOnboarded: false,
      pendingSeedPhrase: null,
    });
  });
});
