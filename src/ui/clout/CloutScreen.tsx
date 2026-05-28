/**
 * CloutScreen.tsx — the Clout app (Bible §6).
 * ------------------------------------------------------------------
 * v1.1 ships the four-tab bottom navigation from the X mockup
 * (Home, Search, Notifications, Profile). The Home tab carries all
 * v1 gameplay — compact profile strip + feed (capped to the first 5
 * tweets per Bible §6) + the floating Post button. Search / Notif /
 * Profile show small placeholder shells so the bar feels real; they
 * will be filled in by their own backlog items, starting with the
 * Notifications panel.
 *
 * When `cloutTakeover` is non-null (Stage 6.5a — Golden Giveaway,
 * Scam Library v1.1 Event #10), the screen swaps to the full-screen
 * takeover overlay. The tab bar and FAB are hidden so the takeover
 * is the only interactive surface. The player resolves it from
 * there (Participate → drain; Verify → side-by-side compare with
 * the real founder → Report). Dismissing the takeover from inside
 * the overlay does NOT resolve it — the Inbound Lure deliberately
 * re-arms on dismiss per Scam Library v1.1.
 *
 * The player's avatar gradient mirrors the home-screen Clout app
 * icon so the identity reads consistently across the phone.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TweetCard } from './TweetCard';
import { CloutProfileStrip } from './CloutProfileStrip';
import { PostFAB } from './PostFAB';
import { GoldenGiveawayTakeover } from './GoldenGiveawayTakeover';
import { GoldenGiveawayCompare } from './GoldenGiveawayCompare';
import { CloutTabBar, type CloutTab } from './CloutTabBar';
import { CloutTabPlaceholder } from './CloutTabPlaceholder';
import { CloutNotificationsPanel } from './CloutNotificationsPanel';
import { useGameStore } from '../../state/store';
import {
  canPostToday as canPostTodayEngine,
  clampFeed,
  type Tweet,
} from '../../engine/clout';
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
  const cloutTakeover = useGameStore((s) => s.cloutTakeover);
  const resolveScamInstance = useGameStore((s) => s.resolveScamInstance);

  // "Kyle" is a placeholder display name until onboarding (later
  // stage) lets the player set their own. Handle is the canonical id.
  const displayName = 'Kyle';
  const avatarGradient = APP_BY_ID.clout.gradient;

  const [view, setView] = useState<'takeover' | 'compare'>('takeover');
  const [activeTab, setActiveTab] = useState<CloutTab>('home');

  if (cloutTakeover) {
    if (view === 'compare') {
      return (
        <GoldenGiveawayCompare
          takeover={cloutTakeover}
          onBack={() => setView('takeover')}
          onReport={() => {
            setView('takeover');
            resolveScamInstance(cloutTakeover.instanceId, true);
          }}
          onParticipateAnyway={() => {
            setView('takeover');
            resolveScamInstance(cloutTakeover.instanceId, false);
          }}
        />
      );
    }
    return (
      <GoldenGiveawayTakeover
        takeover={cloutTakeover}
        now={clockNow}
        onVerify={() => setView('compare')}
        onConfirmParticipate={() => {
          resolveScamInstance(cloutTakeover.instanceId, false);
        }}
      />
    );
  }

  const visibleFeed = clampFeed(feed, FEED_LIMIT);
  const canPost = canPostTodayEngine(dailyPost, Date.now());

  return (
    <View style={styles.root}>
      {activeTab === 'home' && (
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
      )}

      {activeTab === 'search' && (
        <CloutTabPlaceholder
          title="Search"
          copy="Trends and accounts arrive in a later polish pass. For now the Home feed shows every post you can see."
        />
      )}

      {activeTab === 'notifications' && <CloutNotificationsPanel />}

      {activeTab === 'profile' && (
        <CloutTabPlaceholder
          title="Profile"
          copy={`Posts, replies, and media for ${handle} will live here once the profile view ships.`}
        />
      )}

      {activeTab === 'home' && (
        <PostFAB
          canPost={canPost}
          streakDays={dailyPost.currentStreakDays}
          onPress={() => postDailyClout(Date.now())}
        />
      )}

      <CloutTabBar activeTab={activeTab} onSelect={setActiveTab} />
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
