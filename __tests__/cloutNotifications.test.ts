/**
 * cloutNotifications.test.ts — shape checks for the seed feed that
 * powers the read-only v1 Notifications tab inside the Clout app.
 *
 * The data is pure presentational content, but a few invariants matter:
 *   - IDs are unique (FlatList keyExtractor depends on it).
 *   - Every entry has a non-empty bold segment (the row would render
 *     blank without it).
 *   - Icon colours are 7-char hex codes (the SVG stroke prop expects
 *     a valid colour string).
 *   - The mockup-anchored count holds (mockup ships 5 entries).
 */
import { describe, expect, it } from '@jest/globals';
import {
  CLOUT_NOTIFICATIONS_SEED,
  type CloutNotifKind,
} from '../src/data/cloutNotifications';

describe('CLOUT_NOTIFICATIONS_SEED', () => {
  it('matches the mockup-anchored count', () => {
    expect(CLOUT_NOTIFICATIONS_SEED.length).toBe(5);
  });

  it('has unique IDs', () => {
    const ids = CLOUT_NOTIFICATIONS_SEED.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a non-empty bold segment on every entry', () => {
    for (const n of CLOUT_NOTIFICATIONS_SEED) {
      expect(n.bold.length).toBeGreaterThan(0);
    }
  });

  it('uses 7-char hex icon colours', () => {
    for (const n of CLOUT_NOTIFICATIONS_SEED) {
      expect(n.iconColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('covers every documented kind at least once', () => {
    const kinds = new Set<CloutNotifKind>(
      CLOUT_NOTIFICATIONS_SEED.map((n) => n.kind),
    );
    expect(kinds.has('follow')).toBe(true);
    expect(kinds.has('like')).toBe(true);
    expect(kinds.has('repost')).toBe(true);
    expect(kinds.has('mention')).toBe(true);
    expect(kinds.has('streak')).toBe(true);
  });
});
