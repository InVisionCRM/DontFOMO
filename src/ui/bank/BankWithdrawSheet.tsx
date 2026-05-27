/**
 * BankWithdrawSheet.tsx — withdraw cash to an external wallet.
 * ------------------------------------------------------------------
 * Large transfers (≥ FROZEN_WITHDRAWAL_MIN_USD) may trigger the
 * Frozen Withdrawal scam when the Director's pacing allows it.
 */
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FROZEN_WITHDRAWAL_MIN_USD } from '../../data/frozenWithdrawal';
import { useGameStore } from '../../state/store';
import { formatCurrency } from '../format';
import {
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
  tabularNums,
} from '../../theme/theme';

const SHEET_BG = '#0C2A26';
const INPUT_BG = '#163832';
const ACCENT = '#2DD4BF';
const LABEL_COLOR = '#8FC4B8';

interface BankWithdrawSheetProps {
  visible: boolean;
  cash: number;
  onClose: () => void;
}

export function BankWithdrawSheet({
  visible,
  cash,
  onClose,
}: BankWithdrawSheetProps) {
  const initiateBankWithdrawal = useGameStore((s) => s.initiateBankWithdrawal);
  const [amountText, setAmountText] = useState('20000');
  const [wallet, setWallet] = useState('0xPlayerWallet9b4f');
  const [submitting, setSubmitting] = useState(false);

  const parsedAmount = useMemo(() => {
    const n = Number.parseFloat(amountText.replace(/,/g, ''));
    return Number.isFinite(n) ? n : NaN;
  }, [amountText]);

  const trimmedWallet = wallet.trim();
  const amountInvalid = !Number.isFinite(parsedAmount) || parsedAmount <= 0;
  const amountTooLarge =
    Number.isFinite(parsedAmount) && parsedAmount > cash;
  const walletInvalid = trimmedWallet.length < 8;
  const canSubmit =
    !submitting && !amountInvalid && !amountTooLarge && !walletInvalid;

  const validationMessage: string | null = (() => {
    if (amountInvalid) return 'Enter an amount greater than $0.';
    if (amountTooLarge)
      return `Amount exceeds your available cash (${formatCurrency(cash)}).`;
    if (walletInvalid)
      return 'Destination wallet looks too short — check the address.';
    return null;
  })();

  const handleSubmit = (): void => {
    if (!canSubmit) return;
    setSubmitting(true);
    initiateBankWithdrawal(parsedAmount, trimmedWallet, Date.now());
    onClose();
    // Reset for the next time the sheet opens.
    setSubmitting(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss withdrawal sheet"
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title} accessibilityRole="header">
            Withdraw to wallet
          </Text>
          <Text style={styles.hint}>
            Transfers of {formatCurrency(FROZEN_WITHDRAWAL_MIN_USD)} or more go
            through a routine compliance review before they clear.
          </Text>

          <Text style={styles.fieldLabel} nativeID="bank-withdraw-amount-label">
            Amount (USD)
          </Text>
          <TextInput
            style={[styles.input, tabularNums]}
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="20000"
            placeholderTextColor={color.text.tertiary}
            accessibilityLabel="Withdrawal amount in US dollars"
            accessibilityLabelledBy="bank-withdraw-amount-label"
            accessibilityHint="Enter the amount of cash to withdraw"
          />

          <Text style={styles.fieldLabel} nativeID="bank-withdraw-wallet-label">
            Destination wallet
          </Text>
          <TextInput
            style={styles.input}
            value={wallet}
            onChangeText={setWallet}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="0x…"
            placeholderTextColor={color.text.tertiary}
            accessibilityLabel="Destination wallet address"
            accessibilityLabelledBy="bank-withdraw-wallet-label"
            accessibilityHint="The external wallet that will receive the funds"
          />

          <Text
            style={styles.available}
            accessibilityLabel={`Available cash ${formatCurrency(cash)}`}
          >
            Available: {formatCurrency(cash)}
          </Text>

          {validationMessage && (
            <Text
              style={styles.validation}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
            >
              {validationMessage}
            </Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.primary,
              pressed && styles.primaryPressed,
              !canSubmit && styles.primaryDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={
              submitting ? 'Submitting withdrawal' : 'Submit withdrawal'
            }
            accessibilityHint="Sends the cash to the destination wallet"
            accessibilityState={{ disabled: !canSubmit, busy: submitting }}
          >
            <Text style={styles.primaryText}>
              {submitting ? 'Submitting…' : 'Submit withdrawal'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.ghost}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel withdrawal"
            accessibilityHint="Closes this sheet without sending any funds"
          >
            <Text style={styles.ghostText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
    borderWidth: 1,
    borderColor: '#1F5C50',
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: fontSize.label,
    color: color.text.secondary,
    lineHeight: 18,
  },
  fieldLabel: {
    marginTop: spacing.lg,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: color.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    marginTop: spacing.sm,
    backgroundColor: INPUT_BG,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: color.text.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1F5C50',
  },
  available: {
    marginTop: spacing.md,
    fontSize: fontSize.label,
    color: LABEL_COLOR,
  },
  validation: {
    marginTop: spacing.sm,
    fontSize: fontSize.caption,
    color: color.danger,
    lineHeight: 16,
  },
  primary: {
    marginTop: spacing.xl,
    backgroundColor: ACCENT,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: {
    opacity: 0.88,
  },
  primaryDisabled: {
    opacity: 0.4,
  },
  primaryText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: '#042f2a',
  },
  ghost: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    fontSize: fontSize.body,
    color: color.text.secondary,
  },
});
