/**
 * TunnelChatRow.tsx — one row in the Tunnel chat list.
 * ------------------------------------------------------------------
 * Avatar, name (+ verified blue check), time of the last message,
 * last-message preview, optional unread badge (red tint for
 * suspicious / scam chats).
 *
 * Pure presentational. The screen owns the openTunnelChat action.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import {
  chatInitials,
  lastMessage,
  type TunnelChat,
} from '../../engine/tunnel';
import { formatRelativeTime } from '../format';
import { fontWeight } from '../../theme/theme';

interface TunnelChatRowProps {
  chat: TunnelChat;
  now: number;
  onPress: (id: string) => void;
}

const ROW_BORDER = '#101820';
const PRESSED_BG = '#202B38';
const NAME_COLOR = '#FFFFFF';
const TIME_COLOR = '#6C7883';
const LAST_COLOR = '#8696A5';
const VERIFIED_BLUE = '#5EB5F7';
const BADGE_BG = '#5EB5F7';
const BADGE_TEXT = '#17212B';
const BADGE_SCAM_BG = '#EA3943';
const BADGE_SCAM_TEXT = '#FFFFFF';

export function TunnelChatRow({ chat, now, onPress }: TunnelChatRowProps) {
  const last = lastMessage(chat);
  const lastText = last
    ? last.outgoing
      ? `You: ${last.text}`
      : last.sender
        ? `${last.sender}: ${last.text}`
        : last.text
    : 'No messages yet';

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(chat.id)}
      accessibilityRole="button"
      accessibilityLabel={
        chat.unreadCount > 0
          ? `${chat.name}, ${chat.unreadCount} unread`
          : chat.name
      }
    >
      <LinearGradient
        colors={chat.avatarGradient}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.avatar}
      >
        <Text style={styles.avatarText}>
          {chat.initials ?? chatInitials(chat.name)}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.topLine}>
          <View style={styles.nameWrap}>
            <Text style={styles.name} numberOfLines={1}>
              {chat.name}
            </Text>
            {chat.verified && (
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Path
                  d="M12 1l2.5 2.2 3.3-.4 1.4 3 3 1.4-.4 3.3 2.2 2.5-2.2 2.5.4 3.3-3 1.4-1.4 3-3.3-.4-2.5 2.2-2.5-2.2-3.3.4-1.4-3-3-1.4.4-3.3L1 12l2.2-2.5-.4-3.3 3-1.4 1.4-3 3.3.4z"
                  fill={VERIFIED_BLUE}
                />
                <Path
                  d="M8 12l3 3 5-6"
                  fill="none"
                  stroke="#17212B"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            )}
          </View>
          {last && (
            <Text style={styles.time}>{formatRelativeTime(last.sentAt, now)}</Text>
          )}
        </View>
        <View style={styles.bottomLine}>
          <Text style={styles.last} numberOfLines={1}>
            {lastText}
          </Text>
          {chat.unreadCount > 0 && (
            <View
              style={[
                styles.badge,
                chat.isSuspicious && styles.badgeScam,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  chat.isSuspicious && styles.badgeScamText,
                ]}
              >
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rowPressed: {
    backgroundColor: PRESSED_BG,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    minWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ROW_BORDER,
    paddingBottom: 10,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  nameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: fontWeight.semibold,
    color: NAME_COLOR,
    flexShrink: 1,
  },
  time: {
    fontSize: 12,
    color: TIME_COLOR,
    flexShrink: 0,
  },
  bottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  last: {
    flex: 1,
    fontSize: 14,
    color: LAST_COLOR,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: BADGE_BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeScam: {
    backgroundColor: BADGE_SCAM_BG,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: BADGE_TEXT,
  },
  badgeScamText: {
    color: BADGE_SCAM_TEXT,
  },
});
