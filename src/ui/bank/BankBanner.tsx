/**
 * BankBanner.tsx — the top-edge banner notification.
 * ------------------------------------------------------------------
 * The "dry banner + buzz" feedback pattern from Design Bible §5. A
 * meaningful action (paid bill, repaid loan, borrowed cash) posts a
 * banner here. It slides in from the top, sits for a moment, and
 * slides back out. No success modal; the screen update is the real
 * confirmation.
 *
 * Inline to the Bank screen for v1. When Stage 5 adds more screens
 * that need banners we can lift this into a global mount + a store
 * notification queue.
 *
 * (Sound and `expo-haptics` are explicitly polish-pass work per
 * CLAUDE.md §9 — only the visual banner ships here.)
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import {
  color,
  fontSize,
  fontWeight,
  glass,
  motion,
  radius,
  spacing,
} from '../../theme/theme';

export interface BannerMessage {
  /** Fresh id per post — animates a re-show when the same text repeats. */
  id: number;
  title: string;
  body: string;
}

interface BankBannerProps {
  /** The currently-showing banner, or null. */
  message: BannerMessage | null;
  /** Called when the banner's display window ends. */
  onDismiss: () => void;
  /** How many ms the banner stays fully visible. */
  visibleMs?: number;
}

const VISIBLE_MS_DEFAULT = 2_900;

export function BankBanner({
  message,
  onDismiss,
  visibleMs = VISIBLE_MS_DEFAULT,
}: BankBannerProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    let cancelled = false;

    Animated.timing(progress, {
      toValue: 1,
      duration: motion.duration.slow,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(progress, {
        toValue: 0,
        duration: motion.duration.slow,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !cancelled) onDismiss();
      });
    }, visibleMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [message, onDismiss, progress, visibleMs]);

  if (!message) {
    return null;
  }

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 0],
  });
  const opacity = progress;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        { transform: [{ translateY }], opacity },
      ]}
    >
      <View style={styles.text}>
        <Text style={styles.title}>{message.title}</Text>
        <Text style={styles.body} numberOfLines={2}>
          {message.body}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(28,30,40,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    borderRadius: radius.xl,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    fontSize: fontSize.body,
    color: color.text.primary,
    marginTop: 1,
  },
});
