/**
 * MailDetail.tsx — the slide-in detail view for one mail.
 * ------------------------------------------------------------------
 * Slides in from the right when a row is tapped, mirroring the
 * pattern from Exchange's TokenDetail. Renders the sender header
 * (avatar with initials, name, email address — red for suspicious),
 * the subject as a big title, the body as wrapped paragraphs, and
 * any optional in-body action button.
 *
 * Pure presentational — the screen passes the resolved message in
 * and handles the back action. The action button is inert in v1;
 * the Scam Director (Stage 6) will wire its consequences.
 */
import { useEffect, useRef } from 'react';
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
import type { MailAction, MailMessage } from '../../engine/mail';
import { senderInitials } from '../../engine/mail';
import {
  appAccent,
  color,
  fontSize,
  fontWeight,
  motion,
  radius,
  spacing,
} from '../../theme/theme';

interface MailDetailProps {
  /** The message to show, or null to render nothing / dismiss. */
  message: MailMessage | null;
  /** Called when the back button is tapped. */
  onBack: () => void;
  /**
   * Called when the in-body action button is tapped. The handler
   * receives the full action and the parent message — the screen
   * decides whether to dispatch `resolveScamInstance` (when the
   * action carries a `scamResolution`) or ignore (informational
   * actions in v1).
   */
  onAction?: (action: MailAction, message: MailMessage) => void;
}

const SUSPICIOUS_ADDRESS = '#FF8A8A';
const ACTION_PHISH_BG = appAccent.mail; // Looks legit. That's the trap.
const ACTION_SAFE_BG = color.success;
const ACTION_INFO_BG = color.bg.elevated;

/** Pick the avatar gradient for a sender. Suspicious senders get red. */
function avatarGradient(message: MailMessage): readonly [string, string] {
  if (message.isSuspicious) return ['#EA3943', '#7F1D1D'];
  const palette: ReadonlyArray<readonly [string, string]> = [
    ['#3B82F6', '#1E40AF'],
    ['#16C784', '#0F5132'],
    ['#7C5CFF', '#3F1FB0'],
    ['#F7A83A', '#9A6312'],
    ['#EC4899', '#9D174D'],
    ['#22C55E', '#14532D'],
    ['#0EA5E9', '#0C4A6E'],
  ];
  let h = 0;
  for (let i = 0; i < message.from.length; i++) {
    h = (h * 31 + message.from.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(h) % palette.length];
}

export function MailDetail({ message, onBack, onAction }: MailDetailProps) {
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: message ? 1 : 0,
      duration: motion.duration.base,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: true,
    }).start();
  }, [message, progress]);

  if (!message) return null;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  });
  const grad = avatarGradient(message);
  const paragraphs = message.body.split(/\n\n+/);

  return (
    <Animated.View style={[styles.root, { transform: [{ translateX }] }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to inbox"
        >
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Inbox</Text>
        </Pressable>

        <Text style={styles.subject}>{message.subject}</Text>

        <View style={styles.sender}>
          <LinearGradient
            colors={grad}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{senderInitials(message.from)}</Text>
          </LinearGradient>
          <View style={styles.senderText}>
            <Text style={styles.senderName}>{message.from}</Text>
            <Text
              style={[
                styles.senderAddress,
                message.isSuspicious && { color: SUSPICIOUS_ADDRESS },
              ]}
            >
              {message.fromAddress}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {paragraphs.map((p, i) => (
            <Text key={i} style={styles.paragraph}>
              {p}
            </Text>
          ))}

          {message.action && (
            <Pressable
              style={[
                styles.actionBtn,
                message.action.kind === 'phish' && { backgroundColor: ACTION_PHISH_BG },
                message.action.kind === 'safe' && { backgroundColor: ACTION_SAFE_BG },
                message.action.kind === 'info' && { backgroundColor: ACTION_INFO_BG },
              ]}
              accessibilityRole="button"
              accessibilityLabel={message.action.label}
              onPress={() => {
                if (message.action && onAction) {
                  onAction(message.action, message);
                }
              }}
            >
              <Text style={styles.actionText}>{message.action.label}</Text>
            </Pressable>
          )}
          {message.secondaryAction && (
            <Pressable
              style={styles.secondaryActionBtn}
              accessibilityRole="button"
              accessibilityLabel={message.secondaryAction.label}
              onPress={() => {
                if (onAction) {
                  onAction(message.secondaryAction!, message);
                }
              }}
            >
              <Text style={styles.secondaryActionText}>
                {message.secondaryAction.label}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
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
    backgroundColor: color.bg.base,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 64,
    paddingBottom: spacing.huge,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.lg,
  },
  backChevron: {
    fontSize: 26,
    fontWeight: fontWeight.regular,
    color: appAccent.mail,
    lineHeight: 26,
  },
  backLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: appAccent.mail,
  },
  subject: {
    fontSize: 21,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    lineHeight: 26,
    paddingHorizontal: spacing.lg,
    marginTop: 14,
  },
  sender: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: spacing.lg,
    marginTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1A1C22',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  senderText: {
    flex: 1,
    minWidth: 0,
  },
  senderName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  senderAddress: {
    fontSize: fontSize.label,
    color: color.text.secondary,
    marginTop: 1,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: 18,
  },
  paragraph: {
    fontSize: fontSize.body,
    lineHeight: 24,
    color: '#D3D5DC',
    marginBottom: 13,
  },
  actionBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 13,
    paddingHorizontal: 26,
    borderRadius: radius.md,
    marginTop: 6,
    marginBottom: 13,
  },
  actionText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border.strong,
    marginBottom: 13,
  },
  secondaryActionText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: color.text.secondary,
  },
});
