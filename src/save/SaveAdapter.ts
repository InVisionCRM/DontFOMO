/**
 * SaveAdapter.ts — the persistence boundary
 * ------------------------------------------------------------------
 * Game code never talks to storage directly. It talks to a SaveAdapter.
 *
 * v1 ships `LocalSaveAdapter` (on-device, MMKV). A `CloudSaveAdapter`
 * can be added later — for the leaderboard — without touching any game
 * code, because both implement this same interface.
 *
 * Saves are VERSIONED. `SAVE_VERSION` is the current schema number.
 * When the save shape changes, bump it and add a migration so old
 * saves on a player's phone still load. See CLAUDE.md §5.
 *
 * Pure types and constants — no React, no React Native imports.
 */

/**
 * Current save-schema version. Bump on any breaking shape change.
 * v2 added the market; v3 added holdings; v4 added player tokens;
 * v5 added the Bank (bills + loans); v6 added CashSwipe; v7 added
 * peakNetWorth + lastUnemploymentCheckAt.
 */
export const SAVE_VERSION = 7;

/**
 * The envelope every save is wrapped in. `version` lets the loader
 * detect old saves and run migrations. `data` is the game state blob —
 * typed loosely here because the engine owns its real shape; the
 * adapter only stores and retrieves bytes, it never inspects them.
 */
export interface SaveEnvelope<T = unknown> {
  /** Schema version this blob was written with. */
  version: number;
  /** Unix epoch ms when the save was written. */
  savedAt: number;
  /** The game-state payload. */
  data: T;
}

/**
 * The persistence contract. Implementations:
 *  - `LocalSaveAdapter`  — MMKV, on-device (v1).
 *  - `CloudSaveAdapter`  — remote, for the leaderboard (later).
 *
 * Every method is async so a cloud implementation drops in unchanged.
 */
export interface SaveAdapter {
  /**
   * Load the saved game. Resolves `null` when no save exists (a fresh
   * install). Must throw on a real read failure — never swallow it.
   */
  load<T = unknown>(): Promise<SaveEnvelope<T> | null>;

  /** Write the game state, wrapped in a fresh envelope. */
  save<T = unknown>(data: T): Promise<void>;

  /** Delete the save entirely (used by "reset game"). */
  clear(): Promise<void>;
}

/** A save migration: transforms one schema version up to the next. */
export interface SaveMigration {
  /** The version this migration upgrades FROM. */
  from: number;
  /** The version this migration produces. */
  to: number;
  /** Pure transform. Receives the old `data`, returns the new `data`. */
  migrate: (data: unknown) => unknown;
}
