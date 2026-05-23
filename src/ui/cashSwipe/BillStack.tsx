/**
 * BillStack.tsx — the visible pile of money waiting to be swiped.
 * ------------------------------------------------------------------
 * Seven slightly-rotated stacked bills, the topmost one sealed with
 * a $. Rotations are randomised once per mount and stable across
 * re-renders so the stack doesn't visibly twitch.
 *
 * Presentational only — the swipe-up gesture is wired by the parent.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const STACK_BILL_WIDTH = 128;
const STACK_BILL_HEIGHT = 190;
const BG = ['#54B97E', '#2F8F54'] as const;
const BORDER = '#173E29';
const INNER_BORDER = 'rgba(255,255,255,0.30)';
const STACK_BILLS = 7;

export function BillStack() {
  // Random rotations frozen on mount.
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
              bottom: i * 16,
              transform: [
                { translateX: -STACK_BILL_WIDTH / 2 },
                { rotate: `${rot}deg` },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={BG}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 9 }]}
          />
          <View style={styles.innerBorder} />
          {i === STACK_BILLS - 1 && (
            <View style={styles.seal}>
              <Text style={styles.sealText}>$</Text>
            </View>
          )}
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
    height: STACK_BILL_HEIGHT + STACK_BILLS * 16,
  },
  bill: {
    position: 'absolute',
    left: '50%',
    width: STACK_BILL_WIDTH,
    height: STACK_BILL_HEIGHT,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 8,
  },
  innerBorder: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    left: 5,
    right: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: INNER_BORDER,
  },
  seal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 46,
    height: 46,
    marginLeft: -23,
    marginTop: -23,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#EAFBF0',
  },
});
