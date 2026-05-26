/**
 * Banner.tsx — the global top-edge banner.
 * ------------------------------------------------------------------
 * Reads the `banner` slot from the store; when it changes, slides in,
 * sits for a moment, slides out, and clears itself. Sits above every
 * screen (mounted in PhoneShell after AppView), so any action — Bank,
 * unemployment check, future Mail / Tunnel events — can post one with
 * `useGameStore.getState().postBanner(title, body)`.
 *
 * Light haptic buzz on show (CLAUDE.md §9). Sound remains deferred.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useGameStore, type BannerMessage } from '../state/store';
import { hapticLight } from './haptics';
import {
  color,
  fontSize,
  fontWeight,
  glass,
  motion,
  radius,
  spacing,
} from '../theme/theme';

/** How long the banner stays fully visible before sliding out. */
const VISIBLE_MS = 2_900;

export function Banner() {
  const banner = useGameStore((s) => s.banner);
  const dismissBanner = useGameStore((s) => s.dismissBanner);
  const [displayed, setDisplayed] = useState<BannerMessage | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!banner) return;
    // Always reflect the newest posted banner; replace any in-flight one.
    hapticLight();
    setDisplayed(banner);
    progress.setValue(0);
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
        if (finished) dismissBanner(banner.id);
      });
    }, VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [banner, dismissBanner, progress]);

  if (!displayed) return null;

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        { transform: [{ translateY }], opacity: progress },
      ]}
    >
      <View style={styles.text}>
        <Text style={styles.title}>{displayed.title}</Text>
        <Text style={styles.body} numberOfLines={2}>
          {displayed.body}
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
    // Lift it off the surface so it floats above app screens.
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 30,
    elevation: 10,
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
