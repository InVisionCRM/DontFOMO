/**
 * validate.ts — save-shape validator.
 * ------------------------------------------------------------------
 * `migrateSave` walks an envelope to the current `SAVE_VERSION`, but
 * it cannot tell whether the input was structurally sound to begin
 * with — a corrupt JSON blob from `AsyncStorage` (truncated write,
 * external edit, downgraded build that wrote a partial state) might
 * be missing core identity fields entirely.
 *
 * `validateSaveData` runs after migration and before the store sees
 * the data, throwing `CorruptSaveError` if any of the player's
 * non-defaultable fields is missing or the wrong shape:
 *
 *   - `clock` { startedAt, lastSeenAt, now }   — drives every system
 *   - `cash` (finite number)                   — player identity
 *   - `followers` (finite number)              — player identity
 *   - `handle` (string)                        — player identity
 *   - `market.tokens` (object)                 — the simulation root
 *   - `bank` (object)                          — spread by the store
 *   - `cashSwipe` (object)                     — held verbatim
 *
 * Optional or list-shaped fields (mail, tunnel, messages, holdings,
 * playerTokens, assets, clipboard, etc.) are not checked here — the
 * store's `loadSaved` has defensive `?? defaults` for those, and
 * silently inserting fresh values for a missing list is the right
 * call. A missing scalar identity field is not — it would silently
 * restart the player at $1000 with @newhandle, which is worse than
 * starting fresh with an explicit warning.
 *
 * Pure module — no React, no React Native, no I/O.
 */
import type { SavedGame } from '../state/store';

/** Thrown when a save blob is structurally invalid after migration. */
export class CorruptSaveError extends Error {
  constructor(readonly reason: string) {
    super(`Save data is corrupt: ${reason}.`);
    this.name = 'CorruptSaveError';
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Validates the migrated `data` blob and returns it typed as
 * `SavedGame`. Throws `CorruptSaveError` on the first structural
 * problem so the caller (`useGameLoop`) can warn + start fresh.
 *
 * Field-by-field rather than a single schema check so the error
 * message names the failing field — useful in the console when
 * diagnosing a malformed save on a real device.
 */
export function validateSaveData(data: unknown): SavedGame {
  if (!isPlainObject(data)) {
    throw new CorruptSaveError(
      `expected an object, got ${data === null ? 'null' : typeof data}`,
    );
  }

  const clock = data.clock;
  if (!isPlainObject(clock)) {
    throw new CorruptSaveError('clock is missing or not an object');
  }
  if (!isFiniteNumber(clock.startedAt)) {
    throw new CorruptSaveError('clock.startedAt is not a finite number');
  }
  if (!isFiniteNumber(clock.lastSeenAt)) {
    throw new CorruptSaveError('clock.lastSeenAt is not a finite number');
  }
  if (!isFiniteNumber(clock.now)) {
    throw new CorruptSaveError('clock.now is not a finite number');
  }

  if (!isFiniteNumber(data.cash)) {
    throw new CorruptSaveError('cash is not a finite number');
  }
  if (!isFiniteNumber(data.followers)) {
    throw new CorruptSaveError('followers is not a finite number');
  }
  if (typeof data.handle !== 'string') {
    throw new CorruptSaveError('handle is not a string');
  }

  const market = data.market;
  if (!isPlainObject(market)) {
    throw new CorruptSaveError('market is missing or not an object');
  }
  if (!isPlainObject(market.tokens)) {
    throw new CorruptSaveError('market.tokens is missing or not an object');
  }

  if (!isPlainObject(data.bank)) {
    throw new CorruptSaveError('bank is missing or not an object');
  }
  if (!isPlainObject(data.cashSwipe)) {
    throw new CorruptSaveError('cashSwipe is missing or not an object');
  }

  return data as unknown as SavedGame;
}
