/**
 * NewsScreen.tsx — the News app (v1).
 * ------------------------------------------------------------------
 * Headline feed from `src/data/news.ts`. Market price nudges from
 * news can wire into the engine in a later pass.
 */
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStartingNews, type NewsHeadline } from '../../data/news';
import { useGameStore } from '../../state/store';
import {
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../../theme/theme';

const TOP_PAD = 52;
const NEWS_ACCENT = '#FB7185';

function formatWhen(publishedAt: number, now: number): string {
  const hours = Math.max(1, Math.floor((now - publishedAt) / 3_600_000));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NewsScreen() {
  const insets = useSafeAreaInsets();
  const clockNow = useGameStore((s) => s.clock.now);

  const headlines = useMemo(
    () => createStartingNews(clockNow),
    [clockNow],
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={headlines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingTop: Math.max(insets.top, TOP_PAD) },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>News</Text>
            <Text style={styles.sub}>Headlines that move the market — eventually</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.outlet}>{item.outlet}</Text>
            <Text style={styles.headline}>{item.title}</Text>
            <Text style={styles.summary}>{item.summary}</Text>
            <Text style={styles.when}>{formatWhen(item.publishedAt, clockNow)}</Text>
            {item.tags && item.tags.length > 0 && (
              <Text style={styles.tags}>{item.tags.join(' · ')}</Text>
            )}
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  sub: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: color.text.secondary,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
  },
  outlet: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: NEWS_ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headline: {
    marginTop: spacing.sm,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    lineHeight: 22,
  },
  summary: {
    marginTop: spacing.sm,
    fontSize: fontSize.body,
    color: color.text.secondary,
    lineHeight: 21,
  },
  when: {
    marginTop: spacing.md,
    fontSize: fontSize.caption,
    color: color.text.tertiary,
  },
  tags: {
    marginTop: spacing.xs,
    fontSize: fontSize.caption,
    color: color.text.tertiary,
  },
});
