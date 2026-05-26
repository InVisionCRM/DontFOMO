/**
 * scamPacing.test.ts — Stage 6.3 pacing engine + player-skill model.
 * ------------------------------------------------------------------
 * Pure-engine tests for the pressure-budget + skill primitives. The
 * Director's integration with these primitives — i.e. that
 * `tickDirector` calls `recordResolution` on every transition — is
 * covered by the additions to `scamDirector.test.ts`.
 */
import { describe, expect, it } from '@jest/globals';
import { DAY_MS } from '../src/engine/time/clock';
import { createRandom } from '../src/engine/market';
import {
  CLIPBOARD_SCAM_ID,
  PACING_DEFAULTS,
  SCAM_CATALOG,
  canArmProactive,
  canArmReactive,
  computePlayerSkill,
  createDirectorState,
  createPacingState,
  defaultSeverityFor,
  difficultyBandFor,
  proactiveCapFor,
  recordResolution,
  tickDirector,
  type DirectorGameSnapshot,
  type DirectorState,
  type PlayerSkill,
  type ResolutionRecord,
  type ScamEventDef,
} from '../src/engine/scam-director';
import type { ClipboardEntry } from '../src/engine/clipboard';

const seq = (seed: number) => createRandom(seed);

const skillOf = (rating: number, sampleSize = PACING_DEFAULTS.skillSampleSize): PlayerSkill => ({
  catchRate: rating,
  rating,
  sampleSize,
});

const rec = (
  resolvedAt: number,
  caught: boolean,
  severity: ResolutionRecord['severity'] = 'minor',
  id = `r-${resolvedAt}`,
): ResolutionRecord => ({
  instanceId: id,
  defId: CLIPBOARD_SCAM_ID,
  resolvedAt,
  caught,
  severity,
});

describe('createPacingState', () => {
  it('anchors the cooldown to `now` and starts with no resolutions', () => {
    const pacing = createPacingState(5_000);
    expect(pacing.cooldownUntil).toBe(5_000);
    expect(pacing.recentResolutions).toEqual([]);
  });
});

describe('recordResolution', () => {
  it('extends the cooldown by the minimum after a non-severe resolution', () => {
    const pacing = createPacingState(1_000);
    const next = recordResolution(pacing, rec(1_000, true, 'minor'), 1_000);
    const expected = 1_000 + PACING_DEFAULTS.minCooldownDays * DAY_MS;
    expect(next.cooldownUntil).toBe(expected);
    expect(next.recentResolutions).toHaveLength(1);
  });

  it('extends the cooldown by the severe value after a severe resolution', () => {
    const pacing = createPacingState(1_000);
    const next = recordResolution(pacing, rec(1_000, false, 'severe'), 1_000);
    const expected = 1_000 + PACING_DEFAULTS.severeCooldownDays * DAY_MS;
    expect(next.cooldownUntil).toBe(expected);
  });

  it('never shortens an already-longer cooldown', () => {
    let pacing = createPacingState(1_000);
    pacing = recordResolution(pacing, rec(1_000, false, 'severe'), 1_000);
    const longCooldown = pacing.cooldownUntil;
    pacing = recordResolution(pacing, rec(1_500, true, 'minor'), 1_500);
    // minor extension from 1_500 is less than the severe extension from 1_000
    expect(pacing.cooldownUntil).toBe(longCooldown);
  });

  it('prunes resolutions older than the rolling window', () => {
    const old = rec(0, true, 'minor', 'old');
    const fresh = rec(10 * DAY_MS, false, 'minor', 'fresh');
    let pacing = createPacingState(0);
    pacing = { ...pacing, recentResolutions: [old] };
    const now = 10 * DAY_MS + 100;
    pacing = recordResolution(pacing, fresh, now);
    expect(pacing.recentResolutions.map((r) => r.instanceId)).toEqual(['fresh']);
  });
});

describe('computePlayerSkill', () => {
  const stateWith = (records: ResolutionRecord[]): DirectorState => ({
    ...createDirectorState(0),
    pacing: { cooldownUntil: 0, recentResolutions: records },
  });

  it('returns a zero rating with no resolutions yet', () => {
    expect(computePlayerSkill(stateWith([]))).toEqual({
      catchRate: 0,
      rating: 0,
      sampleSize: 0,
    });
  });

  it('weights a single catch by sample-size confidence (no auto-promotion)', () => {
    const skill = computePlayerSkill(stateWith([rec(0, true)]));
    expect(skill.catchRate).toBe(1);
    expect(skill.sampleSize).toBe(1);
    // confidence = 1/10 → rating = 1 * 0.1
    expect(skill.rating).toBeCloseTo(1 / PACING_DEFAULTS.skillSampleSize, 5);
  });

  it('reaches the catch-rate ceiling only at the full sample size', () => {
    const records = Array.from({ length: PACING_DEFAULTS.skillSampleSize }, (_, i) =>
      rec(i, true),
    );
    const skill = computePlayerSkill(stateWith(records));
    expect(skill.rating).toBe(1);
  });

  it('uses only the most recent N resolutions when the window has more', () => {
    const extra = Array.from(
      { length: PACING_DEFAULTS.skillSampleSize + 2 },
      (_, i) => rec(i, i < 2),
    );
    // Two earliest are caught; the most-recent N are all not-caught.
    const skill = computePlayerSkill(stateWith(extra));
    expect(skill.catchRate).toBe(0);
    expect(skill.rating).toBe(0);
  });
});

describe('difficultyBandFor', () => {
  it('returns the newbie band below the newbie threshold', () => {
    expect(difficultyBandFor(skillOf(0))).toEqual({ min: 1, max: 3 });
    expect(difficultyBandFor(skillOf(PACING_DEFAULTS.newbieMax - 0.01))).toEqual({
      min: 1,
      max: 3,
    });
  });

  it('returns the middle band between thresholds', () => {
    expect(difficultyBandFor(skillOf(0.5))).toEqual({ min: 2, max: 4 });
  });

  it('returns the sharp band at and above the sharp threshold', () => {
    expect(difficultyBandFor(skillOf(PACING_DEFAULTS.sharpMin))).toEqual({
      min: 3,
      max: 5,
    });
    expect(difficultyBandFor(skillOf(1))).toEqual({ min: 3, max: 5 });
  });

  it('bands overlap so adjacent bands share at least one difficulty', () => {
    const newbie = difficultyBandFor(skillOf(0));
    const middle = difficultyBandFor(skillOf(0.5));
    const sharp = difficultyBandFor(skillOf(1));
    expect(newbie.max).toBeGreaterThanOrEqual(middle.min);
    expect(middle.max).toBeGreaterThanOrEqual(sharp.min);
  });
});

describe('proactiveCapFor', () => {
  it('returns the newbie cap at rating 0', () => {
    expect(proactiveCapFor(skillOf(0))).toBe(PACING_DEFAULTS.maxScamsNewbie);
  });
  it('returns the sharp cap at rating 1', () => {
    expect(proactiveCapFor(skillOf(1))).toBe(PACING_DEFAULTS.maxScamsSharp);
  });
  it('interpolates monotonically between newbie and sharp', () => {
    const lo = proactiveCapFor(skillOf(0));
    const mid = proactiveCapFor(skillOf(0.5));
    const hi = proactiveCapFor(skillOf(1));
    expect(mid).toBeGreaterThanOrEqual(lo);
    expect(mid).toBeLessThanOrEqual(hi);
  });
});

describe('canArmReactive', () => {
  it('is permissive — never gates a player-driven arming', () => {
    const pacing = createPacingState(1_000);
    // Pretend the cooldown is in the far future.
    const blocked = { ...pacing, cooldownUntil: Number.MAX_SAFE_INTEGER };
    expect(canArmReactive(blocked, 2_000)).toBe(true);
  });
});

describe('canArmProactive', () => {
  it('is false while the cooldown is still running', () => {
    const pacing = recordResolution(
      createPacingState(1_000),
      rec(1_000, false, 'severe'),
      1_000,
    );
    expect(canArmProactive(pacing, skillOf(1), 1_500)).toBe(false);
  });

  it('is true once cooldown has passed and the window has room', () => {
    const pacing = recordResolution(
      createPacingState(1_000),
      rec(1_000, true, 'minor'),
      1_000,
    );
    const afterCooldown = pacing.cooldownUntil + 1;
    expect(canArmProactive(pacing, skillOf(1), afterCooldown)).toBe(true);
  });

  it('is false when the rolling-window cap is reached', () => {
    // Fill the sharp cap (`maxScamsSharp`) with already-resolved
    // scams, then check that a sharp player still cannot arm a new
    // one until something drops out of the window.
    let pacing = createPacingState(0);
    for (let i = 0; i < PACING_DEFAULTS.maxScamsSharp; i++) {
      pacing = recordResolution(pacing, rec(i, true, 'minor'), i);
    }
    // Push `now` past the cooldown but stay inside the window.
    const within = pacing.cooldownUntil + 1;
    expect(canArmProactive(pacing, skillOf(1), within)).toBe(false);
  });

  it('lets a newbie face exactly one scam per window, no more', () => {
    let pacing = createPacingState(0);
    pacing = recordResolution(pacing, rec(0, true, 'minor'), 0);
    // Past the cooldown but well within the 7-day window.
    const within = 4 * DAY_MS;
    expect(canArmProactive(pacing, skillOf(0), within)).toBe(false);
  });
});

describe('defaultSeverityFor', () => {
  const def = (difficulty: ScamEventDef['difficulty'], cap: ScamEventDef['maxSeverity']): ScamEventDef => ({
    id: 'fixture',
    name: 'Fixture',
    archetype: 'lockout',
    channels: ['bank'],
    difficulty,
    maxSeverity: cap,
    trigger: 'proactive',
    teaches: 'fixture',
  });

  it('maps difficulty bands to severities under the cap', () => {
    expect(defaultSeverityFor(def(1, 'severe'))).toBe('minor');
    expect(defaultSeverityFor(def(2, 'severe'))).toBe('minor');
    expect(defaultSeverityFor(def(3, 'severe'))).toBe('major');
    expect(defaultSeverityFor(def(4, 'severe'))).toBe('severe');
    expect(defaultSeverityFor(def(5, 'severe'))).toBe('severe');
  });

  it('clips the realised severity to the catalog cap', () => {
    expect(defaultSeverityFor(def(5, 'minor'))).toBe('minor');
    expect(defaultSeverityFor(def(4, 'major'))).toBe('major');
  });
});

// ----- Director integration -----
// One end-to-end test confirms pacing is wired into `tickDirector` —
// the broader Director suite owns arming/detonating/defusing.

const sensitiveClip = (): ClipboardEntry => ({
  id: 'sens-1',
  content: 'ocean forest velvet ranch puzzle copper drift maple signal harbor zebra orbit',
  copiedAt: 0,
  isSensitive: true,
  source: 'Recovery phrase',
});

const snapshot = (clipboard: ClipboardEntry[] = []): DirectorGameSnapshot => ({
  followers: 0,
  netWorth: 500,
  clipboard,
});

describe('tickDirector — pacing integration', () => {
  // Scoped to a Clipboard-only catalog so these tests stay focused on
  // the pacing wiring; cross-scam interactions (e.g. a same-tick
  // Authority Notice arming alongside the Clipboard arming) belong
  // in `authorityNotice.test.ts`.
  const clipboardOnly: ScamEventDef[] = SCAM_CATALOG.filter(
    (d) => d.id === CLIPBOARD_SCAM_ID,
  );

  it('records a resolution into pacing on defuse', () => {
    const armed = tickDirector(
      createDirectorState(1_000),
      snapshot([sensitiveClip()]),
      2_000,
      seq(1),
      clipboardOnly,
    );
    expect(armed.state.pacing.recentResolutions).toHaveLength(0);
    // Player deletes the entry → defuse on the next tick.
    const defused = tickDirector(
      armed.state,
      snapshot([]),
      3_000,
      seq(1),
      clipboardOnly,
    );
    expect(defused.state.pacing.recentResolutions).toHaveLength(1);
    expect(defused.state.pacing.recentResolutions[0]!.caught).toBe(true);
    // Clipboard-scam catalog entry's `maxSeverity` is `severe` and
    // its difficulty is 2 → defaultSeverityFor → `minor`. So the
    // cooldown extension is `minCooldownDays`.
    const expected = 3_000 + PACING_DEFAULTS.minCooldownDays * DAY_MS;
    expect(defused.state.pacing.cooldownUntil).toBe(expected);
  });

  it('records a resolution into pacing on detonation', () => {
    const armed = tickDirector(
      createDirectorState(1_000),
      snapshot([sensitiveClip()]),
      2_000,
      seq(1),
      clipboardOnly,
    );
    const detonatesAt = armed.state.instances[0]!.scheduledAt;
    const detonated = tickDirector(
      armed.state,
      snapshot([sensitiveClip()]),
      detonatesAt + 1,
      seq(1),
      clipboardOnly,
    );
    expect(detonated.state.pacing.recentResolutions).toHaveLength(1);
    expect(detonated.state.pacing.recentResolutions[0]!.caught).toBe(false);
  });

  it('preserves pacing state across a no-op same-tick call', () => {
    const state = createDirectorState(1_000);
    const next = tickDirector(state, snapshot(), 1_000, seq(1), clipboardOnly);
    expect(next.state.pacing).toBe(state.pacing);
  });

  it('does not record pacing entries for ticks with no resolutions', () => {
    const state = createDirectorState(1_000);
    const next = tickDirector(
      state,
      snapshot([sensitiveClip()]),
      2_000,
      seq(1),
      clipboardOnly,
    );
    // Arming a fresh instance is not a resolution.
    expect(next.state.pacing.recentResolutions).toEqual([]);
  });
});
