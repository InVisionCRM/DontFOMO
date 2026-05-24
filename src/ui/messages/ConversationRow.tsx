/**
 * ConversationRow.tsx — one row in the Messages list.
 * ------------------------------------------------------------------
 * Blue unread dot, gradient avatar, contact name, time of the last
 * message, preview text. Tapping fires onPress.
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
const LAST_COLOR = '#8E8E93';
const UNREAD_DOT = '#0A84FF';

export function ConversationRow({
  conversation,
  now,
  onPress,
}: ConversationRowProps) {
  const last = lastMessage(conversation);
  const hasUnread = conversation.unreadCount > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(conversation.id)}
      accessibilityRole="button"
      accessibilityLabel={
        hasUnread
          ? `${conversation.contactName}, ${conversation.unreadCount} unread`
          : conversation.contactName
      }
    >
      {/* Always reserve the unread-dot column so all rows line up. */}
      <View style={styles.dotSlot}>
        {hasUnread && <View style={styles.dot} />}
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
          <Text style={styles.name} numberOfLines={1}>
            {conversation.contactName}
          </Text>
          {last && (
            <Text style={styles.time}>
              {formatRelativeTime(last.sentAt, now)}
            </Text>
          )}
        </View>
        <Text style={styles.last} numberOfLines={1}>
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
    width: 10,
    alignItems: 'center',
    flexShrink: 0,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: UNREAD_DOT,
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
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: fontWeight.semibold,
    color: NAME_COLOR,
  },
  time: {
    fontSize: 12.5,
    color: TIME_COLOR,
    flexShrink: 0,
  },
  last: {
    fontSize: 14,
    color: LAST_COLOR,
    marginTop: 3,
  },
});
