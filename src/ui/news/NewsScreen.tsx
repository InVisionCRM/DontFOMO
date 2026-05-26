/**
 * NewsScreen.tsx — the News app (production v1).
 * ------------------------------------------------------------------
 * Crypto headlines feed: seed editorial rows plus live "breaking"
 * lines from verified Clout posts. Anchored to game start time so
 * relative timestamps stay stable across sessions.
 */
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStartingNews } from '../../data/news';
import { buildNewsFeed } from '../../engine/news';
import type { Tweet } from '../../engine/clout';
import { useGameStore } from '../../state/store';
import { formatDate } from '../format';
import { NewsArticleRow } from './NewsArticleRow';
import { fontWeight } from '../../theme/theme';

const EMPTY_FEED: readonly Tweet[] = [];
const TOP_PAD = 52;
const BG = '#0F0A0C';

export function NewsScreen() {
  const insets = useSafeAreaInsets();
  const clock = useGameStore((s) => s.clock);
  const cloutFeed = useGameStore((s) => s.cloutFeed) ?? EMPTY_FEED;

  const seed = useMemo(
    () => createStartingNews(clock.startedAt),
    [clock.startedAt],
  );
  const headlines = useMemo(
    () => buildNewsFeed(seed, cloutFeed),
    [seed, cloutFeed],
  );
  const breakingCount = headlines.filter((h) => h.category === 'breaking').length;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, TOP_PAD) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>News</Text>
          {breakingCount > 0 && (
            <View style={styles.breakingPill}>
              <Text style={styles.breakingText}>
                {breakingCount} breaking
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>
          {formatDate(clock.now)}
          {headlines.length > 0
            ? ` · ${headlines.length} stories`
            : ''}
        </Text>

        {headlines.map((h) => (
          <NewsArticleRow key={h.id} headline={h} now={clock.now} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.6,
    color: '#FFFFFF',
  },
  breakingPill: {
    backgroundColor: 'rgba(225,29,72,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  breakingText: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: '#FDA4AF',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
});
