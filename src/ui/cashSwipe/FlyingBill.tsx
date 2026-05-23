/**
 * FlyingBill.tsx — one bill flung up and falling away.
 * ------------------------------------------------------------------
 * Self-contained physics-ish animation. Three Animated.Values driven
 * by the native driver (transform-only): a parabolic Y trajectory
 * (cubic-out up, cubic-in down), a linear X drift, and a linear
 * rotation. When the trajectory completes the bill calls
 * `onComplete(id)` so the parent can drop it from the live set.
 *
 * The "physics" is approximated, not simulated — close to the
 * original mockup's feel without needing per-frame JS work or
 * Reanimated. All animations stay on the native thread.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const BILL_WIDTH = 66;
const BILL_HEIGHT = 104;
const BG = ['#54B97E', '#2F8F54'] as const;
const BORDER = '#173E29';
const INNER_BORDER = 'rgba(255,255,255,0.32)';
const CORNER_TEXT = 'rgba(255,255,255,0.8)';

export interface FlyingBillProps {
  id: number;
  /** Absolute screen X for the bill's centre at launch. */
  centerX: number;
  /** Distance from the bottom of the screen the bill starts at. */
  startBottom: number;
  /** Initial upward velocity, ~13..23 (from the swipe). */
  velocity: number;
  onComplete: (id: number) => void;
}

export function FlyingBill({
  id,
  centerX,
  startBottom,
  velocity,
  onComplete,
}: FlyingBillProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Trajectory shape — peak roughly scales with launch velocity.
    const peakHeight = Math.max(180, velocity * 22);
    const upDuration = 460;
    const fallDuration = 1_700;
    const totalDuration = upDuration + fallDuration;
    const drift = (Math.random() - 0.5) * 220;
    const finalRotation = (Math.random() - 0.5) * 540;

    const upDown = Animated.sequence([
      Animated.timing(translateY, {
        toValue: -peakHeight,
        duration: upDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 1_400,
        duration: fallDuration,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    const drifting = Animated.timing(translateX, {
      toValue: drift,
      duration: totalDuration,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    const spinning = Animated.timing(rotation, {
      toValue: finalRotation,
      duration: totalDuration,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    let cancelled = false;
    Animated.parallel([upDown, drifting, spinning]).start(({ finished }) => {
      if (finished && !cancelled) onComplete(id);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spin = rotation.interpolate({
    inputRange: [-720, 720],
    outputRange: ['-720deg', '720deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bill,
        {
          left: centerX - BILL_WIDTH / 2,
          bottom: startBottom,
          transform: [
            { translateX },
            { translateY },
            { rotate: spin },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={BG}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 7 }]}
      />
      <View style={styles.innerBorder} />
      <Text style={[styles.corner, styles.cornerTL]}>100</Text>
      <View style={styles.seal}>
        <Text style={styles.sealText}>$</Text>
      </View>
      <Text style={[styles.corner, styles.cornerBR]}>100</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bill: {
    position: 'absolute',
    width: BILL_WIDTH,
    height: BILL_HEIGHT,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  innerBorder: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    right: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: INNER_BORDER,
  },
  seal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 26,
    height: 26,
    marginLeft: -13,
    marginTop: -13,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EAFBF0',
  },
  corner: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '800',
    color: CORNER_TEXT,
  },
  cornerTL: { top: 5, left: 7 },
  cornerBR: { bottom: 5, right: 7 },
});
