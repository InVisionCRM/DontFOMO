/**
 * WithdrawalHoldCard.tsx — Frozen Withdrawal scam surface (Stage 6).
 * ------------------------------------------------------------------
 * Shown on Bank when the scam is active. Withdraw stays blocked;
 * paying the fake fee is a teaching trap (never unlocks funds).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  WITHDRAWAL_UNLOCK_FEE,
  type FrozenWithdrawalState,
} from '../../engine/scam-director';
import { formatCurrency } from '../format';
import {
  appAccent,
  fontSize,
  fontWeight,
  radius,
  spacing,
  tabularNums,
} from '../../theme/theme';

interface Props {
  frozen: FrozenWithdrawalState;
  cash: number;
  onRequestWithdraw: () => void;
  onPayUnlockFee: () => void;
  canWithdraw: boolean;
}

export function WithdrawalHoldCard({
  frozen,
  cash,
  onRequestWithdraw,
  onPayUnlockFee,
  canWithdraw,
}: Props) {
  if (frozen.status === 'none' && !canWithdraw) {
    return (
      <View style={styles.cardMuted}>
        <Text style={styles.label}>Withdraw to wallet</Text>
        <Text style={styles.hint}>
          Build cash above $2,500 to unlock withdrawals to your on-phone
          wallet.
        </Text>
      </View>
    );
  }

  if (frozen.status === 'none' && canWithdraw) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Withdraw to wallet</Text>
        <Text style={styles.hint}>
          Move cash off the Bank ledger into your Wallet balance.
        </Text>
        <Pressable
          onPress={onRequestWithdraw}
          style={styles.primaryBtn}
          accessibilityRole="button"
          accessibilityLabel="Withdraw available cash to wallet"
        >
          <Text style={styles.primaryBtnText}>Withdraw {formatCurrency(cash)}</Text>
        </Pressable>
      </View>
    );
  }

  const attempted = frozen.attemptedAmount ?? 0;
  const canPayFee = cash >= WITHDRAWAL_UNLOCK_FEE;

  return (
    <View style={[styles.card, styles.cardDanger]}>
      <Text style={styles.dangerLabel}>Withdrawal frozen</Text>
      <Text style={styles.hint}>
        Your {formatCurrency(attempted)} withdrawal is on hold. Scammers ask for
        an upfront “verification” fee — paying it will not release your money.
      </Text>
      {frozen.feesPaid > 0 ? (
        <Text style={[styles.feesPaid, tabularNums]}>
          Fees paid so far: {formatCurrency(frozen.feesPaid)}
        </Text>
      ) : null}
      <Pressable
        onPress={onPayUnlockFee}
        disabled={!canPayFee}
        style={[styles.feeBtn, !canPayFee && styles.feeBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel={`Pay unlock fee ${formatCurrency(WITHDRAWAL_UNLOCK_FEE)}`}
        accessibilityState={{ disabled: !canPayFee }}
      >
        <Text style={styles.feeBtnText}>
          Pay unlock fee ({formatCurrency(WITHDRAWAL_UNLOCK_FEE)})
        </Text>
      </Pressable>
      <Text style={styles.teaching}>
        Real banks and exchanges never charge a separate fee to access your own
        balance.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 8,
  },
  cardMuted: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 6,
  },
  cardDanger: {
    backgroundColor: 'rgba(234, 57, 67, 0.1)',
    borderColor: 'rgba(234, 57, 67, 0.4)',
  },
  label: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: appAccent.bank,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dangerLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: '#EA3943',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: fontSize.body,
    color: '#E5E7EB',
    lineHeight: 20,
  },
  feesPaid: {
    fontSize: fontSize.label,
    color: '#FCA5A5',
    fontWeight: fontWeight.semibold,
  },
  primaryBtn: {
    backgroundColor: appAccent.bank,
    borderRadius: radius.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#042F2E',
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  feeBtn: {
    borderRadius: radius.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EA3943',
    marginTop: 4,
  },
  feeBtnDisabled: {
    opacity: 0.45,
  },
  feeBtnText: {
    color: '#FDA4AF',
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
  },
  teaching: {
    fontSize: fontSize.caption,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 17,
  },
});
