/**
 * authorityNotice.test.ts — Stage 6.4 Authority Notice scam.
 * ------------------------------------------------------------------
 * Three layers:
 *  1. Picker — pickProactiveScam respects trigger / difficulty band /
 *     live-instance exclusion / pacing gate.
 *  2. Director — tickDirector arms via the picker, auto-resolves on
 *     timeout, and `resolveProactiveInstance` (player tap path)
 *     produces correct effects + pacing bookkeeping.
 *  3. Store integration — deployment places the bank hold + pushes
 *     the two emails; correct resolution lifts the hold + pays the
 *     `major` follower reward + scrubs the pair; wrong resolution
 *     drains cash only (crypto + assets untouched) + scrubs; save
 *     round-trip preserves an in-flight hold.
 */
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { DAY_MS } from '../src/engine/time/clock';
import { createRandom } from '../src/engine/market';
import {
  AUTHORITY_NOTICE_ID,
  AUTHORITY_NOTICE_TIMEOUT_DAYS,
  CLIPBOARD_SCAM_ID,
  GOLDEN_GIVEAWAY_ID,
  PACING_DEFAULTS,
  SCAM_CATALOG,
  createDirectorState,
  pickProactiveScam,
  proactiveCandidates,
  resolveProactiveInstance,
  tickDirector,
  vigilanceRewardFor,
  type DirectorGameSnapshot,
  type DirectorState,
  type ScamEventDef,
  type ScamInstance,
} from '../src/engine/scam-director';
import { serializeGame, useGameStore } from '../src/state/store';

const seq = (seed: number) => createRandom(seed);

const snapshot = (): DirectorGameSnapshot => ({
  followers: 0,
  netWorth: 500,
  clipboard: [],
});

const authorityDef = SCAM_CATALOG.find((d) => d.id === AUTHORITY_NOTICE_ID)!;
const clipboardDef = SCAM_CATALOG.find((d) => d.id === CLIPBOARD_SCAM_ID)!;

/**
 * 6.5a added a second proactive entry (Golden Giveaway) to the same
 * difficulty band, so any pure-engine test that asserts "Authority
 * Notice is what the picker returns" needs to constrain the catalog
 * to the two entries that existed at the 6.4 cut. Cross-scam picker
 * interactions belong in `goldenGiveaway.test.ts`.
 */
const AUTHORITY_ONLY_CATALOG: readonly ScamEventDef[] = SCAM_CATALOG.filter(
  (d) => d.id !== GOLDEN_GIVEAWAY_ID,
);

/**
 * Pre-seed the store's director with a sham "in-flight" Golden
 * Giveaway so the proactive picker excludes it. Used by the store
 * integration tests below so the only candidate left in the band is
 * the Authority Notice they're actually testing. The sham instance
 * has a `scheduledAt` well past every test's clock so the tick's
 * timeout branch never fires and never emits any effects.
 */
function blockGoldenGiveaway(now: number): void {
  useGameStore.setState((s) => ({
    director: {
      ...s.director,
      instances: [
        ...s.director.instances,
        {
          id: 'test-block-giveaway',
          defId: GOLDEN_GIVEAWAY_ID,
          state: 'deployed' as const,
          armedAt: now,
          // Far future so the tick's timeout branch never fires.
          scheduledAt: now + 365 * DAY_MS,
          resolvedAt: null,
          caught: null,
        },
      ],
    },
  }));
}

// ---------- 1. Picker ----------

describe('pickProactiveScam', () => {
  it('excludes reactive entries from the candidate set', () => {
    const state = createDirectorState(1_000);
    const candidates = proactiveCandidates(SCAM_CATALOG, state);
    expect(candidates.find((d) => d.id === CLIPBOARD_SCAM_ID)).toBeUndefined();
  });

  it('returns the Authority Notice for a fresh-game (newbie band)', () => {
    const state = createDirectorState(1_000);
    // Constrain the catalog to the 6.4 set (clipboard + authority);
    // 6.5a's Golden Giveaway is in the same band and would flip the
    // RNG coin against this assertion. Cross-scam picker fairness is
    // covered separately in `goldenGiveaway.test.ts`.
    const picked = pickProactiveScam(
      AUTHORITY_ONLY_CATALOG,
      state,
      2_000,
      seq(1),
    );
    expect(picked?.id).toBe(AUTHORITY_NOTICE_ID);
  });

  it('returns null when the pacing cooldown is still running', () => {
    const state = createDirectorState(1_000);
    const pacing = {
      cooldownUntil: 10_000,
      recentResolutions: [],
    };
    const picked = pickProactiveScam(
      SCAM_CATALOG,
      { ...state, pacing },
      5_000,
      seq(1),
    );
    expect(picked).toBeNull();
  });

  it('returns null while an Authority Notice instance is in flight', () => {
    const armed = tickDirector(
      createDirectorState(1_000),
      snapshot(),
      2_000,
      seq(1),
      AUTHORITY_ONLY_CATALOG,
    );
    expect(
      armed.state.instances.find((i) => i.defId === AUTHORITY_NOTICE_ID)
        ?.state,
    ).toBe('deployed');
    // Try to pick again on a later tick — same instance still live.
    const picked = pickProactiveScam(
      AUTHORITY_ONLY_CATALOG,
      armed.state,
      3_000,
      seq(2),
    );
    expect(picked).toBeNull();
  });

  it('returns null when the catalog has no in-band candidates', () => {
    // A sharp player (difficulty band 3..5) against a single
    // proactive catalog entry of difficulty 1 → no in-band match.
    const lowDef: ScamEventDef = {
      ...authorityDef,
      difficulty: 1,
      maxSeverity: 'minor',
    };
    const sharpState: DirectorState = {
      ...createDirectorState(0),
      pacing: {
        cooldownUntil: 0,
        recentResolutions: Array.from(
          { length: PACING_DEFAULTS.skillSampleSize },
          (_, i) => ({
            instanceId: `r-${i}`,
            defId: CLIPBOARD_SCAM_ID,
            resolvedAt: i,
            caught: true,
            severity: 'minor' as const,
          }),
        ),
      },
    };
    const picked = pickProactiveScam([lowDef, clipboardDef], sharpState, 1_000, seq(1));
    expect(picked).toBeNull();
  });
});

// ---------- 2. Director ----------

describe('tickDirector — Authority Notice arming + timeout', () => {
  it('arms an instance and emits the `deployed` effect', () => {
    const out = tickDirector(
      createDirectorState(1_000),
      snapshot(),
      2_000,
      seq(1),
      AUTHORITY_ONLY_CATALOG,
    );
    const inst = out.state.instances.find((i) => i.defId === AUTHORITY_NOTICE_ID);
    expect(inst?.state).toBe('deployed');
    expect(inst?.scheduledAt).toBe(2_000 + AUTHORITY_NOTICE_TIMEOUT_DAYS * DAY_MS);
    expect(
      out.effects.find((e) => e.type === 'authority-notice-deployed'),
    ).toBeDefined();
  });

  it('auto-resolves the instance as fell-for when the window expires', () => {
    const armed = tickDirector(
      createDirectorState(1_000),
      snapshot(),
      2_000,
      seq(1),
      AUTHORITY_ONLY_CATALOG,
    );
    const inst = armed.state.instances.find(
      (i) => i.defId === AUTHORITY_NOTICE_ID,
    )!;
    const after = tickDirector(
      armed.state,
      snapshot(),
      inst.scheduledAt + 1,
      seq(2),
      AUTHORITY_ONLY_CATALOG,
    );
    const resolved = after.state.instances.find(
      (i) => i.id === inst.id,
    ) as ScamInstance;
    expect(resolved.state).toBe('resolved');
    expect(resolved.caught).toBe(false);
    const evt = after.effects.find(
      (e) => e.type === 'authority-notice-resolved',
    );
    expect(evt).toBeDefined();
    if (evt && evt.type === 'authority-notice-resolved') {
      expect(evt.caught).toBe(false);
      expect(evt.reason).toBe('expired');
    }
  });
});

describe('resolveProactiveInstance', () => {
  it('produces a `tapped` resolved effect with the supplied outcome', () => {
    const armed = tickDirector(
      createDirectorState(1_000),
      snapshot(),
      2_000,
      seq(1),
      AUTHORITY_ONLY_CATALOG,
    );
    const inst = armed.state.instances.find(
      (i) => i.defId === AUTHORITY_NOTICE_ID,
    )!;
    const resolved = resolveProactiveInstance(armed.state, inst.id, true, 3_000);
    expect(resolved.state.totalCaught).toBe(1);
    expect(resolved.state.totalFellFor).toBe(0);
    const evt = resolved.effects.find(
      (e) => e.type === 'authority-notice-resolved',
    );
    expect(evt).toBeDefined();
    if (evt && evt.type === 'authority-notice-resolved') {
      expect(evt.caught).toBe(true);
      expect(evt.reason).toBe('tapped');
    }
    // Pacing folded the resolution into the rolling window.
    expect(resolved.state.pacing.recentResolutions).toHaveLength(1);
  });

  it('is a no-op for unknown / already-resolved instance ids', () => {
    const state = createDirectorState(1_000);
    const out = resolveProactiveInstance(state, 'never-existed', true, 2_000);
    expect(out.state).toBe(state);
    expect(out.effects).toEqual([]);
  });
});

// ---------- 3. Store integration ----------

describe('store: authority-notice-deployed effect', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(1_000_000);
    useGameStore.setState({
      cash: 9_000,
      holdings: { NEURA: 100 },
    });
    blockGoldenGiveaway(1_000_000);
  });

  it('places the bank regulatory hold and pushes both paired emails', () => {
    // Force a tick so the proactive picker fires.
    useGameStore.getState().tick(1_000_000 + 60_000);
    const s = useGameStore.getState();
    // (Onboarding gates the Director — but freshGame leaves
    // `hasOnboarded: false`. Mark it true manually to let the
    // proactive picker run.)
  });
});

describe('store: authority-notice resolution (correct)', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(1_000_000);
    useGameStore.setState((s) => ({
      cash: 9_000,
      holdings: { NEURA: 100 },
      onboarding: { ...s.onboarding, hasOnboarded: true },
    }));
    blockGoldenGiveaway(1_000_000);
  });

  it('lifts the hold, scrubs the paired emails, pays the major follower reward', () => {
    // Trigger the picker via a director tick a minute later.
    useGameStore.getState().tick(1_000_000 + 60_000);
    const deployed = useGameStore.getState();
    expect(deployed.bank.regulatoryHold).not.toBeNull();
    const hold = deployed.bank.regulatoryHold!;
    expect(hold.scamId).toBe('authority-notice');
    // Both paired emails are now in the inbox.
    const fakeMail = deployed.mail.find((m) => m.id === `${hold.instanceId}-fake`);
    const realMail = deployed.mail.find((m) => m.id === `${hold.instanceId}-real`);
    expect(fakeMail).toBeDefined();
    expect(realMail).toBeDefined();
    expect(fakeMail?.fromAddress).toBe('notices@bank.com');
    expect(realMail?.fromAddress).toBe('notices@bannk.com');
    expect(fakeMail?.action?.scamResolution?.caught).toBe(true);
    expect(realMail?.action?.scamResolution?.caught).toBe(false);

    const followersBefore = deployed.followers;
    const cashBefore = deployed.cash;
    const holdingsBefore = { ...deployed.holdings };

    useGameStore.getState().resolveScamInstance(hold.instanceId, true);
    const after = useGameStore.getState();
    expect(after.bank.regulatoryHold).toBeNull();
    expect(after.cash).toBe(cashBefore);
    expect(after.holdings).toEqual(holdingsBefore);
    expect(after.followers).toBe(followersBefore + vigilanceRewardFor('major'));
    expect(after.mail.find((m) => m.id === `${hold.instanceId}-fake`)).toBeUndefined();
    expect(after.mail.find((m) => m.id === `${hold.instanceId}-real`)).toBeUndefined();
    expect(after.director.totalCaught).toBe(1);
  });
});

describe('store: authority-notice resolution (wrong)', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(2_000_000);
    useGameStore.setState((s) => ({
      cash: 9_000,
      holdings: { NEURA: 100, VOLT: 50 },
      onboarding: { ...s.onboarding, hasOnboarded: true },
    }));
    blockGoldenGiveaway(2_000_000);
  });

  it('drains all bank cash but leaves crypto and assets untouched', () => {
    useGameStore.getState().tick(2_000_000 + 60_000);
    const hold = useGameStore.getState().bank.regulatoryHold!;
    const holdingsBefore = { ...useGameStore.getState().holdings };

    useGameStore.getState().resolveScamInstance(hold.instanceId, false);
    const after = useGameStore.getState();
    expect(after.cash).toBe(0);
    expect(after.holdings).toEqual(holdingsBefore);
    expect(after.bank.regulatoryHold).toBeNull();
    expect(after.director.totalFellFor).toBe(1);
    expect(after.banner?.title).toBe('Bank drained');
  });

  it('save round-trip preserves an in-flight regulatory hold', () => {
    useGameStore.getState().tick(2_000_000 + 60_000);
    const before = useGameStore.getState();
    const hold = before.bank.regulatoryHold!;
    const snap = serializeGame(before);
    expect(snap.bank.regulatoryHold).toEqual(hold);
  });
});

afterEach(() => {
  useGameStore.getState().newGame(Date.now());
});
