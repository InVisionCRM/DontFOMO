/**
 * CloutProfileStrip.tsx — the compact profile header above the feed.
 * ------------------------------------------------------------------
 * Avatar, display name + handle, follower/following counts, bio, and
 * a streak card. Sits at the top of the Clout home view in v1 — the
 * full banner-style profile tab (mockup) lands in a later pass when
 * the in-app tab bar gets built.
 */
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { senderInitials } from '../../engine/mail';
import { fontWeight, tabularNums } from '../../theme/theme';

interface CloutProfileStripProps {
  displayName: string;
  handle: string;
  bio: string;
  followers: number;
  /** "Following" count — flavour only in v1. */
  followingApprox?: number;
  streakDays: number;
  /** True when the player can post today (drives streak-card copy). */
  canPostToday: boolean;
  /** Player's avatar gradient. */
  avatarGradient: readonly [string, string];
}

const HEADER_BG = '#000000';
const BORDER = '#16181C';
const NAME_COLOR = '#E7E9EA';
const MUTED_COLOR = '#71767B';
const BANNER_FROM = '#5A2D7E';
const BANNER_TO = '#C5526A';
const STREAK_BG = 'rgba(251,146,60,0.18)';
const STREAK_BORDER = 'rgba(251,146,60,0.35)';
const STREAK_TITLE = '#FFFFFF';
const STREAK_SUB = '#D9B8A0';
const FLAME = '#FB923C';

const FLAME_PATH =
  'M12 12c2 -2.96 0 -7 -1 -8c0 3.038 -1.773 4.741 -3 6c-1.226 1.26 -2 3.24 -2 5a6 6 0 1 0 12 0c0 -1.532 -1.056 -3.94 -2 -5c-1.786 3 -2.791 3 -4 2z';

export function CloutProfileStrip({
  displayName,
  handle,
  bio,
  followers,
  followingApprox = 182,
  streakDays,
  canPostToday,
  avatarGradient,
}: CloutProfileStripProps) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[BANNER_FROM, BANNER_TO]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      />
      <View style={styles.body}>
        <LinearGradient
          colors={avatarGradient}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{senderInitials(displayName)}</Text>
        </LinearGradient>

        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.handle}>{handle}</Text>
        <Text style={styles.bio}>{bio}</Text>

        <View style={styles.counts}>
          <Text style={styles.countLine}>
            <Text style={[styles.countNum, tabularNums]}>
              {followingApprox.toLocaleString('en-US')}
            </Text>
            <Text style={styles.countLabel}> Following</Text>
          </Text>
          <Text style={styles.countLine}>
            <Text style={[styles.countNum, tabularNums]}>
              {followers.toLocaleString('en-US')}
            </Text>
            <Text style={styles.countLabel}> Followers</Text>
          </Text>
        </View>

        <View style={styles.streakCard}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d={FLAME_PATH}
              stroke={FLAME}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <View style={styles.streakText}>
            <Text style={styles.streakTitle}>
              {streakDays === 0
                ? 'No streak yet'
                : `${streakDays}-day post streak`}
            </Text>
            <Text style={styles.streakSub}>
              {canPostToday
                ? streakDays === 0
                  ? 'Tap Post to start your streak'
                  : 'Post today to keep it alive'
                : 'Already posted today ✓'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: HEADER_BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  banner: {
    height: 92,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: HEADER_BG,
    marginTop: -36,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  name: {
    fontSize: 21,
    fontWeight: fontWeight.bold,
    color: NAME_COLOR,
    marginTop: 8,
  },
  handle: {
    fontSize: 15,
    color: MUTED_COLOR,
    marginTop: 1,
  },
  bio: {
    fontSize: 14.5,
    lineHeight: 20,
    color: NAME_COLOR,
    marginTop: 10,
  },
  counts: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 10,
  },
  countLine: {
    fontSize: 14,
  },
  countNum: {
    color: NAME_COLOR,
    fontWeight: fontWeight.bold,
  },
  countLabel: {
    color: MUTED_COLOR,
  },
  streakCard: {
    marginTop: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: STREAK_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STREAK_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  streakText: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: STREAK_TITLE,
  },
  streakSub: {
    fontSize: 12.5,
    color: STREAK_SUB,
    marginTop: 2,
  },
});
