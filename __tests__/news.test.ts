/**
 * news.test.ts — unit tests for the News data layer.
 * ------------------------------------------------------------------
 * Covers the pure helpers used by the News screen: the category-chip
 * filter and the feed-style relative timestamp formatter.
 */
import { describe, expect, it } from '@jest/globals';
import {
  NEWS_CATEGORIES,
  createStartingNews,
  filterHeadlines,
  formatRelativeTimestamp,
  type NewsCategory,
} from '../src/data/news';

const NOW = new Date(2026, 4, 22, 14, 30, 0, 0).getTime();

describe('formatRelativeTimestamp', () => {
  it('renders sub-minute deltas as "Just now"', () => {
    expect(formatRelativeTimestamp(NOW - 5_000, NOW)).toBe('Just now');
    expect(formatRelativeTimestamp(NOW - 59_000, NOW)).toBe('Just now');
  });

  it('renders sub-hour deltas in whole minutes', () => {
    expect(formatRelativeTimestamp(NOW - 60_000, NOW)).toBe('1m ago');
    expect(formatRelativeTimestamp(NOW - 18 * 60_000, NOW)).toBe('18m ago');
    expect(formatRelativeTimestamp(NOW - 59 * 60_000, NOW)).toBe('59m ago');
  });

  it('renders sub-day deltas in whole hours', () => {
    expect(formatRelativeTimestamp(NOW - 60 * 60_000, NOW)).toBe('1h ago');
    expect(formatRelativeTimestamp(NOW - 5 * 3_600_000, NOW)).toBe('5h ago');
    expect(formatRelativeTimestamp(NOW - 23 * 3_600_000, NOW)).toBe('23h ago');
  });

  it('renders multi-day deltas in whole days', () => {
    expect(formatRelativeTimestamp(NOW - 24 * 3_600_000, NOW)).toBe('1d ago');
    expect(formatRelativeTimestamp(NOW - 3 * 86_400_000, NOW)).toBe('3d ago');
  });

  it('clamps future timestamps to "Just now" instead of negatives', () => {
    expect(formatRelativeTimestamp(NOW + 60_000, NOW)).toBe('Just now');
  });
});

describe('filterHeadlines', () => {
  const headlines = createStartingNews(NOW);

  it('returns every headline when category is null (the "All" chip)', () => {
    expect(filterHeadlines(headlines, null)).toEqual(headlines);
  });

  it('returns only headlines matching the selected category', () => {
    for (const category of NEWS_CATEGORIES) {
      const filtered = filterHeadlines(headlines, category);
      expect(filtered.length).toBeGreaterThan(0);
      for (const headline of filtered) {
        expect(headline.category).toBe(category);
      }
    }
  });

  it('returns an empty list for a category with no matches', () => {
    const orphan = 'orphan' as NewsCategory;
    expect(filterHeadlines(headlines, orphan)).toEqual([]);
  });
});

describe('createStartingNews', () => {
  it('covers every advertised category at least once', () => {
    const headlines = createStartingNews(NOW);
    for (const category of NEWS_CATEGORIES) {
      expect(headlines.some((h) => h.category === category)).toBe(true);
    }
  });

  it('produces strictly past timestamps relative to the given now', () => {
    const headlines = createStartingNews(NOW);
    for (const headline of headlines) {
      expect(headline.publishedAt).toBeLessThan(NOW);
    }
  });

  it('assigns unique ids', () => {
    const ids = createStartingNews(NOW).map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
