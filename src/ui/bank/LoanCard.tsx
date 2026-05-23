/**
 * LoanCard.tsx — the player's active loan, or the "no loan" entry.
 * ------------------------------------------------------------------
 * Two layouts:
 *   - active loan: balance, APR, next payment line, Repay / Borrow buttons
 *   - no loan: a quiet card with a single Borrow button
 *
 * Pure presentational; the screen owns the actions.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  daysUntilDue,
  findLoanTier,
  nextInstallmentCost,
  type LoanState,
} from '../../engine/economy';
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

interface LoanCardProps {
  loan: LoanState | null;
  now: number;
  canRepay: boolean;
  onRepay: () => void;
  onBorrow: () => void;
}

const CARD_BG = '#18201F';
const CARD_BORDER = '#243230';
const REPAY_BG = '#1F5C50';
const REPAY_TEXT = '#C7F5EC';

/** "due in N days" / "due today" / "overdue by N days" for the loan. */
function paymentDueLine(loan: LoanState, now: number): string {
  const days = Math.ceil(daysUntilDue({ id: '', nextDueAt: loan.nextPaymentDueAt }, now));
  if (days < 0) {
    const overdue = -days;
    return overdue === 1
      ? 'overdue by 1 day. Interest compounds.'
      : `overdue by ${overdue} days. Interest compounds.`;
  }
  if (days === 0) return 'due today.';
  if (days === 1) return 'due in 1 day. Miss it and interest compounds.';
  return `due in ${days} days. Miss it and interest compounds.`;
}

export function LoanCard({
  loan,
  now,
  canRepay,
  onRepay,
  onBorrow,
}: LoanCardProps) {
  if (!loan) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>No active loan.</Text>
        <Text style={styles.emptySub}>
          Borrow when you need cash — bigger loans have harsher terms.
        </Text>
        <View style={styles.btns}>
          <Pressable
            style={styles.borrow}
            onPress={onBorrow}
            accessibilityRole="button"
          >
            <Text style={styles.borrowText}>Borrow</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const tier = findLoanTier(loan.tierId);
  const aprText = tier ? `${(tier.aprBps / 100).toFixed(0)}% APR` : '';
  const installment = nextInstallmentCost(loan);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={[styles.balance, tabularNums]}>
          {formatCurrency(loan.totalRemaining)}
        </Text>
        <Text style={styles.apr}>{aprText}</Text>
      </View>
      <Text style={styles.meta}>
        Next payment {formatCurrency(installment)} · {paymentDueLine(loan, now)}
      </Text>
      <View style={styles.btns}>
        <Pressable
          style={[styles.repay, !canRepay && styles.btnDisabled]}
          onPress={() => canRepay && onRepay()}
          disabled={!canRepay}
          accessibilityRole="button"
          accessibilityLabel={`Repay ${formatCurrency(installment)}`}
        >
          <Text style={styles.repayText}>Repay</Text>
        </Pressable>
        <Pressable
          style={styles.borrow}
          onPress={onBorrow}
          accessibilityRole="button"
        >
          <Text style={styles.borrowText}>Borrow more</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CARD_BORDER,
    borderRadius: radius.lg,
    padding: 15,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  balance: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  apr: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: color.warning,
  },
  meta: {
    fontSize: fontSize.label,
    color: color.text.secondary,
    marginTop: 7,
  },
  empty: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  emptySub: {
    fontSize: fontSize.label,
    color: color.text.secondary,
    marginTop: 4,
  },
  btns: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 13,
  },
  repay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: REPAY_BG,
  },
  repayText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: REPAY_TEXT,
  },
  borrow: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: CARD_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: appAccent.bank,
  },
  borrowText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: appAccent.bank,
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
