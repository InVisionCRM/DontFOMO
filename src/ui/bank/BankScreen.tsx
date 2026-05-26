/**
 * BankScreen.tsx — the Bank app.
 * ------------------------------------------------------------------
 * Bills (with their late-fee state), the active loan (or the empty
 * "Borrow" entry), and the bottom sheet of loan tiers. Wires up the
 * store's payBill / takeLoan / repayLoanInstallment actions, and
 * surfaces a top-edge banner on each completed action.
 *
 * Built to the approved Bank mockup; theme tokens from `theme.ts`.
 *
 * When `bank.regulatoryHold` is non-null, the screen swaps to the
 * Authority Notice lockout (Stage 6.4 / Scam Library v1.1 Event 13).
 * The lock screen prints the genuine bank address `notices@bank.com`
 * — the answer key the player matches against the two paired emails
 * in Mail. The countdown is live: when the hold's `expiresAt` passes,
 * the Director auto-resolves as fell-for on the next tick.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { BankBalanceCard } from './BankBalanceCard';
import { BillRow } from './BillRow';
import { LoanCard } from './LoanCard';
import { LoanBorrowSheet } from './LoanBorrowSheet';
import { useGameStore } from '../../state/store';
import {
  STARTING_BILLS,
  billTotalDue,
  findBillDefinition,
  nextInstallmentCost,
  type PendingWithdrawal,
} from '../../engine/economy';
import { BANK_OFFICIAL_ADDRESS } from '../../data/authorityNotice';
import { truncateWallet } from '../../data/frozenWithdrawal';
import { BankWithdrawSheet } from './BankWithdrawSheet';
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
  const openApp = useGameStore((s) => s.openApp);
  const resolveScamInstance = useGameStore((s) => s.resolveScamInstance);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  if (bank.regulatoryHold) {
    return (
      <RegulatoryHoldLockout
        hold={bank.regulatoryHold}
        now={clockNow}
        onOpenMail={() => openApp('mail')}
      />
    );
  }

  if (bank.pendingWithdrawal) {
    return (
      <WithdrawalHoldLockout
        hold={bank.pendingWithdrawal}
        now={clockNow}
        onOpenMail={() => openApp('mail')}
        onCancel={() =>
          resolveScamInstance(
            bank.pendingWithdrawal!.instanceId,
            false,
            'cancelled',
          )
        }
      />
    );
  }

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

        <Pressable
          style={({ pressed }) => [
            styles.withdrawBtn,
            pressed && styles.withdrawBtnPressed,
          ]}
          onPress={() => setWithdrawOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Withdraw to external wallet"
        >
          <Text style={styles.withdrawBtnText}>Withdraw to wallet</Text>
        </Pressable>

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

      <BankWithdrawSheet
        visible={withdrawOpen}
        cash={cash}
        onClose={() => setWithdrawOpen(false)}
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
  withdrawBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#1F5C50',
    backgroundColor: '#0f2f2b',
    alignItems: 'center',
  },
  withdrawBtnPressed: {
    opacity: 0.9,
  },
  withdrawBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: appAccent.bank,
  },
});

/* -------- Bank lockouts (Authority Notice + Frozen Withdrawal) -------- */

import type { RegulatoryHold } from '../../engine/economy';

/** Format a remaining-ms countdown as "HH:MM:SS". Clamped at 00:00:00. */
function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

interface RegulatoryHoldLockoutProps {
  hold: RegulatoryHold;
  /** Current game-clock now (epoch ms) — drives the live countdown. */
  now: number;
  /** Player tapped "Open Mail to resolve". */
  onOpenMail: () => void;
}

function RegulatoryHoldLockout(props: RegulatoryHoldLockoutProps) {
  const remaining = formatRemaining(props.hold.expiresAt - props.now);
  return (
    <View style={lockStyles.root}>
      <View style={lockStyles.modal}>
        <View style={lockStyles.seal}>
          <Svg width={46} height={46} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 3l8 4v6c0 4.5 -3.5 7.5 -8 8c-4.5 -0.5 -8 -3.5 -8 -8V7z"
              stroke="#5cead0"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M9 12l2 2l4 -4"
              stroke="#5cead0"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <Text style={lockStyles.agency}>Federal Crypto Compliance Bureau</Text>
        <Text style={lockStyles.title}>Regulatory hold placed</Text>
        <Text style={lockStyles.sub}>
          Your account has been frozen pending identity verification. A
          notice has been sent to your Mail inbox detailing your case and
          the steps to release the hold.
        </Text>
        <View style={lockStyles.caseRow}>
          <Text style={lockStyles.caseLabel}>Case ref.</Text>
          <Text style={[lockStyles.caseValue, tabularNums]}>
            {props.hold.caseRef}
          </Text>
        </View>
        <View style={lockStyles.countdownRow}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={9} stroke="#fda4a8" strokeWidth={2} />
            <Path
              d="M12 7v5l3 2"
              stroke="#fda4a8"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={[lockStyles.countdownText, tabularNums]}>
            Account locked — resolve within {remaining}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            lockStyles.cta,
            pressed && lockStyles.ctaPressed,
          ]}
          onPress={props.onOpenMail}
          accessibilityRole="button"
          accessibilityLabel="Open Mail to resolve the hold"
        >
          <Text style={lockStyles.ctaText}>Open Mail to resolve</Text>
        </Pressable>
        <Text style={lockStyles.support}>
          Your Bank's official address is{' '}
          <Text style={lockStyles.supportEmail}>{BANK_OFFICIAL_ADDRESS}</Text>.
          Verify any email about your account matches it exactly.
        </Text>
      </View>
    </View>
  );
}

interface WithdrawalHoldLockoutProps {
  hold: PendingWithdrawal;
  now: number;
  onOpenMail: () => void;
  onCancel: () => void;
}

function WithdrawalHoldLockout(props: WithdrawalHoldLockoutProps) {
  const remaining = formatRemaining(props.hold.holdExpiresAt - props.now);
  const amountLabel = formatCurrency(props.hold.amount);
  return (
    <View style={lockStyles.root}>
      <View style={lockStyles.modal}>
        <Text style={lockStyles.agency}>Pending Compliance Review</Text>
        <Text style={lockStyles.title}>Your withdrawal is on hold</Text>
        <Text style={lockStyles.sub}>
          Large transfers go through a routine check. You will get Mail when it
          clears. You do not need to do anything.
        </Text>
        <View style={lockStyles.txCard}>
          <Text style={lockStyles.txLabel}>Pending withdrawal</Text>
          <View style={lockStyles.txRow}>
            <Text style={lockStyles.txKey}>Amount</Text>
            <Text style={[lockStyles.txVal, tabularNums]}>{amountLabel}</Text>
          </View>
          <View style={lockStyles.txRow}>
            <Text style={lockStyles.txKey}>To wallet</Text>
            <Text style={lockStyles.txAddr}>
              {truncateWallet(props.hold.destinationWallet)}
            </Text>
          </View>
          <View style={lockStyles.txRow}>
            <Text style={lockStyles.txKey}>Reference</Text>
            <Text style={[lockStyles.txVal, tabularNums]}>
              {props.hold.reference}
            </Text>
          </View>
          <Text style={lockStyles.txStatus}>
            Held — compliance review · resolve within {remaining}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            lockStyles.cta,
            pressed && lockStyles.ctaPressed,
          ]}
          onPress={props.onOpenMail}
          accessibilityRole="button"
          accessibilityLabel="Open Mail for updates"
        >
          <Text style={lockStyles.ctaText}>Open Mail for updates</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            lockStyles.ghostCta,
            pressed && lockStyles.ctaPressed,
          ]}
          onPress={props.onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel the withdrawal"
        >
          <Text style={lockStyles.ghostCtaText}>
            Cancel the withdrawal · funds stay in Bank
          </Text>
        </Pressable>
        <Text style={lockStyles.support}>
          Your Bank's official address is{' '}
          <Text style={lockStyles.supportEmail}>{BANK_OFFICIAL_ADDRESS}</Text>.
          Anything else asking about this hold is not your bank.
        </Text>
      </View>
    </View>
  );
}

// Mockup-derived palette stays inline per CLAUDE.md §13 convention.
const SEAL_BG = '#0c1916';
const SEAL_RING = '#1f6a60';
const AGENCY = '#5cead0';
const HOLD_TEXT = '#eaf2ef';
const HOLD_SUB = '#95b0a8';
const CTA_GRAD_TOP = '#2dd4bf';
const CTA_GRAD_BOTTOM = '#0f766e';
const ALARM_BG = 'rgba(234,57,67,0.12)';
const ALARM_BORDER = 'rgba(234,57,67,0.32)';
const ALARM_TEXT = '#fda4a8';

const lockStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07100f',
    paddingHorizontal: 22,
    paddingTop: 110,
    paddingBottom: 40,
    alignItems: 'stretch',
  },
  modal: {
    backgroundColor: SEAL_BG,
    borderWidth: 1,
    borderColor: '#1a3833',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  seal: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#0a2c27',
    borderWidth: 2,
    borderColor: SEAL_RING,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  agency: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: AGENCY,
    marginBottom: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: HOLD_TEXT,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 13.5,
    color: HOLD_SUB,
    lineHeight: 20,
    marginTop: 9,
    textAlign: 'center',
  },
  caseRow: {
    marginTop: 14,
    width: '100%',
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caseLabel: {
    color: HOLD_SUB,
    fontSize: 10.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  caseValue: {
    color: HOLD_TEXT,
    fontWeight: '800',
    fontSize: 12.5,
  },
  countdownRow: {
    marginTop: 9,
    width: '100%',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: ALARM_BG,
    borderWidth: 1,
    borderColor: ALARM_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  countdownText: {
    color: ALARM_TEXT,
    fontSize: 12.5,
    fontWeight: '700',
  },
  cta: {
    marginTop: 14,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: CTA_GRAD_TOP,
    borderBottomColor: CTA_GRAD_BOTTOM,
    borderBottomWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.86,
  },
  ctaText: {
    color: '#04221e',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  support: {
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#18302c',
    fontSize: 11.5,
    color: '#6b8079',
    lineHeight: 17,
    textAlign: 'center',
  },
  supportEmail: {
    color: '#cdd9d5',
    fontWeight: '700',
  },
  ghostCta: {
    marginTop: 10,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
  },
  ghostCtaText: {
    color: HOLD_SUB,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  txCard: {
    marginTop: 14,
    width: '100%',
    padding: 13,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  txLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: HOLD_SUB,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txKey: {
    color: HOLD_SUB,
    fontSize: 12,
  },
  txVal: {
    color: HOLD_TEXT,
    fontWeight: '800',
    fontSize: 14,
  },
  txAddr: {
    color: HOLD_TEXT,
    fontWeight: '600',
    fontSize: 12,
  },
  txStatus: {
    marginTop: 4,
    fontSize: 11.5,
    fontWeight: '700',
    color: ALARM_TEXT,
    textAlign: 'center',
  },
});
