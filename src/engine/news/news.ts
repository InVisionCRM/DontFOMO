/**
 * news.ts — News feed helpers (Stage 6).
 * ------------------------------------------------------------------
 * Pure TypeScript. Articles live in `src/data/news.ts`; the store
 * tracks which ids the player has opened.
 */
export type NewsCategory = 'Market' | 'Scams' | 'Culture' | 'Regulation';

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  category: NewsCategory;
  /** Epoch ms when the story “published” in-game. */
  publishedAt: number;
  source: string;
}

export const NEWS_CATEGORIES: readonly NewsCategory[] = [
  'Market',
  'Scams',
  'Culture',
  'Regulation',
];

export function unreadNewsCount(
  articles: readonly NewsArticle[],
  readIds: ReadonlySet<string>,
): number {
  return articles.filter((a) => !readIds.has(a.id)).length;
}

export function filterByCategory(
  articles: readonly NewsArticle[],
  category: NewsCategory | 'All',
): NewsArticle[] {
  if (category === 'All') return [...articles];
  return articles.filter((a) => a.category === category);
}

export function markNewsRead(
  readIds: readonly string[],
  articleId: string,
): string[] {
  if (readIds.includes(articleId)) return [...readIds];
  return [articleId, ...readIds];
}
