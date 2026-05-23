/**
 * MailRow.tsx — one mail in the inbox list.
 * ------------------------------------------------------------------
 * Unread blue dot, sender + optional SUSPICIOUS tag, time, subject,
 * preview. Tap fires onPress.
 *
 * Pure presentational — the screen owns the openMailMessage action.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MailMessage } from '../../engine/mail';
import { formatRelativeTime } from '../format';
import {
  appAccent,
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../../theme/theme';

interface MailRowProps {
  message: MailMessage;
  now: number;
  onPress: (id: string) => void;
}

const ROW_BORDER = '#1A1C22';
const SUSPICIOUS_BG = 'rgba(234,57,67,0.18)';
const SUSPICIOUS_BORDER = 'rgba(234,57,67,0.40)';
const SUSPICIOUS_TEXT = '#FFB4B4';

export function MailRow({ message, now, onPress }: MailRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(message.id)}
      accessibilityRole="button"
      accessibilityLabel={`${message.unread ? 'Unread' : 'Read'} mail from ${
        message.from
      }: ${message.subject}`}
    >
      <View
        style={[styles.dot, !message.unread && styles.dotRead]}
        pointerEvents="none"
      />
      <View style={styles.body}>
        <View style={styles.topLine}>
          <View style={styles.fromWrap}>
            <Text style={styles.from} numberOfLines={1}>
              {message.from}
            </Text>
            {message.isSuspicious && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>SUSPICIOUS</Text>
              </View>
            )}
          </View>
          <Text style={styles.time}>{formatRelativeTime(message.arrivedAt, now)}</Text>
        </View>
        <Text style={styles.subject} numberOfLines={1}>
          {message.subject}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {message.preview}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ROW_BORDER,
  },
  rowPressed: {
    backgroundColor: color.bg.surface,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: appAccent.mail,
    marginTop: 7,
    flexShrink: 0,
  },
  dotRead: {
    backgroundColor: 'transparent',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  fromWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  from: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    flexShrink: 1,
  },
  tag: {
    backgroundColor: SUSPICIOUS_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SUSPICIOUS_BORDER,
    borderRadius: radius.sm / 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: SUSPICIOUS_TEXT,
    letterSpacing: 0.3,
  },
  time: {
    fontSize: fontSize.caption,
    color: color.text.secondary,
    flexShrink: 0,
  },
  subject: {
    fontSize: fontSize.body,
    color: color.text.primary,
    marginTop: 2,
  },
  preview: {
    fontSize: fontSize.label,
    color: color.text.secondary,
    marginTop: 2,
  },
});
