/**
 * AppView.tsx — the opened-app overlay.
 * ------------------------------------------------------------------
 * Renders the currently-open in-game app full-screen, zooming in from
 * the tapped icon (iOS-style) and back out on close. Apps with a real
 * screen (see appScreens.ts) render it; the rest fall back to a
 * placeholder.
 *
 * The zoom uses React Native's built-in Animated (native-driver scale
 * + fade). Reanimated remains the stack choice for later gesture work.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon, type IconRect } from './AppIcon';
import { APP_SCREENS } from './appScreens';
import { APP_BY_ID, type AppDefinition } from '../data/apps';
import { useGameStore } from '../state/store';
import { color, fontSize, fontWeight, motion, spacing } from '../theme/theme';

interface AppViewProps {
  /** On-screen rect of the icon the open animation grows from. */
  origin: IconRect | null;
}

export function AppView({ origin }: AppViewProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const openAppId = useGameStore((s) => s.openAppId);
  const closeApp = useGameStore((s) => s.closeApp);

  // `displayed` keeps the app rendered through the close animation,
  // after `openAppId` has already cleared.
  const [displayed, setDisplayed] = useState<AppDefinition | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (openAppId) {
      setDisplayed(APP_BY_ID[openAppId]);
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.duration.slow,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start();
    } else if (displayed) {
      Animated.timing(progress, {
        toValue: 0,
        duration: motion.duration.base,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setDisplayed(null);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAppId, progress]);

  if (!displayed) {
    return null;
  }

  const Screen = APP_SCREENS[displayed.id];

  const originWidth = origin?.width ?? 60;
  const originHeight = origin?.height ?? 60;
  const centerX = (origin?.x ?? (width - originWidth) / 2) + originWidth / 2;
  const centerY = (origin?.y ?? (height - originHeight) / 2) + originHeight / 2;

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [originWidth / width, 1],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [centerX - width / 2, 0],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [centerY - height / 2, 0],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 1, 1],
  });

  const accentColors = [displayed.gradient[0], 'transparent'] as const;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.screen,
        { opacity, transform: [{ translateX }, { translateY }, { scale }] },
      ]}
    >
      {Screen ? (
        <Screen />
      ) : (
        <>
          <LinearGradient
            colors={accentColors}
            style={styles.accent}
            pointerEvents="none"
          />
          <View style={[styles.body, { paddingTop: insets.top }]}>
            <AppIcon app={displayed} size={88} showLabel={false} />
            <Text style={styles.name}>{displayed.name}</Text>
            <Text style={styles.note}>
              This screen is built in a later stage
            </Text>
          </View>
        </>
      )}

      <Pressable
        style={[styles.homeArea, { paddingBottom: insets.bottom + spacing.sm }]}
        onPress={closeApp}
        accessibilityRole="button"
        accessibilityLabel={`Close ${displayed.name}`}
      >
        <View style={styles.homeBar} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.bg.base,
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    opacity: 0.5,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xxxl,
  },
  name: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  note: {
    fontSize: fontSize.body,
    color: color.text.secondary,
    textAlign: 'center',
  },
  homeArea: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: spacing.md,
  },
  homeBar: {
    width: 130,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
});
