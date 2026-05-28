/**
 * migrations.ts — save schema migration chain.
 * ------------------------------------------------------------------
 * Saves are versioned (`SaveAdapter.SAVE_VERSION`). When the shape
 * changes, bump the version and add a `SaveMigration` here that
 * upgrades the previous version's `data` blob to the new shape.
 *
 * The chain runs forward only. `migrateSave` walks an envelope from
 * `envelope.version` up to `targetVersion` (always `SAVE_VERSION` in
 * production) by applying each registered migration in turn.
 *
 * Policy:
 *   - envelope.version === target            → return as-is.
 *   - MIN_SUPPORTED_VERSION ≤ v < target     → migrate.
 *   - v < MIN_SUPPORTED_VERSION              → throw `TooOldSaveError`.
 *   - v > target (downgrade)                 → throw `FutureSaveError`.
 *
 * Defensive backfills in `store.loadSaved` are an independent safety
 * net for partial in-memory state (e.g. hot-reload poisoning); they
 * are idempotent and stay in place alongside this chain.
 *
 * Pure module — no React, no React Native, no I/O.
 */
import { createPacingState } from '../engine/scam-director/pacing';
import {
  MIN_SUPPORTED_VERSION,
  SAVE_VERSION,
  type MigrationContext,
  type SaveEnvelope,
  type SaveMigration,
} from './SaveAdapter';

/** Thrown when an envelope is older than `MIN_SUPPORTED_VERSION`. */
export class TooOldSaveError extends Error {
  constructor(readonly version: number) {
    super(
      `Save version ${version} is below MIN_SUPPORTED_VERSION ${MIN_SUPPORTED_VERSION}.`,
    );
    this.name = 'TooOldSaveError';
  }
}

/** Thrown when an envelope is from a newer build than this one. */
export class FutureSaveError extends Error {
  constructor(readonly version: number, readonly target: number) {
    super(
      `Save version ${version} is newer than this build's SAVE_VERSION ${target}.`,
    );
    this.name = 'FutureSaveError';
  }
}

/** Thrown when no migration is registered for a needed step. */
export class MissingMigrationError extends Error {
  constructor(readonly from: number) {
    super(`No migration registered for save version ${from} → ${from + 1}.`);
    this.name = 'MissingMigrationError';
  }
}

/**
 * The migration chain, ordered by `from` ascending. Each entry steps
 * the save shape forward by exactly one version. The runner enforces
 * the chain contract (no gaps, no jumps).
 *
 * The `data` parameter is typed as `unknown` because each migration
 * sees the *previous* version's shape, which is by definition a stale
 * type. Use light defensive casts inside the migration body; let the
 * test suite (`__tests__/saveMigrations.test.ts`) prove the result.
 */
export const MIGRATIONS: readonly SaveMigration[] = [
  {
    from: 15,
    to: 16,
    migrate: (data, ctx) => {
      // v15 → v16 — Stage 6.3 added pacing state to the Director.
      const d = (data ?? {}) as { director?: { pacing?: unknown } };
      const director = d.director;
      if (!director || director.pacing !== undefined) {
        return data;
      }
      return {
        ...d,
        director: { ...director, pacing: createPacingState(ctx.savedAt) },
      };
    },
  },
  {
    from: 16,
    to: 17,
    migrate: (data) => {
      // v16 → v17 — Stage 6.4 added `bank.regulatoryHold` for the
      // Authority Notice scam.
      const d = (data ?? {}) as { bank?: { regulatoryHold?: unknown } };
      const bank = d.bank;
      if (!bank || bank.regulatoryHold !== undefined) {
        return data;
      }
      return { ...d, bank: { ...bank, regulatoryHold: null } };
    },
  },
  {
    from: 17,
    to: 18,
    migrate: (data) => {
      // v17 → v18 — Stage 6.5a added top-level `cloutTakeover` for the
      // Golden Giveaway scam.
      const d = (data ?? {}) as { cloutTakeover?: unknown };
      if (d.cloutTakeover !== undefined) {
        return data;
      }
      return { ...d, cloutTakeover: null };
    },
  },
  {
    from: 18,
    to: 19,
    migrate: (data) => {
      // v18 → v19 — Stage 6.5b added `bank.pendingWithdrawal` for the
      // Frozen Withdrawal scam.
      const d = (data ?? {}) as { bank?: { pendingWithdrawal?: unknown } };
      const bank = d.bank;
      if (!bank || bank.pendingWithdrawal !== undefined) {
        return data;
      }
      return { ...d, bank: { ...bank, pendingWithdrawal: null } };
    },
  },
];

/**
 * Runs the migration chain on an envelope, producing one that matches
 * `targetVersion`. Throws `TooOldSaveError`, `FutureSaveError`, or
 * `MissingMigrationError` on the boundary conditions documented at the
 * top of the file. Pure — does not mutate the input envelope.
 */
export function migrateSave<T = unknown>(
  envelope: SaveEnvelope,
  targetVersion: number = SAVE_VERSION,
): SaveEnvelope<T> {
  if (envelope.version === targetVersion) {
    return envelope as SaveEnvelope<T>;
  }
  if (envelope.version > targetVersion) {
    throw new FutureSaveError(envelope.version, targetVersion);
  }
  if (envelope.version < MIN_SUPPORTED_VERSION) {
    throw new TooOldSaveError(envelope.version);
  }

  const ctx: MigrationContext = { savedAt: envelope.savedAt };
  let data: unknown = envelope.data;
  for (let v = envelope.version; v < targetVersion; v++) {
    const step = MIGRATIONS.find((m) => m.from === v);
    if (!step) {
      throw new MissingMigrationError(v);
    }
    data = step.migrate(data, ctx);
  }

  return {
    version: targetVersion,
    savedAt: envelope.savedAt,
    data: data as T,
  };
}
