/**
 * scamDirector.test.ts — Director skeleton + Clipboard Scam.
 * ------------------------------------------------------------------
 * Pure-engine tests. Pacing + per-scam cooldowns + the player-skill
 * model land in 6.3 and get their own suites; multi-scam coverage
 * arrives with 6.4 / 6.5.
 */
import { describe, expect, it } from '@jest/globals';
import { DAY_MS } from '../src/engine/time/clock';
import { createRandom } from '../src/engine/market';
import {
  CLIPBOARD_DETONATION_MAX_DAYS,
  CLIPBOARD_DETONATION_MIN_DAYS,
  CLIPBOARD_SCAM_ID,
  SCAM_CATALOG,
  createDirectorState,
  findScamDef,
  tickDirector,
  type DirectorGameSnapshot,
  type ScamEventDef,
} from '../src/engine/scam-director';
import type { ClipboardEntry } from '../src/engine/clipboard';

const FIXED_RAND = createRandom(42);
const seq = (seed: number) => createRandom(seed);
/**
 * These suites focus on the Clipboard reactive flow; cross-scam
 * interactions live in `authorityNotice.test.ts`. Scoping `tickDirector`
 * to a Clipboard-only catalog isolates the unit under test from
 * Stage-6.4+ proactive-picker side effects.
 */
const CLIPBOARD_ONLY = SCAM_CATALOG.filter((d) => d.id === CLIPBOARD_SCAM_ID);

const empty = (): DirectorGameSnapshot => ({
  followers: 0,
  netWorth: 500,
  clipboard: [],
});
const withClip = (entries: ClipboardEntry[]): DirectorGameSnapshot => ({
  followers: 0,
  netWorth: 500,
  clipboard: entries,
});

const sensitive = (id: string = 'sens-1'): ClipboardEntry => ({
  id,
  content: 'ocean forest velvet ranch puzzle copper drift maple signal harbor zebra orbit',
  copiedAt: 0,
  isSensitive: true,
  source: 'Recovery phrase',
});

describe('createDirectorState', () => {
  it('produces a fresh, empty state anchored at `now`', () => {
    const state = createDirectorState(1_000);
    expect(state.instances).toEqual([]);
    expect(state.lastTickAt).toBe(1_000);
    expect(state.totalArmed).toBe(0);
    expect(state.totalCaught).toBe(0);
    expect(state.totalFellFor).toBe(0);
  });
});

describe('tickDirector — same-time tick is a no-op', () => {
  it('returns the same state reference and no effects', () => {
    const state = createDirectorState(1_000);
    const result = tickDirector(state, empty(), 1_000, FIXED_RAND, CLIPBOARD_ONLY);
    expect(result.state).toBe(state);
    expect(result.effects).toEqual([]);
  });
});

describe('tickDirector — Clipboard Scam: arming', () => {
  it('arms when a sensitive entry is present and no active instance exists', () => {
    const state = createDirectorState(1_000);
    const { state: next, effects } = tickDirector(
      state,
      withClip([sensitive()]),
      2_000,
      seq(1),
      CLIPBOARD_ONLY,
    );
    expect(next.totalArmed).toBe(1);
    expect(next.instances).toHaveLength(1);
    const inst = next.instances[0]!;
    expect(inst.defId).toBe(CLIPBOARD_SCAM_ID);
    expect(inst.state).toBe('armed');
    expect(inst.armedAt).toBe(2_000);
    expect(inst.scheduledAt).toBeGreaterThanOrEqual(
      2_000 + CLIPBOARD_DETONATION_MIN_DAYS * DAY_MS,
    );
    expect(inst.scheduledAt).toBeLessThanOrEqual(
      2_000 + CLIPBOARD_DETONATION_MAX_DAYS * DAY_MS,
    );
    expect(effects.some((e) => e.type === 'clipboard-scam-armed')).toBe(true);
  });

  it('does not arm a second instance while one is in flight', () => {
    const state = createDirectorState(1_000);
    const after1 = tickDirector(state, withClip([sensitive()]), 2_000, seq(1), CLIPBOARD_ONLY);
    const after2 = tickDirector(after1.state, withClip([sensitive()]), 3_000, seq(2), CLIPBOARD_ONLY);
    expect(after2.state.instances).toHaveLength(1);
    expect(after2.state.totalArmed).toBe(1);
    expect(after2.effects).toEqual([]);
  });

  it('does not arm when the clipboard has no sensitive entry', () => {
    const state = createDirectorState(1_000);
    const { state: next, effects } = tickDirector(state, empty(), 2_000, seq(1), CLIPBOARD_ONLY);
    expect(next.instances).toEqual([]);
    expect(next.totalArmed).toBe(0);
    expect(effects).toEqual([]);
  });
});

describe('tickDirector — Clipboard Scam: detonation', () => {
  it('detonates once now passes the scheduled time', () => {
    const armed = tickDirector(
      createDirectorState(1_000),
      withClip([sensitive()]),
      2_000,
      seq(1),
      CLIPBOARD_ONLY,
    );
    const detonatesAt = armed.state.instances[0]!.scheduledAt;
    const result = tickDirector(
      armed.state,
      withClip([sensitive()]),
      detonatesAt + 1,
      seq(1),
      CLIPBOARD_ONLY,
    );
    expect(result.state.instances[0]!.state).toBe('resolved');
    expect(result.state.instances[0]!.caught).toBe(false);
    expect(result.state.totalFellFor).toBe(1);
    expect(
      result.effects.some((e) => e.type === 'clipboard-scam-detonated'),
    ).toBe(true);
  });

  it('does not detonate before the scheduled time', () => {
    const armed = tickDirector(
      createDirectorState(1_000),
      withClip([sensitive()]),
      2_000,
      seq(1),
      CLIPBOARD_ONLY,
    );
    const detonatesAt = armed.state.instances[0]!.scheduledAt;
    const result = tickDirector(
      armed.state,
      withClip([sensitive()]),
      detonatesAt - 1,
      seq(1),
      CLIPBOARD_ONLY,
    );
    expect(result.state.instances[0]!.state).toBe('armed');
    expect(result.state.totalFellFor).toBe(0);
  });
});

describe('tickDirector — Clipboard Scam: defuse', () => {
  it('defuses when the sensitive entry is removed before detonation', () => {
    const armed = tickDirector(
      createDirectorState(1_000),
      withClip([sensitive()]),
      2_000,
      seq(1),
      CLIPBOARD_ONLY,
    );
    // Clipboard is now empty — player deleted the entry.
    const result = tickDirector(armed.state, empty(), 3_000, seq(1), CLIPBOARD_ONLY);
    expect(result.state.instances[0]!.state).toBe('resolved');
    expect(result.state.instances[0]!.caught).toBe(true);
    expect(result.state.totalCaught).toBe(1);
    expect(
      result.effects.some((e) => e.type === 'clipboard-scam-defused'),
    ).toBe(true);
  });

  it('defuse beats detonation if both fire on the same tick', () => {
    const armed = tickDirector(
      createDirectorState(1_000),
      withClip([sensitive()]),
      2_000,
      seq(1),
      CLIPBOARD_ONLY,
    );
    const detonatesAt = armed.state.instances[0]!.scheduledAt;
    // Clipboard empty AND time has passed — player just barely deleted in time.
    const result = tickDirector(armed.state, empty(), detonatesAt + 1, seq(1), CLIPBOARD_ONLY);
    expect(result.state.instances[0]!.caught).toBe(true);
    expect(result.state.totalCaught).toBe(1);
    expect(result.state.totalFellFor).toBe(0);
  });
});

describe('tickDirector — purity', () => {
  it('does not mutate the input state', () => {
    const state = createDirectorState(1_000);
    tickDirector(state, withClip([sensitive()]), 5_000, seq(1), CLIPBOARD_ONLY);
    expect(state.instances).toEqual([]);
    expect(state.lastTickAt).toBe(1_000);
  });
});

describe('catalog', () => {
  it('SCAM_CATALOG includes the Clipboard Scam', () => {
    const entry = SCAM_CATALOG.find((d) => d.id === CLIPBOARD_SCAM_ID);
    expect(entry).toBeDefined();
    expect(entry!.archetype).toBe('slow-burn');
    expect(entry!.channels).toContain('clipboard');
    expect(entry!.trigger).toBe('reactive');
  });

  it('SCAM_CATALOG includes the Authority Notice (proactive lockout)', () => {
    const entry = SCAM_CATALOG.find((d) => d.id === 'authority-notice');
    expect(entry).toBeDefined();
    expect(entry!.archetype).toBe('lockout');
    expect(entry!.channels).toContain('bank');
    expect(entry!.channels).toContain('mail');
    expect(entry!.trigger).toBe('proactive');
  });

  it('findScamDef returns undefined for an unknown id', () => {
    expect(findScamDef('does-not-exist')).toBeUndefined();
  });

  it('findScamDef accepts a custom catalog for testing', () => {
    const custom: ScamEventDef[] = [
      {
        id: 'fake-event',
        name: 'Fake Event',
        archetype: 'lockout',
        channels: ['bank'],
        difficulty: 1,
        maxSeverity: 'minor',
        trigger: 'proactive',
        teaches: 'Fake event teaches nothing — it is a test fixture.',
      },
    ];
    expect(findScamDef('fake-event', custom)?.name).toBe('Fake Event');
    expect(findScamDef('nope', custom)).toBeUndefined();
  });
});
