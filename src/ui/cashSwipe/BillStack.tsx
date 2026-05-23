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
const STACK_BILL_WIDTH = 220;
const STACK_BILL_HEIGHT = 530;
const STACK_BILLS = 7;
/** How far each subsequent bill sits above the one below it (in px). */
const STACK_STEP = 2;
/**
 * Distance (px) the stack is shifted BELOW its parent's bottom edge,
 * so that ~1/4 of each bill clips off the bottom of the screen — the
 * stack reads as a wad you're pulling bills off the top of, not a
 * fully-displayed object.
 */
const STACK_DROP = Math.round(STACK_BILL_HEIGHT / 4);

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
  // Full-width container; bills inside centre themselves on the
  // parent's horizontal midpoint. Fixes a prior bug where the stack
  // container was anchored at `left: '50%'` AND given an explicit
  // width — pushing the entire stack into the right half.
  //
  // The negative `bottom` slides the whole stack down so the bottom
  // ~1/4 of each bill clips off the screen.
  stack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -STACK_DROP,
    height: STACK_BILL_HEIGHT + (STACK_BILLS - 1) * STACK_STEP,
  },
  bill: {
    position: 'absolute',
    // Anchor each bill at the parent's horizontal centre; the JSX
    // applies `translateX: -W/2` so the bill's centre lands on the
    // centre line.
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
