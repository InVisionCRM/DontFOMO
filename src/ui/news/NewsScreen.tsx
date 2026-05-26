/**
 * NewsScreen.tsx — the News app (Stage 6).
 * ------------------------------------------------------------------
 * Category chips, relative timestamps, read/unread styling. Articles
 * are static data; opening one marks it read in the store.
 */
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '../../state/store';
import { createStartingNews } from '../../data/news';
import {
  filterByCategory,
  NEWS_CATEGORIES,
  unreadNewsCount,
  type NewsArticle,
  type NewsCategory,
} from '../../engine/news';
import { formatRelativeTime } from '../format';
import {
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
  tabularNums,
} from '../../theme/theme';

const TOP_PAD = 52;
const EMPTY_READ: readonly string[] = [];

type ChipCategory = NewsCategory | 'All';

export function NewsScreen() {
  const insets = useSafeAreaInsets();
  const clockNow = useGameStore((s) => s.clock.now);
  const readIds = useGameStore((s) => s.newsReadIds) ?? EMPTY_READ;
  const markNewsRead = useGameStore((s) => s.markNewsRead);

  const articles = useMemo(() => createStartingNews(clockNow), [clockNow]);
  const [category, setCategory] = useState<ChipCategory>('All');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = filterByCategory(articles, category);
  const unread = unreadNewsCount(articles, new Set(readIds));
  const opened = openId
    ? articles.find((a) => a.id === openId) ?? null
    : null;

  const handleOpen = (article: NewsArticle): void => {
    setOpenId(article.id);
    markNewsRead(article.id);
  };

  if (opened) {
    return (
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[
            styles.detailContent,
            { paddingTop: Math.max(insets.top, TOP_PAD) },
          ]}
        >
          <Pressable
            onPress={() => setOpenId(null)}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back to News list"
          >
            <Text style={styles.backText}>‹ News</Text>
          </Pressable>
          <Text style={styles.detailCategory}>{opened.category}</Text>
          <Text style={styles.detailHeadline}>{opened.headline}</Text>
          <Text style={[styles.detailMeta, tabularNums]}>
            {opened.source} · {formatRelativeTime(opened.publishedAt, clockNow)}
          </Text>
          <Text style={styles.detailBody}>{opened.summary}</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, TOP_PAD) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>News</Text>
          {unread > 0 ? (
            <Text style={[styles.unreadMeta, tabularNums]}>{unread} new</Text>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {(['All', ...NEWS_CATEGORIES] as ChipCategory[]).map((chip) => {
            const active = chip === category;
            return (
              <Pressable
                key={chip}
                onPress={() => setCategory(chip)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityLabel={`Filter ${chip}`}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {chip}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {filtered.length === 0 ? (
          <Text style={styles.empty}>No stories in this category yet.</Text>
        ) : (
          filtered.map((article) => {
            const isRead = readIds.includes(article.id);
            return (
              <Pressable
                key={article.id}
                onPress={() => handleOpen(article)}
                style={[styles.row, !isRead && styles.rowUnread]}
                accessibilityRole="button"
                accessibilityLabel={article.headline}
              >
                <View style={styles.rowTop}>
                  <Text style={styles.rowCategory}>{article.category}</Text>
                  <Text style={[styles.rowTime, tabularNums]}>
                    {formatRelativeTime(article.publishedAt, clockNow)}
                  </Text>
                </View>
                <Text
                  style={[styles.rowHeadline, !isRead && styles.rowHeadlineUnread]}
                  numberOfLines={2}
                >
                  {article.headline}
                </Text>
                <Text style={styles.rowSource}>{article.source}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
  },
  detailContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  unreadMeta: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: '#FB7185',
  },
  chips: {
    gap: 8,
    paddingBottom: spacing.md,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: 'rgba(251, 113, 133, 0.2)',
    borderColor: 'rgba(251, 113, 133, 0.45)',
  },
  chipText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: color.text.secondary,
  },
  chipTextActive: {
    color: '#FDA4AF',
  },
  empty: {
    color: color.text.secondary,
    fontSize: fontSize.body,
    marginTop: spacing.xl,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowUnread: {
    backgroundColor: 'rgba(251, 113, 133, 0.06)',
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowCategory: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: '#FB7185',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rowTime: {
    fontSize: fontSize.caption,
    color: color.text.secondary,
  },
  rowHeadline: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.text.secondary,
    lineHeight: 22,
  },
  rowHeadlineUnread: {
    color: color.text.primary,
    fontWeight: fontWeight.bold,
  },
  rowSource: {
    fontSize: fontSize.caption,
    color: color.text.secondary,
    marginTop: 4,
  },
  back: {
    marginBottom: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: '#FB7185',
  },
  detailCategory: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: '#FB7185',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailHeadline: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    lineHeight: 30,
    marginBottom: 8,
  },
  detailMeta: {
    fontSize: fontSize.label,
    color: color.text.secondary,
    marginBottom: spacing.lg,
  },
  detailBody: {
    fontSize: fontSize.body,
    color: color.text.primary,
    lineHeight: 24,
  },
});
