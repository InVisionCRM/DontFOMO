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
 * peakNetWorth + lastUnemploymentCheckAt; v8 added the Mail inbox;
 * v9 added the Tunnel chat list; v10 added the Messages threads;
 * v11 added Clout (bio + feed + dailyPost) + the Diamonds balance;
 * v12 added the Market (owned assets) — completes peakNetWorth;
 * v13 added the Clipboard history + the onboarding slice (handle and
 *      bio are now set in onboarding rather than hard-coded defaults);
 * v14 added the Scam Director slice (live instances + lifetime
 *      counters; the first scam in the catalogue, the Clipboard
 *      Scam, can now arm + detonate + defuse).
 * v15 added the Rug Radar minigame slice (daily cap + live session
 *      + lifetime totals).
 * v16 added the Scam Director pacing slice (6.3 — pressure budget +
 *      cooldown + rolling-window resolutions feeding the player-skill
 *      derivation). Saves from v15 backfill `director.pacing` to a
 *      fresh `createPacingState(now)` via the defensive default in
 *      the store's `loadSaved`.
 * v17 added `bank.regulatoryHold` for the Authority Notice scam
 *      (6.4 — the Director's first proactive Lockout). Saves from
 *      v16 backfill the field to `null` via the defensive default.
 * v18 added `cloutTakeover` for the Golden Giveaway scam (6.5a — the
 *      Director's first proactive Inbound Lure on Clout). Saves from
 *      v17 backfill the field to `null` via the defensive default.
 * v19 added `bank.pendingWithdrawal` for the Frozen Withdrawal scam
 *      (6.5b — Decision Point). Saves from v18 backfill to `null`.
 */
export const SAVE_VERSION = 19;

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
