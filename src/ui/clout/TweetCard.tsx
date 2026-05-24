/**
 * TweetCard.tsx — one tweet in the Clout feed.
 * ------------------------------------------------------------------
 * Avatar, name + verified badge, handle + relative time, body text,
 * optional link-preview card, action-stat row. Suspicious tweets
 * (typo-squat / phishing) get a subtle red tint on the row so the
 * security primer is visible without screaming.
 *
 * Pure presentational.
 */
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { senderInitials } from '../../engine/mail';
import type { Tweet } from '../../engine/clout';
import { formatRelativeTime } from '../format';
import { fontWeight } from '../../theme/theme';

interface TweetCardProps {
  tweet: Tweet;
  now: number;
}

const ROW_BORDER = '#16181C';
const NAME_COLOR = '#E7E9EA';
const MUTED_COLOR = '#71767B';
const VERIFIED_BLUE = '#1D9BF0';
const SUSPICIOUS_TINT = 'rgba(234,57,67,0.08)';
const LINK_BORDER = '#2F3336';

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function TweetCard({ tweet, now }: TweetCardProps) {
  const { author, text, link, stats } = tweet;
  return (
    <View style={[styles.row, tweet.isSuspicious && styles.rowSuspicious]}>
      <LinearGradient
        colors={author.avatarGradient}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.avatar}
      >
        <Text style={styles.avatarText}>{senderInitials(author.name)}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.head}>
          <Text style={styles.name} numberOfLines={1}>
            {author.name}
          </Text>
          {author.verified && (
            <View style={styles.verified}>
              <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M5 12l5 5l10 -10"
                  stroke="#FFFFFF"
                  strokeWidth={3.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          )}
          <Text style={styles.handle} numberOfLines={1}>
            {author.handle} · {formatRelativeTime(tweet.sentAt, now)}
          </Text>
        </View>

        <Text style={styles.text}>{text}</Text>

        {link && (
          <View style={styles.linkCard}>
            <LinearGradient
              colors={link.thumbGradient}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.linkThumb}
            />
            <View style={styles.linkMeta}>
              <Text style={styles.linkDomain}>{link.domain}</Text>
              <Text style={styles.linkTitle}>{link.title}</Text>
            </View>
          </View>
        )}

        {stats && (
          <View style={styles.actions}>
            <StatPill icon={ICON.reply} value={formatStat(stats.replies)} />
            <StatPill icon={ICON.repost} value={formatStat(stats.reposts)} />
            <StatPill icon={ICON.heart} value={formatStat(stats.likes)} />
            <StatPill icon={ICON.views} value={formatStat(stats.views)} />
          </View>
        )}
      </View>
    </View>
  );
}

interface StatPillProps {
  icon: string;
  value: string;
}

function StatPill({ icon, value }: StatPillProps) {
  return (
    <View style={styles.stat}>
      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
        <Path
          d={icon}
          stroke={MUTED_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.statText}>{value}</Text>
    </View>
  );
}

const ICON = {
  reply:
    'M8 9h8M8 13h5M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3z',
  repost:
    'M19 7l-8 0a4 4 0 0 0 -4 4l0 5M16 10l3 -3l-3 -3M5 17l8 0a4 4 0 0 0 4 -4l0 -5M8 14l-3 3l3 3',
  heart:
    'M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.572a5 5 0 1 1 7.5 6.572',
  views: 'M3 21h18M7 21v-7M12 21v-12M17 21v-5',
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ROW_BORDER,
  },
  rowSuspicious: {
    backgroundColor: SUSPICIOUS_TINT,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 14.5,
    fontWeight: fontWeight.bold,
    color: NAME_COLOR,
    flexShrink: 0,
  },
  verified: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: VERIFIED_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    fontSize: 14.5,
    color: MUTED_COLOR,
    flex: 1,
    minWidth: 0,
  },
  text: {
    fontSize: 14.5,
    lineHeight: 21,
    color: NAME_COLOR,
    marginTop: 3,
  },
  linkCard: {
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: LINK_BORDER,
  },
  linkThumb: {
    height: 96,
  },
  linkMeta: {
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  linkDomain: {
    fontSize: 12,
    color: MUTED_COLOR,
  },
  linkTitle: {
    fontSize: 14,
    color: NAME_COLOR,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 11,
    paddingRight: 14,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 12.5,
    color: MUTED_COLOR,
  },
});
