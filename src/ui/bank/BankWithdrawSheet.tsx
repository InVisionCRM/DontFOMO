/**
 * BankWithdrawSheet.tsx — withdraw cash to an external wallet.
 * ------------------------------------------------------------------
 * Large transfers (≥ FROZEN_WITHDRAWAL_MIN_USD) may trigger the
 * Frozen Withdrawal scam when the Director's pacing allows it.
 */
import { useState } from 'react';
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

  const handleSubmit = (): void => {
    const amount = Number.parseFloat(amountText.replace(/,/g, ''));
    if (!Number.isFinite(amount)) return;
    initiateBankWithdrawal(amount, wallet, Date.now());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Withdraw to wallet</Text>
          <Text style={styles.hint}>
            Transfers of {formatCurrency(FROZEN_WITHDRAWAL_MIN_USD)} or more go
            through a routine compliance review.
          </Text>

          <Text style={styles.fieldLabel}>Amount (USD)</Text>
          <TextInput
            style={styles.input}
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="20000"
            placeholderTextColor={color.text.tertiary}
          />

          <Text style={styles.fieldLabel}>Destination wallet</Text>
          <TextInput
            style={styles.input}
            value={wallet}
            onChangeText={setWallet}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="0x…"
            placeholderTextColor={color.text.tertiary}
          />

          <Text style={styles.available}>
            Available: {formatCurrency(cash)}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primary,
              pressed && styles.primaryPressed,
            ]}
            onPress={handleSubmit}
            accessibilityRole="button"
            accessibilityLabel="Submit withdrawal"
          >
            <Text style={styles.primaryText}>Submit withdrawal</Text>
          </Pressable>

          <Pressable
            style={styles.ghost}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
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
  primary: {
    marginTop: spacing.xl,
    backgroundColor: ACCENT,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  primaryPressed: {
    opacity: 0.88,
  },
  primaryText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: '#042f2a',
  },
  ghost: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ghostText: {
    fontSize: fontSize.body,
    color: color.text.secondary,
  },
});
