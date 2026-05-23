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
import { BankBanner, type BannerMessage } from './BankBanner';
import { useGameStore } from '../../state/store';
import {
  STARTING_BILLS,
  billTotalDue,
  findBillDefinition,
  findLoanTier,
  nextInstallmentCost,
} from '../../engine/economy';
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

  const [sheetOpen, setSheetOpen] = useState(false);
  const [banner, setBanner] = useState<BannerMessage | null>(null);
  const [bannerSeq, setBannerSeq] = useState(0);

  /** Post a fresh banner — a new id each time so a repeat retriggers. */
  const post = (title: string, body: string): void => {
    setBannerSeq((n) => {
      const next = n + 1;
      setBanner({ id: next, title, body });
      return next;
    });
  };

  const billsTotal = useMemo(() => {
    return bank.bills.reduce((sum, bill) => {
      const def = findBillDefinition(STARTING_BILLS, bill.id);
      return def ? sum + billTotalDue(def, bill, clockNow) : sum;
    }, 0);
  }, [bank.bills, clockNow]);

  const handlePayBill = (billId: string): void => {
    const bill = bank.bills.find((b) => b.id === billId);
    const def = findBillDefinition(STARTING_BILLS, billId);
    if (!bill || !def) return;
    const cost = billTotalDue(def, bill, clockNow);
    if (cost > cash) return;
    payBillAction(billId, clockNow);
    post('Bank', `Paid ${def.name} ${formatCurrency(cost)}`);
  };

  const handleRepay = (): void => {
    if (!bank.loan) return;
    const cost = nextInstallmentCost(bank.loan);
    if (cost > cash) return;
    repayLoanAction(clockNow);
    post('Bank', `Repaid ${formatCurrency(cost)} toward your loan`);
  };

  const handleBorrow = (tierId: string): void => {
    const tier = findLoanTier(tierId);
    if (!tier) return;
    takeLoanAction(tierId, clockNow);
    post('Bank', `Borrowed ${formatCurrency(tier.principal)} — funds added to cash`);
  };

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

      <BankBanner message={banner} onDismiss={() => setBanner(null)} />
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
