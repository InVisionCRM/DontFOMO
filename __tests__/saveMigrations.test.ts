/**
 * saveMigrations.test.ts — save migration framework.
 */
import { describe, expect, it } from '@jest/globals';
import {
  SAVE_VERSION,
  migrateEnvelope,
  isSaveLoadable,
} from '../src/save';

describe('isSaveLoadable', () => {
  it('accepts current and older schema versions', () => {
    expect(isSaveLoadable(SAVE_VERSION)).toBe(true);
    expect(isSaveLoadable(18)).toBe(true);
    expect(isSaveLoadable(1)).toBe(true);
  });

  it('rejects saves from a newer app build', () => {
    expect(isSaveLoadable(SAVE_VERSION + 1)).toBe(false);
  });

  it('rejects invalid version numbers', () => {
    expect(isSaveLoadable(0)).toBe(false);
    expect(isSaveLoadable(-1)).toBe(false);
  });
});

describe('migrateEnvelope', () => {
  it('leaves a current-version envelope unchanged', () => {
    const data = { cash: 500, bank: { pendingWithdrawal: null } };
    const envelope = { version: SAVE_VERSION, savedAt: 1_000, data };
    const out = migrateEnvelope(envelope);
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.data).toBe(data);
    expect(out.savedAt).toBe(1_000);
  });

  it('migrates v18 → v19 by adding bank.pendingWithdrawal', () => {
    const data = {
      cash: 12_000,
      bank: { bills: [], loan: null, regulatoryHold: null },
    };
    const out = migrateEnvelope({ version: 18, savedAt: 2_000, data });
    expect(out.version).toBe(19);
    expect(out.savedAt).toBe(2_000);
    const bank = (out.data as { bank: Record<string, unknown> }).bank;
    expect(bank.pendingWithdrawal).toBeNull();
  });

  it('chains v16 → v19 through registered steps', () => {
    const data = {
      cash: 8_000,
      bank: { bills: [], loan: null },
    };
    const out = migrateEnvelope({ version: 16, savedAt: 3_000, data });
    expect(out.version).toBe(19);
    const saved = out.data as unknown as {
      cloutTakeover: unknown;
      bank: { regulatoryHold: unknown; pendingWithdrawal: unknown };
    };
    expect(saved.cloutTakeover).toBeNull();
    expect(saved.bank.regulatoryHold).toBeNull();
    expect(saved.bank.pendingWithdrawal).toBeNull();
  });

  it('stops at the highest registered step when no further migration exists', () => {
    const data = { cash: 100 };
    const out = migrateEnvelope({ version: 15, savedAt: 4_000, data });
    expect(out.version).toBe(15);
    expect(out.data).toEqual(data);
  });
});
