/**
 * goldenGiveaway.test.ts — Stage 6.5a Golden Giveaway scam.
 * ------------------------------------------------------------------
 * Mirrors the 6.4 Authority Notice test layout, retargeted at the
 * Inbound Lure semantics:
 *  1. Picker — Golden Giveaway is a valid proactive candidate in the
 *     newbie band; already-in-flight excludes it.
 *  2. Director — tickDirector arms via the picker, the timeout
 *     auto-resolves as CAUGHT (not fell-for — Inbound Lure polarity
 *     is flipped from the Lockout), `resolveProactiveInstance`
 *     produces correct tapped effects.
 *  3. Store integration — deployment pins the takeover snapshot;
 *     correct (reported) resolution pays the minor vigilance reward
 *     and clears the takeover; wrong (participated) resolution drains
 *     30% cash + 30% of each crypto holding, leaves bank+assets
 *     untouched; the expired path credits caught but pays NO follower
 *     reward; save round-trip preserves the takeover snapshot.
 */
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { DAY_MS } from '../src/engine/time/clock';
import { createRandom } from '../src/engine/market';
import {
  AUTHORITY_NOTICE_ID,
  CLIPBOARD_SCAM_ID,
  GOLDEN_GIVEAWAY_ID,
  GOLDEN_GIVEAWAY_TIMEOUT_DAYS,
  SCAM_CATALOG,
  createDirectorState,
  pickProactiveScam,
  proactiveCandidates,
  resolveProactiveInstance,
  tickDirector,
  vigilanceRewardFor,
  type DirectorGameSnapshot,
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

/**
 * Catalog filtered to Golden Giveaway + Clipboard only. The Clipboard
 * entry is reactive (excluded from proactive candidates anyway) and is
 * kept so the pacing layer's "no in-band candidate" branch behaves
 * realistically. Authority Notice is excluded so the picker
 * deterministically returns the Golden Giveaway in the integration
 * tests below.
 */
const GIVEAWAY_ONLY_CATALOG: readonly ScamEventDef[] = SCAM_CATALOG.filter(
  (d) => d.id !== AUTHORITY_NOTICE_ID,
);

/**
 * Pre-seed the store's director with a sham in-flight Authority
 * Notice so the proactive picker excludes it. Mirror of the helper in
 * `authorityNotice.test.ts` — see that file for the rationale.
 */
function blockAuthorityNotice(now: number): void {
  useGameStore.setState((s) => ({
    director: {
      ...s.director,
      instances: [
        ...s.director.instances,
        {
          id: 'test-block-authority',
          defId: AUTHORITY_NOTICE_ID,
          state: 'deployed' as const,
          armedAt: now,
          scheduledAt: now + 365 * DAY_MS,
          resolvedAt: null,
          caught: null,
        },
      ],
    },
  }));
}

// ---------- 1. Picker ----------

describe('pickProactiveScam — Golden Giveaway', () => {
  it('includes Golden Giveaway in the candidate set for a fresh game', () => {
    const state = createDirectorState(1_000);
    const candidates = proactiveCandidates(SCAM_CATALOG, state);
    expect(candidates.find((d) => d.id === GOLDEN_GIVEAWAY_ID)).toBeDefined();
  });

  it('excludes the reactive Clipboard scam', () => {
    const state = createDirectorState(1_000);
    const candidates = proactiveCandidates(SCAM_CATALOG, state);
    expect(candidates.find((d) => d.id === CLIPBOARD_SCAM_ID)).toBeUndefined();
  });

  it('returns Golden Giveaway when it is the only in-band proactive entry', () => {
    const state = createDirectorState(1_000);
    const picked = pickProactiveScam(
      GIVEAWAY_ONLY_CATALOG,
      state,
      2_000,
      seq(1),
    );
    expect(picked?.id).toBe(GOLDEN_GIVEAWAY_ID);
  });

  it('returns null while a Golden Giveaway instance is in flight', () => {
    const armed = tickDirector(
      createDirectorState(1_000),
      snapshot(),
      2_000,
      seq(1),
      GIVEAWAY_ONLY_CATALOG,
    );
    expect(
      armed.state.instances.find((i) => i.defId === GOLDEN_GIVEAWAY_ID)
        ?.state,
    ).toBe('deployed');
    const picked = pickProactiveScam(
      GIVEAWAY_ONLY_CATALOG,
      armed.state,
      3_000,
      seq(2),
    );
    expect(picked).toBeNull();
  });
});

// ---------- 2. Director ----------

describe('tickDirector — Golden Giveaway arming + timeout', () => {
  it('arms an instance and emits the `deployed` effect with a 3-day expiry', () => {
    const out = tickDirector(
      createDirectorState(1_000),
      snapshot(),
      2_000,
      seq(1),
      GIVEAWAY_ONLY_CATALOG,
    );
    const inst = out.state.instances.find((i) => i.defId === GOLDEN_GIVEAWAY_ID);
    expect(inst?.state).toBe('deployed');
    expect(inst?.scheduledAt).toBe(2_000 + GOLDEN_GIVEAWAY_TIMEOUT_DAYS * DAY_MS);
    const evt = out.effects.find((e) => e.type === 'golden-giveaway-deployed');
    expect(evt).toBeDefined();
    if (evt && evt.type === 'golden-giveaway-deployed') {
      expect(evt.expiresAt).toBe(2_000 + GOLDEN_GIVEAWAY_TIMEOUT_DAYS * DAY_MS);
    }
  });

  it('auto-resolves the instance as CAUGHT (not fell-for) when the window expires', () => {
    // Inbound Lure polarity: ignoring is the SAFE choice (Bible §11),
    // so an expired window credits caught — different from the
    // Authority Notice (Lockout) where expired = fell-for.
    const armed = tickDirector(
      createDirectorState(1_000),
      snapshot(),
      2_000,
      seq(1),
      GIVEAWAY_ONLY_CATALOG,
    );
    const inst = armed.state.instances.find(
      (i) => i.defId === GOLDEN_GIVEAWAY_ID,
    )!;
    const after = tickDirector(
      armed.state,
      snapshot(),
      inst.scheduledAt + 1,
      seq(2),
      GIVEAWAY_ONLY_CATALOG,
    );
    const resolved = after.state.instances.find(
      (i) => i.id === inst.id,
    ) as ScamInstance;
    expect(resolved.state).toBe('resolved');
    expect(resolved.caught).toBe(true);
    expect(after.state.totalCaught).toBe(1);
    expect(after.state.totalFellFor).toBe(0);
    const evt = after.effects.find(
      (e) => e.type === 'golden-giveaway-resolved',
    );
    expect(evt).toBeDefined();
    if (evt && evt.type === 'golden-giveaway-resolved') {
      expect(evt.caught).toBe(true);
      expect(evt.reason).toBe('expired');
    }
  });
});

describe('resolveProactiveInstance — Golden Giveaway', () => {
  it('produces a `tapped` resolved effect with the supplied outcome', () => {
    const armed = tickDirector(
      createDirectorState(1_000),
      snapshot(),
      2_000,
      seq(1),
      GIVEAWAY_ONLY_CATALOG,
    );
    const inst = armed.state.instances.find(
      (i) => i.defId === GOLDEN_GIVEAWAY_ID,
    )!;
    const resolved = resolveProactiveInstance(armed.state, inst.id, false, 3_000);
    expect(resolved.state.totalCaught).toBe(0);
    expect(resolved.state.totalFellFor).toBe(1);
    const evt = resolved.effects.find(
      (e) => e.type === 'golden-giveaway-resolved',
    );
    expect(evt).toBeDefined();
    if (evt && evt.type === 'golden-giveaway-resolved') {
      expect(evt.caught).toBe(false);
      expect(evt.reason).toBe('tapped');
    }
    // Pacing folded the resolution into the rolling window.
    expect(resolved.state.pacing.recentResolutions).toHaveLength(1);
  });
});

// ---------- 3. Store integration ----------

describe('store: golden-giveaway-deployed effect', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(1_000_000);
    useGameStore.setState((s) => ({
      cash: 10_000,
      holdings: { NEURA: 100, VOLT: 50 },
      onboarding: { ...s.onboarding, hasOnboarded: true },
    }));
    blockAuthorityNotice(1_000_000);
  });

  it('pins the takeover snapshot and fires the Clout banner', () => {
    useGameStore.getState().tick(1_000_000 + 60_000);
    const s = useGameStore.getState();
    expect(s.cloutTakeover).not.toBeNull();
    const t = s.cloutTakeover!;
    expect(t.scamId).toBe('golden-giveaway');
    expect(t.fakeHandle).toBe('@vancereiter_eth');
    expect(t.realHandle).toBe('@vancereiter');
    // Expiry matches the engine constant.
    expect(t.expiresAt).toBeGreaterThan(1_000_000);
    expect(s.banner?.title).toBe('Clout');
  });
});

describe('store: golden-giveaway resolution (correct — reported)', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(1_000_000);
    useGameStore.setState((s) => ({
      cash: 10_000,
      holdings: { NEURA: 100 },
      onboarding: { ...s.onboarding, hasOnboarded: true },
    }));
    blockAuthorityNotice(1_000_000);
  });

  it('clears the takeover, pays the minor vigilance reward, leaves cash + holdings untouched', () => {
    useGameStore.getState().tick(1_000_000 + 60_000);
    const deployed = useGameStore.getState();
    const t = deployed.cloutTakeover!;
    expect(t).not.toBeNull();
    const followersBefore = deployed.followers;
    const cashBefore = deployed.cash;
    const holdingsBefore = { ...deployed.holdings };

    useGameStore.getState().resolveScamInstance(t.instanceId, true);
    const after = useGameStore.getState();
    expect(after.cloutTakeover).toBeNull();
    expect(after.cash).toBe(cashBefore);
    expect(after.holdings).toEqual(holdingsBefore);
    expect(after.followers).toBe(followersBefore + vigilanceRewardFor('minor'));
    expect(after.director.totalCaught).toBe(1);
    expect(after.banner?.title).toBe('Clout');
  });
});

describe('store: golden-giveaway resolution (wrong — participated)', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(2_000_000);
    useGameStore.setState((s) => ({
      cash: 10_000,
      holdings: { NEURA: 100, VOLT: 50 },
      onboarding: { ...s.onboarding, hasOnboarded: true },
    }));
    blockAuthorityNotice(2_000_000);
  });

  it('drains 30% of cash and 30% of each crypto holding; leaves bank untouched', () => {
    useGameStore.getState().tick(2_000_000 + 60_000);
    const t = useGameStore.getState().cloutTakeover!;
    const bankBefore = useGameStore.getState().bank;

    useGameStore.getState().resolveScamInstance(t.instanceId, false);
    const after = useGameStore.getState();
    expect(after.cash).toBeCloseTo(7_000, 5);
    expect(after.holdings.NEURA).toBeCloseTo(70, 5);
    expect(after.holdings.VOLT).toBeCloseTo(35, 5);
    expect(after.bank).toEqual(bankBefore);
    expect(after.cloutTakeover).toBeNull();
    expect(after.director.totalFellFor).toBe(1);
    expect(after.banner?.title).toBe('Wallet drained');
  });
});

describe('store: golden-giveaway resolution (expired — ignored)', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(3_000_000);
    useGameStore.setState((s) => ({
      cash: 10_000,
      holdings: { NEURA: 100 },
      onboarding: { ...s.onboarding, hasOnboarded: true },
    }));
    blockAuthorityNotice(3_000_000);
  });

  it('credits caught but pays NO follower reward when the window expires', () => {
    useGameStore.getState().tick(3_000_000 + 60_000);
    const t = useGameStore.getState().cloutTakeover!;
    const followersBefore = useGameStore.getState().followers;

    // Advance past the expiry — tick fires the timeout branch.
    useGameStore.getState().tick(t.expiresAt + 1);
    const after = useGameStore.getState();
    expect(after.cloutTakeover).toBeNull();
    expect(after.followers).toBe(followersBefore);
    expect(after.director.totalCaught).toBe(1);
  });
});

describe('store: golden-giveaway save round-trip', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(4_000_000);
    useGameStore.setState((s) => ({
      cash: 10_000,
      holdings: { NEURA: 100 },
      onboarding: { ...s.onboarding, hasOnboarded: true },
    }));
    blockAuthorityNotice(4_000_000);
  });

  it('preserves an in-flight takeover snapshot', () => {
    useGameStore.getState().tick(4_000_000 + 60_000);
    const before = useGameStore.getState();
    expect(before.cloutTakeover).not.toBeNull();
    const snap = serializeGame(before);
    expect(snap.cloutTakeover).toEqual(before.cloutTakeover);
  });
});

afterEach(() => {
  useGameStore.getState().newGame(Date.now());
});
