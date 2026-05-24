/**
 * ProgressBars.tsx — segmented progress for the onboarding flow.
 * ------------------------------------------------------------------
 * The mockup uses four equal-width bars; the filled count shows how
 * far the player is through Profile → Wallet → Seed → Confirm. The
 * Welcome and Done steps don't show progress at all.
 */
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../theme/theme';

interface Props {
  /** Total segments. */
  total: number;
  /** How many are filled (clamped to [0, total]). */
  filled: number;
}

export function ProgressBars({ total, filled }: Props) {
  const clamped = Math.max(0, Math.min(filled, total));
  return (
    <View style={styles.row} accessibilityRole="progressbar">
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.bar, i < clamped ? styles.barOn : styles.barOff]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.xxl,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  barOff: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  barOn: {
    backgroundColor: '#FFFFFF',
  },
});
