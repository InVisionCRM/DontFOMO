/**
 * MessagesDetail.tsx — the slide-in conversation detail.
 * ------------------------------------------------------------------
 * iMessage-style header: a small avatar with the contact name
 * centred at the top, a left-aligned back chevron. Date stamps
 * appear inline whenever a new day's worth of messages starts.
 * Bubbles via MessageBubble. Decorative composer at the foot.
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { MessageBubble } from './MessageBubble';
import {
  contactInitials,
  type Conversation,
  type MessageItem,
} from '../../engine/messages';
import { fontWeight, motion } from '../../theme/theme';

interface MessagesDetailProps {
  conversation: Conversation | null;
  onBack: () => void;
}

const SCREEN_BG = '#000000';
const HEADER_BORDER = '#1C1C1E';
const BLUE = '#0A84FF';
const SUB_COLOR = '#C7C7CC';
const STAMP_COLOR = '#7C7C80';
const COMPOSER_BORDER = '#2C2C2E';

type StampRow = { kind: 'stamp'; key: string; text: string };
type MessageRow = { kind: 'message'; key: string; msg: MessageItem };
type Row = StampRow | MessageRow;

/**
 * Format the inline date-stamp that prefixes a new day's group.
 * "Today 9:41 AM" / "Yesterday 11:02 AM" / "Tuesday 7:14 PM" /
 * "Mar 14, 9:30 AM" for older.
 */
function stampFor(at: number, now: number): string {
  const a = new Date(at);
  const n = new Date(now);
  const time = a
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .replace(' ', ' ');
  if (a.toDateString() === n.toDateString()) return `Today ${time}`;
  const yesterday = new Date(n);
  yesterday.setDate(n.getDate() - 1);
  if (a.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${time}`;
  }
  const daysAgo = Math.floor((n.getTime() - a.getTime()) / 86_400_000);
  if (daysAgo < 7) {
    return `${a.toLocaleDateString('en-US', { weekday: 'long' })} ${time}`;
  }
  return `${a.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}, ${time}`;
}

/**
 * Walk the message list and interleave a date-stamp row whenever
 * the calendar day changes. Always emit a stamp before the very
 * first message.
 */
function buildRows(messages: readonly MessageItem[], now: number): Row[] {
  const rows: Row[] = [];
  let lastDayKey: string | null = null;
  for (const msg of messages) {
    const dayKey = new Date(msg.sentAt).toDateString();
    if (dayKey !== lastDayKey) {
      rows.push({
        kind: 'stamp',
        key: `stamp-${msg.id}`,
        text: stampFor(msg.sentAt, now),
      });
      lastDayKey = dayKey;
    }
    rows.push({ kind: 'message', key: `msg-${msg.id}`, msg });
  }
  return rows;
}

export function MessagesDetail({ conversation, onBack }: MessagesDetailProps) {
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  // Compute the date-stamp-interleaved row list. Memoise so re-renders
  // (e.g. an unread bump from the store) don't rebuild needlessly.
  const rows = useMemo(
    () => (conversation ? buildRows(conversation.messages, Date.now()) : []),
    [conversation],
  );

  useEffect(() => {
    Animated.timing(progress, {
      toValue: conversation ? 1 : 0,
      duration: motion.duration.base,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: true,
    }).start();
    if (conversation) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      });
    }
  }, [conversation, progress]);

  if (!conversation) return null;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  });

  return (
    <Animated.View style={[styles.root, { transform: [{ translateX }] }]}>
      {/* Header — iMessage-style centred avatar + name + back chevron on the left. */}
      <View style={styles.header}>
        <Pressable
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Messages"
          hitSlop={10}
        >
          <Svg width={27} height={27} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 6l-6 6l6 6"
              stroke={BLUE}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <LinearGradient
          colors={conversation.avatarGradient}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.headerAvatar}
        >
          <Text style={styles.headerAvatarText}>
            {conversation.initials ??
              contactInitials(conversation.contactName)}
          </Text>
        </LinearGradient>
        <Text style={styles.headerName} numberOfLines={1}>
          {conversation.contactName}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row) =>
          row.kind === 'stamp' ? (
            <Text key={row.key} style={styles.stamp}>
              {row.text}
            </Text>
          ) : (
            <MessageBubble key={row.key} message={row.msg} />
          ),
        )}
      </ScrollView>

      <View style={styles.composer} pointerEvents="none">
        <View style={styles.composerBox}>
          <Text style={styles.composerPlaceholder}>iMessage</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SCREEN_BG,
    flexDirection: 'column',
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 14,
    paddingBottom: 10,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HEADER_BORDER,
    gap: 4,
  },
  back: {
    position: 'absolute',
    left: 12,
    top: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  headerName: {
    fontSize: 12.5,
    color: SUB_COLOR,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
  },
  stamp: {
    textAlign: 'center',
    fontSize: 11,
    color: STAMP_COLOR,
    marginTop: 12,
    marginBottom: 2,
    fontWeight: fontWeight.semibold,
  },
  composer: {
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  composerBox: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COMPOSER_BORDER,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  composerPlaceholder: {
    fontSize: 14.5,
    color: '#7C7C80',
  },
});
