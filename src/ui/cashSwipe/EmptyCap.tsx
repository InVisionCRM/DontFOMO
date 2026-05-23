/**
 * EmptyCap.tsx — shown when today's swipes are exhausted.
 * ------------------------------------------------------------------
 * Centred message with a live countdown to local midnight. Pure
 * presentational — the parent ticks a clock and passes the remaining
 * milliseconds.
 */
import { StyleSheet, Text, View } from 'react-native';
import { fontWeight, tabularNums } from '../../theme/theme';

interface EmptyCapProps {
  remainingMs: number;
}

const TITLE_COLOR = '#EAFBF0';
const TEXT_COLOR = '#9FE8BD';

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return 'a few seconds';
}

export function EmptyCap({ remainingMs }: EmptyCapProps) {
  return (
    <View style={styles.empty} pointerEvents="none">
      <Text style={styles.title}>Out of swipes</Text>
      <Text style={styles.text}>
        You've earned your $1,000 for today. Come back in{' '}
        <Text style={[styles.countdown, tabularNums]}>
          {formatCountdown(remainingMs)}
        </Text>
        .
      </Text>
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
});
