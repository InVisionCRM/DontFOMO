/**
 * migrations.ts — versioned save migrations (Stage 7 framework).
 * ------------------------------------------------------------------
 * When `SAVE_VERSION` bumps, add a `SaveMigration` here that upgrades
 * the previous version's `data` blob. `migrateEnvelope` chains them so
 * players keep progress across app updates instead of starting fresh.
 *
 * Older saves with no registered step still load: `loadSaved` applies
 * defensive defaults for any field a migration did not touch.
 *
 * Pure functions — no React, no React Native imports.
 */

import {
  SAVE_VERSION,
  type SaveEnvelope,
  type SaveMigration,
} from './SaveAdapter';

/** v17 → v18: Golden Giveaway takeover slot on `GameState`. */
const migrateV17ToV18: SaveMigration = {
  from: 17,
  to: 18,
  migrate: (data: unknown): unknown => {
    const saved = data as Record<string, unknown>;
    if (saved.cloutTakeover !== undefined) {
      return data;
    }
    return { ...saved, cloutTakeover: null };
  },
};

/** v18 → v19: Frozen Withdrawal pending-withdrawal on `BankState`. */
const migrateV18ToV19: SaveMigration = {
  from: 18,
  to: 19,
  migrate: (data: unknown): unknown => {
    const saved = data as Record<string, unknown>;
    const bank = saved.bank as Record<string, unknown> | undefined;
    if (!bank || bank.pendingWithdrawal !== undefined) {
      return data;
    }
    return {
      ...saved,
      bank: { ...bank, pendingWithdrawal: null },
    };
  },
};

/** v16 → v17: Authority Notice regulatory hold on `BankState`. */
const migrateV16ToV17: SaveMigration = {
  from: 16,
  to: 17,
  migrate: (data: unknown): unknown => {
    const saved = data as Record<string, unknown>;
    const bank = saved.bank as Record<string, unknown> | undefined;
    if (!bank || bank.regulatoryHold !== undefined) {
      return data;
    }
    return {
      ...saved,
      bank: { ...bank, regulatoryHold: null },
    };
  },
};

/**
 * Registered migrations, one step per schema bump. Order is not relied on
 * — `migrateEnvelope` looks up by `from` version.
 */
export const SAVE_MIGRATIONS: readonly SaveMigration[] = [
  migrateV16ToV17,
  migrateV17ToV18,
  migrateV18ToV19,
];

const MIGRATION_BY_FROM = new Map(
  SAVE_MIGRATIONS.map((m) => [m.from, m] as const),
);

/**
 * Apply every registered migration from `envelope.version` up to
 * `SAVE_VERSION`. Returns the envelope with an updated `version` and
 * transformed `data`. `savedAt` is preserved.
 */
export function migrateEnvelope<T>(envelope: SaveEnvelope<T>): SaveEnvelope<T> {
  let version = envelope.version;
  let data: unknown = envelope.data;

  while (version < SAVE_VERSION) {
    const step = MIGRATION_BY_FROM.get(version);
    if (!step) {
      break;
    }
    data = step.migrate(data);
    version = step.to;
  }

  return {
    version,
    savedAt: envelope.savedAt,
    data: data as T,
  };
}

/**
 * True when the envelope should be loaded. Saves at or below `SAVE_VERSION`
 * always load — registered migrations run first; `loadSaved` backfills any
 * field a migration did not touch. Only saves from a *newer* app build are
 * rejected (incompatible forward schema).
 */
export function isSaveLoadable(version: number): boolean {
  return version > 0 && version <= SAVE_VERSION;
}
