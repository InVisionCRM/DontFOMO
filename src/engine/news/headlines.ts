/**
 * headlines.ts — News app pure logic.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * The News app surfaces curated headlines (seed data) plus live
 * "breaking" lines from verified Clout authors — same world, no
 * separate mock layer.
 */
import type { Tweet } from '../clout';

export type NewsCategory = 'markets' | 'defi' | 'culture' | 'breaking';

/** One row in the News feed. */
export interface NewsHeadline {
  id: string;
  outlet: string;
  title: string;
  summary: string;
  publishedAt: number;
  category: NewsCategory;
  /** Verified outlet badge (Crypto Desk, wire services, etc.). */
  verified?: boolean;
}

const TITLE_MAX = 120;

/** Trim a Clout tweet body into a headline-sized title. */
export function tweetToHeadlineTitle(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= TITLE_MAX) return oneLine;
  return `${oneLine.slice(0, TITLE_MAX - 1).trim()}…`;
}

/** Map verified Clout posts into News "breaking" rows. */
export function headlinesFromVerifiedTweets(
  feed: readonly Tweet[],
): NewsHeadline[] {
  const out: NewsHeadline[] = [];
  for (const t of feed) {
    if (!t.author.verified) continue;
    out.push({
      id: `clout-${t.id}`,
      outlet: t.author.name,
      title: tweetToHeadlineTitle(t.text),
      summary: t.text,
      publishedAt: t.sentAt,
      category: 'breaking',
      verified: true,
    });
  }
  return out;
}

/**
 * Merge seed headlines with live Clout breaking lines, newest first.
 * De-duplicates by id; caps length for a tight mobile feed.
 */
export function buildNewsFeed(
  seed: readonly NewsHeadline[],
  cloutFeed: readonly Tweet[],
  limit = 12,
): NewsHeadline[] {
  const seen = new Set<string>();
  const merged: NewsHeadline[] = [];
  const push = (h: NewsHeadline): void => {
    if (seen.has(h.id)) return;
    seen.add(h.id);
    merged.push(h);
  };
  for (const h of headlinesFromVerifiedTweets(cloutFeed)) push(h);
  for (const h of seed) push(h);
  merged.sort((a, b) => b.publishedAt - a.publishedAt);
  return merged.slice(0, limit);
}

/** Human label for the category chip. */
export function categoryLabel(category: NewsCategory): string {
  switch (category) {
    case 'markets':
      return 'Markets';
    case 'defi':
      return 'DeFi';
    case 'culture':
      return 'Culture';
    case 'breaking':
      return 'Breaking';
  }
}
