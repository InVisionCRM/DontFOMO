/**
 * ConversationRow.tsx — one row in the Messages list.
 * ------------------------------------------------------------------
 * Gradient avatar, contact name, preview text, last-message time.
 * Unread rows get a bold preview and a tinted time stamp; multi-unread
 * rows replace the dot with a numeric badge. A flagged-suspicious
 * contact (Hijacked Friend, Bible §11) shows a small chip — the same
 * affordance Mail and Tunnel use, scaled down for Messages rows.
 *
 * Pure presentational.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  contactInitials,
  lastMessage,
  previewText,
  type Conversation,
} from '../../engine/messages';
import { formatRelativeTime } from '../format';
import { fontWeight } from '../../theme/theme';

interface ConversationRowProps {
  conversation: Conversation;
  now: number;
  onPress: (id: string) => void;
}

const PRESSED_BG = '#131315';
const ROW_BORDER = '#161618';
const NAME_COLOR = '#FFFFFF';
const TIME_COLOR = '#7C7C80';
const TIME_UNREAD_COLOR = '#0A84FF';
const LAST_COLOR = '#8E8E93';
const LAST_UNREAD_COLOR = '#E7E7EA';
const UNREAD_DOT = '#0A84FF';
const BADGE_TEXT = '#FFFFFF';
const SUSPICIOUS_BG = 'rgba(234,57,67,0.18)';
const SUSPICIOUS_BORDER = 'rgba(234,57,67,0.40)';
const SUSPICIOUS_TEXT = '#FFB4B4';

export function ConversationRow({
  conversation,
  now,
  onPress,
}: ConversationRowProps) {
  const last = lastMessage(conversation);
  const unreadCount = conversation.unreadCount;
  const hasUnread = unreadCount > 0;
  const showCount = unreadCount > 1;
  const isSuspicious = conversation.isSuspicious === true;

  const a11yParts: string[] = [conversation.contactName];
  if (hasUnread) a11yParts.push(`${unreadCount} unread`);
  if (isSuspicious) a11yParts.push('suspicious');

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(conversation.id)}
      accessibilityRole="button"
      accessibilityLabel={a11yParts.join(', ')}
    >
      {/* Always reserve the unread column so all rows line up. */}
      <View style={styles.dotSlot}>
        {hasUnread &&
          (showCount ? (
            <View
              style={styles.badge}
              accessible={false}
              pointerEvents="none"
            >
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : String(unreadCount)}
              </Text>
            </View>
          ) : (
            <View style={styles.dot} accessible={false} pointerEvents="none" />
          ))}
      </View>

      <LinearGradient
        colors={conversation.avatarGradient}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.avatar}
      >
        <Text style={styles.avatarText}>
          {conversation.initials ?? contactInitials(conversation.contactName)}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.topLine}>
          <View style={styles.nameWrap}>
            <Text style={styles.name} numberOfLines={1}>
              {conversation.contactName}
            </Text>
            {isSuspicious && (
              <View style={styles.tag} accessible={false}>
                <Text style={styles.tagText}>!</Text>
              </View>
            )}
          </View>
          {last && (
            <Text
              style={[styles.time, hasUnread && styles.timeUnread]}
              accessible={false}
            >
              {formatRelativeTime(last.sentAt, now)}
            </Text>
          )}
        </View>
        <Text
          style={[styles.last, hasUnread && styles.lastUnread]}
          numberOfLines={2}
        >
          {previewText(conversation)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
  },
  rowPressed: {
    backgroundColor: PRESSED_BG,
  },
  dotSlot: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: UNREAD_DOT,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: UNREAD_DOT,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: BADGE_TEXT,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    minWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ROW_BORDER,
    paddingBottom: 11,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  nameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  name: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: fontWeight.semibold,
    color: NAME_COLOR,
  },
  tag: {
    backgroundColor: SUSPICIOUS_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SUSPICIOUS_BORDER,
    borderRadius: 999,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: fontWeight.bold,
    color: SUSPICIOUS_TEXT,
    includeFontPadding: false,
  },
  time: {
    fontSize: 12.5,
    color: TIME_COLOR,
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },
  timeUnread: {
    color: TIME_UNREAD_COLOR,
  },
  last: {
    fontSize: 14,
    color: LAST_COLOR,
    marginTop: 3,
  },
  lastUnread: {
    color: LAST_UNREAD_COLOR,
    fontWeight: fontWeight.semibold,
  },
});
