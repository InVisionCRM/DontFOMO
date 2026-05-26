/**
 * CashSwipeScreen.tsx — the CashSwipe minigame screen.
 * ------------------------------------------------------------------
 * Top-level layout, the swipe-up gesture, and the orchestration of
 * the flying bills. The screen's own gradient background, the HUD,
 * the static stack at the bottom and the out-of-swipes empty state.
 *
 * The gesture uses RN's `PanResponder` to track the upward distance
 * of a finger drag on the stack zone; release above a threshold
 * spawns one flying bill and calls `swipeOnce` on the store. Each
 * flying bill self-manages its trajectory and reports completion so
 * the screen can drop it from the live set.
 *
 * Built to the approved CashSwipe mockup.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BillStack } from './BillStack';
import { CashSwipeHUD } from './CashSwipeHUD';
import { EmptyCap } from './EmptyCap';
import { FlyingBill } from './FlyingBill';
import { useGameStore } from '../../state/store';
import {
  earnedToday,
  isCapReached,
  msUntilLocalMidnight,
  swipesRemaining,
} from '../../engine/economy';
import { fontWeight } from '../../theme/theme';

/** Minimum upward drag (px) for the swipe to count as a fling. */
const SWIPE_THRESHOLD = 30;
/** Distance (px) the flying bill starts above the bottom of the screen.
 *  Tuned so bills emerge from the upper edge of the (clipped-bottom)
 *  stack — bottom half hidden behind the wad at launch, top half
 *  already visible. */
const FLY_START_BOTTOM = 280;
/** How much each swipe bumps the excitement value (0..1). */
const EXCITEMENT_PER_SWIPE = 0.16;
/** Idle time (ms) after the last swipe before the counter deflates. */
const EXCITEMENT_DEFLATE_AFTER_MS = 2_000;

interface FlyingBillSpec {
  id: number;
  centerX: number;
  velocity: number;
}

export function CashSwipeScreen() {
  const cashSwipe = useGameStore((s) => s.cashSwipe);
  const swipeOnce = useGameStore((s) => s.swipeOnce);

  // Re-tick periodically so the HUD and countdown stay live even when
  // the player isn't interacting (or, eventually, when the day rolls).
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const remaining = swipesRemaining(cashSwipe, tick);
  const earned = earnedToday(cashSwipe, tick);
  const capped = isCapReached(cashSwipe, tick);

  const [flying, setFlying] = useState<FlyingBillSpec[]>([]);
  const nextId = useRef(0);

  // Excitement: sustained-swipe energy that scales the earned number
  // in the HUD. Held in a ref AND mirrored to an Animated.Value so
  // the HUD's transform stays on the native thread.
  const excitementRef = useRef(0);
  const excitementAnim = useRef(new Animated.Value(0)).current;
  const deflateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the deflate timer on unmount.
  useEffect(() => {
    return () => {
      if (deflateTimerRef.current) clearTimeout(deflateTimerRef.current);
    };
  }, []);

  const removeFlying = (id: number): void => {
    setFlying((bs) => bs.filter((b) => b.id !== id));
  };

  const bumpExcitement = (): void => {
    excitementRef.current = Math.min(1, excitementRef.current + EXCITEMENT_PER_SWIPE);
    Animated.spring(excitementAnim, {
      toValue: excitementRef.current,
      useNativeDriver: true,
      speed: 30,
      bounciness: 10,
    }).start();
    // Debounced deflate: 2s after the latest swipe, snap back to 0.
    if (deflateTimerRef.current) clearTimeout(deflateTimerRef.current);
    deflateTimerRef.current = setTimeout(() => {
      excitementRef.current = 0;
      Animated.spring(excitementAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 8,
        bounciness: 2,
      }).start();
    }, EXCITEMENT_DEFLATE_AFTER_MS);
  };

  const spawn = (centerX: number, velocity: number): void => {
    const live = useGameStore.getState();
    if (isCapReached(live.cashSwipe, Date.now())) return;
    swipeOnce(Date.now());
    const id = nextId.current++;
    setFlying((bs) => [...bs, { id, centerX, velocity }]);
    setTick(Date.now()); // refresh HUD instantly
    bumpExcitement();
  };

  const panResponder = useMemo(() => {
    let startY = 0;
    let releaseX = 0;
    let maxUp = 0;
    let startTime = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        startY = e.nativeEvent.pageY;
        releaseX = e.nativeEvent.pageX;
        maxUp = 0;
        startTime = Date.now();
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        releaseX = e.nativeEvent.pageX;
        const dy = startY - e.nativeEvent.pageY;
        if (dy > maxUp) maxUp = dy;
      },
      onPanResponderRelease: () => {
        if (maxUp < SWIPE_THRESHOLD) return;
        const duration = Math.max(50, Date.now() - startTime);
        const velocity = Math.min(23, Math.max(13, (maxUp / duration) * 55));
        spawn(releaseX, velocity);
      },
      onPanResponderTerminate: () => {
        // Cancelled mid-drag (e.g. a system gesture stole the touch).
      },
    });
    // Recreated only on mount — the gesture state is stored in closure vars.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1F6A44', '#0C3D28', '#07261A']}
        locations={[0, 0.52, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Flying bills layer — rendered first so they pass BEHIND the HUD. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {flying.map((b) => (
          <FlyingBill
            key={b.id}
            id={b.id}
            centerX={b.centerX}
            startBottom={FLY_START_BOTTOM}
            velocity={b.velocity}
            onComplete={removeFlying}
          />
        ))}
      </View>

      {/* Bottom area — the swipe stack or the empty state. */}
      {capped ? (
        <EmptyCap remainingMs={msUntilLocalMidnight(tick)} />
      ) : (
        <View
          {...panResponder.panHandlers}
          style={styles.stackZone}
          accessibilityRole="button"
          accessibilityLabel="Swipe up on the stack to earn a dollar"
        >
          <BillStack />
          {flying.length < 3 && (
            <View pointerEvents="none" style={styles.hint}>
              <Text style={styles.hintArrow}>↑</Text>
              <Text style={styles.hintText}>Swipe up to make it rain</Text>
            </View>
          )}
        </View>
      )}

      {/* HUD on top — flying bills appear to fly behind its lifted panel. */}
      <CashSwipeHUD
        earned={earned}
        remaining={remaining}
        capped={capped}
        resetInMs={capped ? msUntilLocalMidnight(tick) : 0}
        excitement={excitementAnim}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07261A',
    overflow: 'hidden',
  },
  stackZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 460,
  },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 500,
    alignItems: 'center',
  },
  hintArrow: {
    fontSize: 22,
    color: '#9FE8BD',
  },
  hintText: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: '#CDF3DD',
    marginTop: 2,
  },
});
