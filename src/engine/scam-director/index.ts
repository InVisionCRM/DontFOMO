/**
 * src/engine/scam-director — the adaptive scam engine.
 *
 * Stage 6's headline subsystem (Migration Plan §4). Current layout:
 *   - `clipboardScan` — the foundational Slow Burn primitive (2.1).
 *   - `types`         — archetypes / channels / state machine (6.1).
 *   - `catalog`       — the data-driven scam catalogue (6.1).
 *   - `director`      — `createDirectorState` + the stateless tick (6.1).
 *   - `pacing`        — pressure budget + player-skill model (6.3).
 *
 * Pure TypeScript. See CLAUDE.md §5.
 */
export * from './clipboardScan';
export * from './types';
export * from './catalog';
export * from './director';
export * from './pacing';
export * from './picker';
