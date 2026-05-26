/**
 * frozenWithdrawal.test.ts — Stage 6.5b Frozen Withdrawal scam.
 */
import { beforeEach, describe, expect, it } from '@jest/globals';
import { DAY_MS } from '../src/engine/time/clock';
import { createRandom } from '../src/engine/market';
import {
  deployFrozenWithdrawal,
  FROZEN_WITHDRAWAL_ID,
  resolveScamFromPlayer,
  tickDirector,
  vigilanceRewardFor,
  type DirectorGameSnapshot,
} from '../src/engine/scam-director';
import {
  buildFrozenWithdrawalPair,
  FROZEN_WITHDRAWAL_MIN_USD,
} from '../src/data/frozenWithdrawal';
import { serializeGame, useGameStore } from '../src/state/store';

const seq = (seed: number) => createRandom(seed);

const snapshot = (): DirectorGameSnapshot => ({
  followers: 0,
  netWorth: 50_000,
  clipboard: [],
});

describe('frozen withdrawal data', () => {
  it('pairs genuine bank.com with trap bannk.com', () => {
    const pair = buildFrozenWithdrawalPair(
      'scam-test',
      'WD-2026-0517-0001',
      20_000,
      '0xPlayerWallet9b4f',
      1_000,
    );
    expect(pair.genuine.fromAddress).toBe('notices@bank.com');
    expect(pair.trap.fromAddress).toBe('notices@bannk.com');
    expect(pair.genuine.action?.scamResolution?.caught).toBe(true);
    expect(pair.trap.action?.scamResolution?.caught).toBe(false);
    expect(pair.genuine.secondaryAction?.scamResolution?.decision).toBe(
      'cancelled',
    );
  });
});

describe('deployFrozenWithdrawal', () => {
  it('emits deployed effect when pacing allows', () => {
    const state = deployFrozenWithdrawal(
      {
        instances: [],
        lastTickAt: 0,
        totalArmed: 0,
        totalCaught: 0,
        totalFellFor: 0,
        pacing: { cooldownUntil: 0, recentResolutions: [] },
      },
      { amount: 20_000, destinationWallet: '0xabc' },
      1_000,
      seq(1),
    );
    expect(state.effects).toHaveLength(1);
    expect(state.effects[0]?.type).toBe('frozen-withdrawal-deployed');
    expect(state.state.instances).toHaveLength(1);
    expect(state.state.instances[0]?.defId).toBe(FROZEN_WITHDRAWAL_ID);
  });
});

describe('store integration', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(1_000_000);
    useGameStore.setState((s) => ({
      cash: 25_000,
      onboarding: { ...s.onboarding, hasOnboarded: true },
    }));
  });

  it('large withdrawal triggers hold, mail pair, and cash deduction', () => {
    useGameStore
      .getState()
      .initiateBankWithdrawal(20_000, '0xPlayerWallet9b4f', 1_000_000);
    const s = useGameStore.getState();
    expect(s.cash).toBe(5_000);
    expect(s.bank.pendingWithdrawal).not.toBeNull();
    expect(s.bank.pendingWithdrawal?.amount).toBe(20_000);
    const trap = s.mail.find((m) => m.fromAddress === 'notices@bannk.com');
    const genuine = s.mail.find((m) => m.fromAddress === 'notices@bank.com');
    expect(trap).toBeDefined();
    expect(genuine).toBeDefined();
  });

  it('cancelled withdrawal refunds cash', () => {
    useGameStore
      .getState()
      .initiateBankWithdrawal(20_000, '0xPlayerWallet9b4f', 2_000_000);
    const hold = useGameStore.getState().bank.pendingWithdrawal!;
    useGameStore
      .getState()
      .resolveScamInstance(hold.instanceId, false, 'cancelled');
    const after = useGameStore.getState();
    expect(after.bank.pendingWithdrawal).toBeNull();
    expect(after.cash).toBe(25_000);
  });

  it('waited path pays major vigilance reward', () => {
    useGameStore
      .getState()
      .initiateBankWithdrawal(20_000, '0xPlayerWallet9b4f', 3_000_000);
    const hold = useGameStore.getState().bank.pendingWithdrawal!;
    const before = useGameStore.getState().followers;
    useGameStore.getState().resolveScamInstance(hold.instanceId, true);
    expect(useGameStore.getState().followers).toBe(
      before + vigilanceRewardFor('major'),
    );
  });

  it('small withdrawals skip the scam', () => {
    useGameStore.getState().initiateBankWithdrawal(500, '0xsmallwallet', 4_000_000);
    const s = useGameStore.getState();
    expect(s.bank.pendingWithdrawal).toBeNull();
    expect(s.cash).toBe(24_500);
  });

  it('round-trips pendingWithdrawal through serialize', () => {
    useGameStore
      .getState()
      .initiateBankWithdrawal(20_000, '0xPlayerWallet9b4f', 5_000_000);
    const saved = serializeGame(useGameStore.getState());
    useGameStore.getState().newGame(6_000_000);
    useGameStore.getState().loadSaved(saved, 6_000_000);
    expect(useGameStore.getState().bank.pendingWithdrawal?.amount).toBe(20_000);
  });
});

describe('frozen withdrawal timeout', () => {
  it('auto-resolves as waited when the window expires', () => {
    const deployed = deployFrozenWithdrawal(
      {
        instances: [],
        lastTickAt: 0,
        totalArmed: 0,
        totalCaught: 0,
        totalFellFor: 0,
        pacing: { cooldownUntil: 0, recentResolutions: [] },
      },
      { amount: 20_000, destinationWallet: '0xabc' },
      1_000,
      seq(2),
    );
    const inst = deployed.state.instances[0]!;
    const after = tickDirector(
      deployed.state,
      snapshot(),
      inst.scheduledAt + DAY_MS + 1,
      seq(3),
    );
    const evt = after.effects.find(
      (e) => e.type === 'frozen-withdrawal-resolved',
    );
    expect(evt).toBeDefined();
    if (evt && evt.type === 'frozen-withdrawal-resolved') {
      expect(evt.outcome).toBe('waited');
      expect(evt.reason).toBe('expired');
    }
  });
});

describe('FROZEN_WITHDRAWAL_MIN_USD', () => {
  it('matches the data-layer constant', () => {
    expect(FROZEN_WITHDRAWAL_MIN_USD).toBe(10_000);
  });
});
