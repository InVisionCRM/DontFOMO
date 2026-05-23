/**
 * BalanceCard.tsx — the Exchange balance summary card.
 * ------------------------------------------------------------------
 * Total balance, the cash / crypto split, and the on/off-ramp buttons.
 * Presentational — the buttons report taps via props (wired to the
 * on/off-ramp flow in checkpoint 3).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatCurrency } from '../format';
import {
  appAccent,
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
  tabularNums,
} from '../../theme/theme';

interface BalanceCardProps {
  total: number;
  cash: number;
  cryptoValue: number;
  onAddCash?: () => void;
  onCashOut?: () => void;
}

export function BalanceCard({
  total,
  cash,
  cryptoValue,
  onAddCash,
  onCashOut,
}: BalanceCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Total balance</Text>
      <Text style={[styles.total, tabularNums]}>{formatCurrency(total)}</Text>

      <View style={styles.split}>
        <View style={styles.mini}>
          <Text style={styles.miniKey}>Cash</Text>
          <Text style={[styles.miniValue, tabularNums]}>
            {formatCurrency(cash)}
          </Text>
        </View>
        <View style={styles.mini}>
          <Text style={styles.miniKey}>Crypto</Text>
          <Text style={[styles.miniValue, tabularNums]}>
            {formatCurrency(cryptoValue)}
          </Text>
        </View>
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={[styles.btn, styles.btnPrimary]}
          onPress={onAddCash}
          accessibilityRole="button"
        >
          <Text style={styles.btnPrimaryText}>Add cash</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnGhost]}
          onPress={onCashOut}
          accessibilityRole="button"
        >
          <Text style={styles.btnGhostText}>Cash out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  label: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: color.text.secondary,
  },
  total: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    marginTop: spacing.xs,
    letterSpacing: -1,
  },
  split: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  mini: {
    flex: 1,
    backgroundColor: color.bg.elevated,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  miniKey: {
    fontSize: fontSize.caption,
    color: color.text.secondary,
  },
  miniValue: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    marginTop: 2,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  btnPrimary: {
    backgroundColor: appAccent.coinDeck,
  },
  btnPrimaryText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  btnGhost: {
    backgroundColor: color.bg.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.strong,
  },
  btnGhostText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
});
