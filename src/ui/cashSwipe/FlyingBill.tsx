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
 * original mockup's feel without per-frame JS work or Reanimated.
 * All animations stay on the native thread.
 *
 * Visual: the satirical "WORTHLESS PAPER NOTE" bill, pre-rotated
 * to portrait at the asset level (`assets/bill-portrait.png`). The
 * image aspect (~0.414 : 1) sets the container dimensions so it
 * fills cleanly with no letterboxing.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet } from 'react-native';

/** Bill dimensions (W × H). Aspect matches the rotated source image.
 *  Deliberately smaller than the stack bills — the contrast between
 *  the big wad and the tiny zipping bills sells the swipe-and-fling
 *  feel. */
const BILL_WIDTH = 56;
const BILL_HEIGHT = 135;

const BILL_SOURCE = require('../../../assets/bill-portrait.png');

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
      <Image source={BILL_SOURCE} style={styles.image} resizeMode="cover" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bill: {
    position: 'absolute',
    width: BILL_WIDTH,
    height: BILL_HEIGHT,
    borderRadius: 4,
    overflow: 'hidden',
    // Lifted-from-the-screen shadow — sells the in-flight feel.
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
