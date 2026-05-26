/**
 * news.test.ts — News feed helpers.
 */
import { describe, expect, it } from '@jest/globals';
import { createStartingNews } from '../src/data/news';
import {
  filterByCategory,
  markNewsRead,
  unreadNewsCount,
} from '../src/engine/news';

describe('news engine', () => {
  const articles = createStartingNews(1_000_000);

  it('seed data includes all categories', () => {
    const categories = new Set(articles.map((a) => a.category));
    expect(categories.has('Market')).toBe(true);
    expect(categories.has('Scams')).toBe(true);
    expect(categories.has('Culture')).toBe(true);
    expect(categories.has('Regulation')).toBe(true);
  });

  it('filterByCategory returns only matching stories', () => {
    const scams = filterByCategory(articles, 'Scams');
    expect(scams.every((a) => a.category === 'Scams')).toBe(true);
    expect(scams.length).toBeGreaterThan(0);
  });

  it('unreadNewsCount and markNewsRead track read state', () => {
    const read = markNewsRead([], articles[0]!.id);
    expect(unreadNewsCount(articles, new Set(read))).toBe(articles.length - 1);
    const again = markNewsRead(read, articles[0]!.id);
    expect(again).toHaveLength(1);
  });
});
