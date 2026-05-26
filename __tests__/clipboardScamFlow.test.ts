/**
 * clipboardScamFlow.test.ts — end-to-end Clipboard Scam.
 * ------------------------------------------------------------------
 * Exercises arming + detonation + defuse through the store, with
 * the friend-voice teaching threads landing in Messages. The
 * director's pure unit tests live in scamDirector.test.ts; these
 * tests cover the side-effect glue (drain, banner, follower
 * reward, message push) the store applies in response to each
 * Director effect.
 *
 * Note on ordering: `copySeedToClipboard` reads
 * `onboarding.pendingSeedPhrase`, which `finishOnboarding` clears.
 * The trap must therefore be armed BEFORE finishing onboarding —
 * which mirrors the real player flow (Copy is on the Seed step,
 * Done is later).
 */
import { beforeEach, describe, expect, it } from '@jest/globals';
import { DAY_MS } from '../src/engine/time/clock';
import {
  CLIPBOARD_DETONATION_MAX_DAYS,
  CLIPBOARD_SCAM_ID,
} from '../src/engine/scam-director';
import {
  VIGILANCE_REWARD_FOLLOWERS,
  serializeGame,
  useGameStore,
} from '../src/state/store';
import { findScamTeaching } from '../src/data/scamTeachings';

const TEACHING = findScamTeaching('clipboard-scam')!;

/**
 * Onboard a player who tapped the Copy trap during the Seed step.
 * Leaves the sensitive entry in the clipboard + `hasOnboarded` true.
 * Also injects crypto holdings so a drain is observable.
 */
function onboardWithCopyTrap(startAt: number): void {
  useGameStore.getState().newGame(startAt);
  useGameStore.getState().setProfile('TestPlayer', 'qa fixture');
  useGameStore.getState().generateWallet(7);
  useGameStore.getState().copySeedToClipboard(startAt + 100);
  // Inject crypto directly — bypass the market simulation to keep the
  // test focused on the scam, not on price.
  // Push the unemployment anchor far enough out that none of the
  // multi-day ticks below trip the Thursday-8pm-ET check — that
  // would credit cash and pollute the drain assertion.
  // Also push the Scam Director's pacing cooldown well past the test
  // horizon so the proactive picker (Stage 6.4+) stays quiet — these
  // tests are scoped to the Clipboard reactive flow; cross-scam
  // interactions live in `authorityNotice.test.ts`.
  useGameStore.setState((s) => ({
    holdings: { NEURA: 500, VOLT: 300 },
    lastUnemploymentCheckAt: startAt + 30 * DAY_MS,
    director: {
      ...s.director,
      pacing: {
        ...s.director.pacing,
        cooldownUntil: startAt + 365 * DAY_MS,
      },
    },
  }));
  useGameStore.getState().finishOnboarding();
}

describe('Clipboard Scam — end to end', () => {
  beforeEach(() => {
    onboardWithCopyTrap(0);
  });

  it('arms on the next tick after onboarding completes', () => {
    expect(useGameStore.getState().director.totalArmed).toBe(0);

    useGameStore.getState().tick(2_000);

    const after = useGameStore.getState();
    expect(after.director.totalArmed).toBe(1);
    expect(after.director.instances).toHaveLength(1);
    const inst = after.director.instances[0]!;
    expect(inst.defId).toBe(CLIPBOARD_SCAM_ID);
    expect(inst.state).toBe('armed');
  });

  it('detonates after the scheduled window — drains crypto, leaves cash, fires teaching', () => {
    useGameStore.getState().tick(2_000);

    const armedSched =
      useGameStore.getState().director.instances[0]!.scheduledAt;
    const cashBefore = useGameStore.getState().cash;
    const heldBefore = useGameStore.getState().holdings;
    expect(Object.keys(heldBefore).length).toBeGreaterThan(0); // sanity

    useGameStore.getState().tick(armedSched + 1);

    const after = useGameStore.getState();
    expect(after.holdings).toEqual({});
    expect(after.cash).toBe(cashBefore);
    expect(after.director.totalFellFor).toBe(1);
    expect(after.director.instances[0]!.state).toBe('resolved');
    expect(after.director.instances[0]!.caught).toBe(false);
    expect(after.banner?.title).toBe('Wallet drained');

    const marcus = after.messages.find(
      (c) => c.id === TEACHING.contactConversationId,
    );
    expect(marcus).toBeDefined();
    expect(
      marcus!.messages.some((m) => m.text === TEACHING.fellFor[0]!.text),
    ).toBe(true);
    // Sensitive entry consumed so the Director can't immediately rearm.
    expect(after.clipboard.find((e) => e.isSensitive)).toBeUndefined();
  });

  it('defuses when the sensitive entry is deleted before the window — rewards vigilance', () => {
    useGameStore.getState().tick(2_000);

    const armed = useGameStore.getState().director.instances[0]!;
    const cashBefore = useGameStore.getState().cash;
    const heldBefore = useGameStore.getState().holdings;
    const followersBefore = useGameStore.getState().followers;
    const sensitive = useGameStore
      .getState()
      .clipboard.find((e) => e.isSensitive)!;

    useGameStore.getState().deleteClipboardEntry(sensitive.id);
    useGameStore.getState().tick(3_000);

    const after = useGameStore.getState();
    expect(after.cash).toBe(cashBefore);
    expect(after.holdings).toEqual(heldBefore);
    expect(after.director.totalCaught).toBe(1);
    expect(after.director.instances[0]!.state).toBe('resolved');
    expect(after.director.instances[0]!.caught).toBe(true);
    expect(after.director.instances[0]!.id).toBe(armed.id);
    expect(after.followers).toBe(followersBefore + VIGILANCE_REWARD_FOLLOWERS);

    const marcus = after.messages.find(
      (c) => c.id === TEACHING.contactConversationId,
    );
    expect(
      marcus!.messages.some((m) => m.text === TEACHING.caught[0]!.text),
    ).toBe(true);
  });

  it('does not detonate before the scheduled time', () => {
    useGameStore.getState().tick(2_000);
    const armedSched =
      useGameStore.getState().director.instances[0]!.scheduledAt;

    useGameStore.getState().tick(armedSched - 1);

    const after = useGameStore.getState();
    expect(after.director.instances[0]!.state).toBe('armed');
    expect(after.director.totalFellFor).toBe(0);
    expect(Object.keys(after.holdings).length).toBeGreaterThan(0);
  });
});

describe('Director gating on onboarding', () => {
  it('does not arm or transition while hasOnboarded is false', () => {
    useGameStore.getState().newGame(0);
    useGameStore.getState().setProfile('TestPlayer', 'fresh');
    useGameStore.getState().generateWallet(7);
    useGameStore.getState().copySeedToClipboard(500);
    // Skip finishOnboarding — stays in onboarding.
    useGameStore.getState().tick(2_000);
    const after = useGameStore.getState();
    expect(after.director.totalArmed).toBe(0);
    expect(after.director.instances).toEqual([]);
  });
});

describe('offline catch-up via loadSaved', () => {
  it('detonates a scheduled scam whose window passed while the player was away', () => {
    onboardWithCopyTrap(0);
    useGameStore.getState().tick(2_000);

    const saved = serializeGame(useGameStore.getState());
    const armedSched = saved.director.instances[0]!.scheduledAt;
    // Future unemployment anchor so it doesn't fire on reload.
    const reopenAt = armedSched + DAY_MS;
    const futureCheckAnchor =
      reopenAt + (CLIPBOARD_DETONATION_MAX_DAYS + 2) * DAY_MS;

    useGameStore
      .getState()
      .loadSaved(
        { ...saved, lastUnemploymentCheckAt: futureCheckAnchor },
        reopenAt,
      );

    const after = useGameStore.getState();
    expect(after.director.totalFellFor).toBe(1);
    expect(after.holdings).toEqual({});
    expect(after.banner?.title).toBe('Wallet drained');
  });
});
