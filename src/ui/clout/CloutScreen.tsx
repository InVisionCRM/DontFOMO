/**
 * CloutScreen.tsx — the Clout app (Bible §6).
 * ------------------------------------------------------------------
 * Single-screen v1: compact profile strip at the top, then the
 * Clout feed (capped to the first 5 tweets per Bible §6), with a
 * floating Post button bottom-right that fires the daily-Post
 * streak. The tab-bar / search / notifications panels from the
 * mockup are intentionally deferred to a later polish pass.
 *
 * The player's avatar gradient mirrors the home-screen Clout app
 * icon so the identity reads consistently across the phone.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TweetCard } from './TweetCard';
import { CloutProfileStrip } from './CloutProfileStrip';
import { PostFAB } from './PostFAB';
import { useGameStore } from '../../state/store';
import {
  canPostToday as canPostTodayEngine,
  clampFeed,
  type Tweet,
} from '../../engine/clout';
import { displayNameFromHandle } from '../../engine/profile/displayName';
import { APP_BY_ID } from '../../data/apps';
import { fontWeight } from '../../theme/theme';

/** Stable fallback for the Fast-Refresh stale-state defence. */
const EMPTY_FEED: readonly Tweet[] = [];
const EMPTY_DAILY = { lastPostAt: 0, currentStreakDays: 0, graceDays: 0 };

/** Bible §6 — "Feed shows only 5 tweets at first." */
const FEED_LIMIT = 5;

const SCREEN_BG = '#000000';
const MUTED_COLOR = '#71767B';

export function CloutScreen() {
  const handle = useGameStore((s) => s.handle);
  const bio = useGameStore((s) => s.bio) ?? '';
  const followers = useGameStore((s) => s.followers) ?? 0;
  const feed = useGameStore((s) => s.cloutFeed) ?? EMPTY_FEED;
  const dailyPost = useGameStore((s) => s.dailyPost) ?? EMPTY_DAILY;
  const clockNow = useGameStore((s) => s.clock.now);
  const postDailyClout = useGameStore((s) => s.postDailyClout);

  const displayName = displayNameFromHandle(handle);
  const avatarGradient = APP_BY_ID.clout.gradient;

  const visibleFeed = clampFeed(feed, FEED_LIMIT);
  const canPost = canPostTodayEngine(dailyPost, Date.now());

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CloutProfileStrip
          displayName={displayName}
          handle={handle}
          bio={bio}
          followers={followers}
          streakDays={dailyPost.currentStreakDays}
          canPostToday={canPost}
          avatarGradient={avatarGradient}
        />

        {visibleFeed.map((t) => (
          <TweetCard key={t.id} tweet={t} now={clockNow} />
        ))}

        {feed.length > FEED_LIMIT && (
          <View style={styles.tail}>
            <Text style={styles.tailText}>
              The feed shows {FEED_LIMIT} tweets for now. Skill-tree upgrades
              raise this cap.
            </Text>
          </View>
        )}

        {feed.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Feed is quiet</Text>
            <Text style={styles.emptyText}>
              New posts will show up here as people you follow post.
            </Text>
          </View>
        )}
      </ScrollView>

      <PostFAB
        canPost={canPost}
        streakDays={dailyPost.currentStreakDays}
        onPress={() => postDailyClout(Date.now())}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 36,
    paddingBottom: 120,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 14,
    color: MUTED_COLOR,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  tail: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  tailText: {
    fontSize: 13,
    color: MUTED_COLOR,
    textAlign: 'center',
    lineHeight: 18,
  },
});
