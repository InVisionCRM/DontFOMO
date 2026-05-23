/**
 * CashSwipeHUD.tsx — the top HUD: title, earned, swipes-left.
 * ------------------------------------------------------------------
 * Centred top overlay. Pure presentational.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { fontWeight, tabularNums } from '../../theme/theme';

interface CashSwipeHUDProps {
  earned: number;
  remaining: number;
  capped: boolean;
  /**
   * 0..1 animated value driven by sustained swipe activity. Higher =
   * the earned amount scales up, glows, and shakes. Native-driver
   * friendly throughout (transform + opacity only).
   */
  excitement?: Animated.Value;
}

const TITLE_COLOR = '#7FD3A4';
const EARNED_COLOR = '#EAFBF0';
const LEFT_COLOR = '#8FE0B3';
const GLOW_COLOR = '#FFD27A';

/**
 * The HUD sits in a lifted "control panel" — a dark glass-ish slab
 * with a heavy drop shadow, so the flying bills behind it read as
 * actually behind. The panel inhabits a fixed band near the top of
 * the screen and is non-interactive.
 */
export function CashSwipeHUD({
  earned,
  remaining,
  capped,
  excitement,
}: CashSwipeHUDProps) {
  // A continuously-running -1 → +1 loop. Multiplied by an
  // excitement-derived amplitude, this drives the number's shake.
  // No-op at idle (amplitude = 0); intensifies as excitement rises.
  const shakeLoop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeLoop, {
          toValue: 1,
          duration: 55,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shakeLoop, {
          toValue: -1,
          duration: 55,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shakeLoop]);

  // Map excitement (0..1) → text scale (1.0..1.8). A sustained swipe
  // train shoves the value toward 1; the screen debounces a 2s
  // deflate so the number snaps back to baseline once the player
  // stops.
  const earnedScale = excitement
    ? excitement.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] })
    : new Animated.Value(1);
  // Shake amplitude (px) — zero until excitement crosses ~0.3, then
  // ramps to ~7px at full excitement. Multiplied by `shakeLoop` to
  // get the live ±amplitude wobble.
  const shakeAmplitude = excitement
    ? excitement.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [0, 0, 7],
      })
    : new Animated.Value(0);
  const shakeX = Animated.multiply(shakeLoop, shakeAmplitude);
  // Glow layer opacity — fades in as excitement crosses ~0.25.
  const glowOpacity = excitement
    ? excitement.interpolate({
        inputRange: [0, 0.25, 1],
        outputRange: [0, 0, 0.9],
      })
    : new Animated.Value(0);

  const earnedTransform = { transform: [{ scale: earnedScale }, { translateX: shakeX }] };
  const earnedText = `$${earned.toLocaleString('en-US')}`;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.panel}>
        {/* Top-edge highlight — sells the embossed/lifted look. */}
        <View style={styles.highlight} pointerEvents="none" />

        <Text style={styles.title}>Cash Swipe</Text>

        {/* Earned amount: a gold glow layer behind a white front layer.
            Both transform identically so they stay perfectly aligned. */}
        <View style={styles.earnedSlot}>
          <Animated.Text
            style={[
              styles.earnedGlow,
              tabularNums,
              { opacity: glowOpacity, ...earnedTransform },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {earnedText}
          </Animated.Text>
          <Animated.Text style={[styles.earned, tabularNums, earnedTransform]}>
            {earnedText}
          </Animated.Text>
        </View>

        {!capped && (
          <Text style={[styles.left, tabularNums]}>
            {remaining.toLocaleString('en-US')} swipes left today
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 108,
    left: 22,
    right: 22,
    alignItems: 'center',
  },
  panel: {
    width: '100%',
    paddingVertical: 22,
    paddingHorizontal: 28,
    borderRadius: 26,
    backgroundColor: 'rgba(7, 38, 26, 0.78)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(143, 224, 179, 0.35)',
    // Heavy drop shadow — sells the lifted feel; bills behind read as behind.
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 26,
    elevation: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  title: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: TITLE_COLOR,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  earnedSlot: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earned: {
    fontSize: 64,
    fontWeight: fontWeight.bold,
    color: EARNED_COLOR,
    letterSpacing: -2.4,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 18,
  },
  /**
   * The glow layer — same content + same transforms as the main
   * earned text, but stacked behind with a thick coloured shadow and
   * no offset. As excitement climbs, this fades in; the halo around
   * the digits is the "the slot machine is going off" feel.
   */
  earnedGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 64,
    fontWeight: fontWeight.bold,
    color: GLOW_COLOR,
    letterSpacing: -2.4,
    textShadowColor: GLOW_COLOR,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  left: {
    fontSize: 14,
    color: LEFT_COLOR,
    marginTop: 6,
  },
});
