/**
 * BankBalanceCard.tsx — the "Cash on hand" card at the top of Bank.
 * ------------------------------------------------------------------
 * Deep-teal gradient surface. Pure presentational — takes the cash
 * amount and renders it.
 */
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '../format';
import {
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
  tabularNums,
} from '../../theme/theme';

interface BankBalanceCardProps {
  cash: number;
}

/** The card's deep-teal gradient — drawn from the Bank mockup. */
const GRADIENT = ['#134E44', '#0C2A26'] as const;
/** Accent colours used for labels and the card's edge. */
const LABEL = '#8FC4B8';
const BORDER = '#1F5C50';

export function BankBalanceCard({ cash }: BankBalanceCardProps) {
  return (
    <LinearGradient
      colors={GRADIENT}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Text style={styles.label}>Cash on hand</Text>
      <Text style={[styles.amount, tabularNums]}>{formatCurrency(cash)}</Text>
      <Text style={styles.sub}>Available to spend and to pay bills</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    padding: spacing.lg,
  },
  label: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: LABEL,
  },
  amount: {
    fontSize: 33,
    fontWeight: fontWeight.bold,
    letterSpacing: -1,
    color: color.text.primary,
    marginTop: 3,
  },
  sub: {
    fontSize: fontSize.label,
    color: LABEL,
    marginTop: 4,
  },
});
