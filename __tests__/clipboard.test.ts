/**
 * clipboard.test.ts — unit tests for the Clipboard engine.
 * ------------------------------------------------------------------
 * Pure logic, no React Native — ts-jest harness.
 */
import { describe, expect, it } from '@jest/globals';
import {
  CLIPBOARD_HISTORY_CAP,
  addEntry,
  deleteEntry,
  findSensitive,
  readLatest,
  type ClipboardEntry,
} from '../src/engine/clipboard/clipboard';

const entry = (
  id: string,
  content: string = id,
  copiedAt: number = 1,
  isSensitive: boolean = false,
): ClipboardEntry => ({ id, content, copiedAt, isSensitive });

describe('addEntry', () => {
  it('prepends — newest first', () => {
    const after = addEntry([entry('a')], entry('b'));
    expect(after.map((e) => e.id)).toEqual(['b', 'a']);
  });
  it('is pure', () => {
    const before = [entry('a')];
    addEntry(before, entry('b'));
    expect(before).toEqual([entry('a')]);
  });
  it('caps history at CLIPBOARD_HISTORY_CAP', () => {
    let list: ClipboardEntry[] = [];
    for (let i = 0; i < CLIPBOARD_HISTORY_CAP + 5; i += 1) {
      list = addEntry(list, entry(`e${i}`));
    }
    expect(list).toHaveLength(CLIPBOARD_HISTORY_CAP);
    expect(list[0]?.id).toBe(`e${CLIPBOARD_HISTORY_CAP + 4}`);
  });
});

describe('deleteEntry', () => {
  it('removes by id', () => {
    const before = [entry('a'), entry('b'), entry('c')];
    expect(deleteEntry(before, 'b').map((e) => e.id)).toEqual(['a', 'c']);
  });
  it('returns the same shape on an unknown id', () => {
    const before = [entry('a')];
    expect(deleteEntry(before, 'nope')).toEqual(before);
  });
  it('is pure', () => {
    const before = [entry('a')];
    deleteEntry(before, 'a');
    expect(before).toEqual([entry('a')]);
  });
});

describe('findSensitive', () => {
  it('returns the first sensitive entry', () => {
    const list = [
      entry('a'),
      entry('b', 'b', 1, true),
      entry('c', 'c', 1, true),
    ];
    expect(findSensitive(list)?.id).toBe('b');
  });
  it('returns null when nothing is sensitive', () => {
    expect(findSensitive([entry('a'), entry('b')])).toBeNull();
  });
  it('returns null on an empty list', () => {
    expect(findSensitive([])).toBeNull();
  });
});

describe('readLatest', () => {
  it('returns the head', () => {
    expect(readLatest([entry('a'), entry('b')])?.id).toBe('a');
  });
  it('returns null on an empty list', () => {
    expect(readLatest([])).toBeNull();
  });
});
