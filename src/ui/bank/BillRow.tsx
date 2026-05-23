/**
 * BillRow.tsx — one bill in the Bills-due list.
 * ------------------------------------------------------------------
 * Shows the bill's name, the due-state line (red when overdue),
 * the total owed (face amount + accrued late fee), and a Pay button.
 *
 * Pure presentational. The screen handles the payBill side effect.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  billLateFee,
  billTotalDue,
  daysOverdue,
  daysUntilDue,
  type BillDefinition,
  type BillState,
} from '../../engine/economy';
import { formatCurrency } from '../format';
import {
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
  tabularNums,
} from '../../theme/theme';

interface BillRowProps {
  def: BillDefinition;
  bill: BillState;
  now: number;
  canPay: boolean;
  onPay: (billId: string) => void;
}

/** Format the "Due in N days" / "Overdue by N days" line. */
function dueLine(bill: BillState, now: number): string {
  const overdue = daysOverdue(bill, now);
  if (overdue > 0) {
    return overdue === 1 ? 'Overdue by 1 day' : `Overdue by ${overdue} days`;
  }
  const until = Math.ceil(daysUntilDue(bill, now));
  if (until <= 0) return 'Due today';
  return until === 1 ? 'Due in 1 day' : `Due in ${until} days`;
}

export function BillRow({ def, bill, now, canPay, onPay }: BillRowProps) {
  const overdue = daysOverdue(bill, now) > 0;
  const fee = billLateFee(def, bill, now);
  const total = billTotalDue(def, bill, now);

  return (
    <View style={[styles.row, overdue && styles.rowLate]}>
      <View style={styles.info}>
        <Text style={styles.name}>{def.name}</Text>
        <Text style={[styles.due, overdue && styles.dueLate]}>
          {dueLine(bill, now)}
          {fee > 0 && ` · +${formatCurrency(fee)} late fee`}
        </Text>
      </View>
      <Text style={[styles.amount, tabularNums]}>{formatCurrency(total)}</Text>
      <Pressable
        style={[styles.pay, !canPay && styles.payDisabled]}
        onPress={() => canPay && onPay(def.id)}
        disabled={!canPay}
        accessibilityRole="button"
        accessibilityLabel={`Pay ${def.name} ${formatCurrency(total)}`}
      >
        <Text style={styles.payText}>Pay</Text>
      </Pressable>
    </View>
  );
}

/** Tint for the late-state border + background — derived from theme.danger. */
const LATE_BG = 'rgba(234,57,67,0.10)';
const LATE_BORDER = 'rgba(234,57,67,0.50)';
const ROW_BORDER = '#243230';
const ROW_BG = '#18201F';
const PAY_BG = '#1F5C50';
const PAY_TEXT = '#C7F5EC';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: ROW_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ROW_BORDER,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  rowLate: {
    backgroundColor: LATE_BG,
    borderColor: LATE_BORDER,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  due: {
    fontSize: fontSize.caption,
    color: color.text.secondary,
    marginTop: 2,
  },
  dueLate: {
    color: color.danger,
  },
  amount: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  pay: {
    backgroundColor: PAY_BG,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
  },
  payDisabled: {
    opacity: 0.4,
  },
  payText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: PAY_TEXT,
  },
});
