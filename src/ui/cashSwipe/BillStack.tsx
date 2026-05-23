/**
 * BillStack.tsx — the visible pile of money waiting to be swiped.
 * ------------------------------------------------------------------
 * Seven slightly-rotated stacked bills using the satirical
 * "WORTHLESS PAPER NOTE" image (pre-rotated to portrait at the
 * asset level). Rotations are randomised once per mount and stable
 * across re-renders so the stack doesn't visibly twitch.
 *
 * Presentational only — the swipe-up gesture is wired by the parent.
 */
import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

/** Stack-bill dimensions (W × H). Aspect matches the rotated source image. */
const STACK_BILL_WIDTH = 110;
const STACK_BILL_HEIGHT = 266;
const STACK_BILLS = 7;
/** How far each subsequent bill sits above the one below it (in px). */
const STACK_STEP = 18;

const BILL_SOURCE = require('../../../assets/bill-portrait.png');

export function BillStack() {
  // Random rotations frozen on mount so the stack stays still
  // between renders.
  const rotations = useMemo(
    () =>
      Array.from({ length: STACK_BILLS }, () => (Math.random() - 0.5) * 5),
    [],
  );

  return (
    <View style={styles.stack} pointerEvents="none">
      {rotations.map((rot, i) => (
        <View
          key={i}
          style={[
            styles.bill,
            {
              bottom: i * STACK_STEP,
              transform: [
                { translateX: -STACK_BILL_WIDTH / 2 },
                { rotate: `${rot}deg` },
              ],
            },
          ]}
        >
          <Image source={BILL_SOURCE} style={styles.image} resizeMode="cover" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: '50%',
    bottom: 0,
    width: STACK_BILL_WIDTH,
    height: STACK_BILL_HEIGHT + STACK_BILLS * STACK_STEP,
  },
  bill: {
    position: 'absolute',
    left: '50%',
    width: STACK_BILL_WIDTH,
    height: STACK_BILL_HEIGHT,
    borderRadius: 5,
    overflow: 'hidden',
    // Shadow falls upward from each bill — bills appear to rest on
    // the bills beneath them.
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: -5 },
    shadowRadius: 12,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
