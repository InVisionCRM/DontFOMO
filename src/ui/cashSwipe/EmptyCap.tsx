/**
 * EmptyCap.tsx — shown when today's swipes are exhausted.
 * ------------------------------------------------------------------
 * Centred message with a live countdown to local midnight. Pure
 * presentational — the parent ticks a clock and passes the remaining
 * milliseconds.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '../../state/store';
import { formatCountdownShort } from '../format';
import { fontWeight, tabularNums } from '../../theme/theme';

interface EmptyCapProps {
  remainingMs: number;
}

const TITLE_COLOR = '#EAFBF0';
const TEXT_COLOR = '#9FE8BD';

export function EmptyCap({ remainingMs }: EmptyCapProps) {
  const resetCashSwipeToday = useGameStore((s) => s.resetCashSwipeToday);
  return (
    <View style={styles.empty}>
      <View pointerEvents="none">
        <Text style={styles.title}>Out of swipes</Text>
        <Text style={styles.text}>
          You've earned your $1,000 for today. Come back in{' '}
          <Text style={[styles.countdown, tabularNums]}>
            {formatCountdownShort(remainingMs)}
          </Text>
          .
        </Text>
      </View>
      {__DEV__ && (
        <Pressable
          style={styles.resetBtn}
          onPress={() => resetCashSwipeToday(Date.now())}
          accessibilityRole="button"
          accessibilityLabel="Reset CashSwipe cap (dev)"
        >
          <Text style={styles.resetText}>Reset cap (dev)</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: TITLE_COLOR,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    color: TEXT_COLOR,
    marginTop: 8,
    lineHeight: 21,
    textAlign: 'center',
  },
  countdown: {
    color: TITLE_COLOR,
    fontWeight: fontWeight.semibold,
  },
  resetBtn: {
    marginTop: 28,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  resetText: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.4,
  },
});
