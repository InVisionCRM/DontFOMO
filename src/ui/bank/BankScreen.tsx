/**
 * BankScreen.tsx — the Bank app.
 * ------------------------------------------------------------------
 * Bills (with their late-fee state), the active loan (or the empty
 * "Borrow" entry), and the bottom sheet of loan tiers. Wires up the
 * store's payBill / takeLoan / repayLoanInstallment actions, and
 * surfaces a top-edge banner on each completed action.
 *
 * Built to the approved Bank mockup; theme tokens from `theme.ts`.
 */
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BankBalanceCard } from './BankBalanceCard';
import { BillRow } from './BillRow';
import { LoanCard } from './LoanCard';
import { LoanBorrowSheet } from './LoanBorrowSheet';
import { WithdrawalHoldCard } from './WithdrawalHoldCard';
import { useGameStore } from '../../state/store';
import {
  STARTING_BILLS,
  billTotalDue,
  findBillDefinition,
  nextInstallmentCost,
} from '../../engine/economy';
import { canRequestWithdrawal } from '../../engine/scam-director';
import { formatCurrency } from '../format';
import {
  appAccent,
  color,
  fontSize,
  fontWeight,
  spacing,
  tabularNums,
} from '../../theme/theme';

/** Top padding so the title clears the notch / simulated status bar. */
const TOP_PAD = 52;

export function BankScreen() {
  const insets = useSafeAreaInsets();
  const cash = useGameStore((s) => s.cash);
  const bank = useGameStore((s) => s.bank);
  const clockNow = useGameStore((s) => s.clock.now);
  const payBillAction = useGameStore((s) => s.payBill);
  const takeLoanAction = useGameStore((s) => s.takeLoan);
  const repayLoanAction = useGameStore((s) => s.repayLoanInstallment);
  const scamDirector = useGameStore((s) => s.scamDirector);
  const requestBankWithdrawal = useGameStore((s) => s.requestBankWithdrawal);
  const payWithdrawalUnlockFee = useGameStore((s) => s.payWithdrawalUnlockFee);

  const [sheetOpen, setSheetOpen] = useState(false);
  const frozen = scamDirector?.frozen ?? { status: 'none' as const, feesPaid: 0 };

  const billsTotal = useMemo(() => {
    return bank.bills.reduce((sum, bill) => {
      const def = findBillDefinition(STARTING_BILLS, bill.id);
      return def ? sum + billTotalDue(def, bill, clockNow) : sum;
    }, 0);
  }, [bank.bills, clockNow]);

  // The store actions now post their own banners — the screen just
  // dispatches them. Affordability guards still happen here so we
  // never even attempt an action we know will no-op.
  const handlePayBill = (billId: string): void => {
    const bill = bank.bills.find((b) => b.id === billId);
    const def = findBillDefinition(STARTING_BILLS, billId);
    if (!bill || !def) return;
    if (billTotalDue(def, bill, clockNow) > cash) return;
    payBillAction(billId, clockNow);
  };

  const handleRepay = (): void => {
    if (!bank.loan) return;
    if (nextInstallmentCost(bank.loan) > cash) return;
    repayLoanAction(clockNow);
  };

  const handleBorrow = (tierId: string): void => {
    takeLoanAction(tierId, clockNow);
  };

  const handleWithdraw = (): void => {
    requestBankWithdrawal(cash, clockNow);
  };

  const handlePayUnlock = (): void => {
    payWithdrawalUnlockFee(clockNow);
  };

  const canWithdraw =
    frozen.status === 'none' && canRequestWithdrawal(cash, frozen);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, TOP_PAD) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Bank</Text>

        <BankBalanceCard cash={cash} />

        <WithdrawalHoldCard
          frozen={frozen}
          cash={cash}
          onRequestWithdraw={handleWithdraw}
          onPayUnlockFee={handlePayUnlock}
          canWithdraw={canWithdraw}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bills due</Text>
          <Text style={[styles.sectionMeta, tabularNums]}>
            {formatCurrency(billsTotal)} total
          </Text>
        </View>
        {bank.bills.map((bill) => {
          const def = findBillDefinition(STARTING_BILLS, bill.id);
          if (!def) return null;
          const cost = billTotalDue(def, bill, clockNow);
          return (
            <BillRow
              key={bill.id}
              def={def}
              bill={bill}
              now={clockNow}
              canPay={cost <= cash}
              onPay={handlePayBill}
            />
          );
        })}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Loans</Text>
        </View>
        <LoanCard
          loan={bank.loan}
          now={clockNow}
          canRepay={
            bank.loan !== null && nextInstallmentCost(bank.loan) <= cash
          }
          onRepay={handleRepay}
          onBorrow={() => setSheetOpen(true)}
        />
      </ScrollView>

      <LoanBorrowSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSelect={handleBorrow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xxl,
    marginBottom: 9,
  },
  sectionTitle: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: color.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionMeta: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: appAccent.bank,
  },
});
