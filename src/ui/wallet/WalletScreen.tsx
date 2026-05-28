/**
 * WalletScreen.tsx — the Wallet app (v1).
 * ------------------------------------------------------------------
 * Shows on-device crypto holdings and estimated USD value. Bank cash
 * lives in the Bank app; this is the player's self-custody view.
 */
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { holdingsValue } from '../../engine/economy';
import { TOKENS } from '../../data/tokens';
import { useGameStore } from '../../state/store';
import {
  formatCurrency,
  formatSignedPercent,
  formatTokenAmount,
  formatTokenPrice,
} from '../format';
import {
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
  tabularNums,
} from '../../theme/theme';
import { buildHoldingA11yLabel } from './walletA11y';

const TOP_PAD = 52;
const WALLET_ACCENT = '#FBB24A';

/**
 * Stable empty-holdings reference. A fresh `{}` inside or after the
 * selector would change identity on every render and re-fire memos.
 */
const EMPTY_HOLDINGS: Record<string, number> = {};

export function WalletScreen() {
  const insets = useSafeAreaInsets();
  const holdings = useGameStore((s) => s.holdings) ?? EMPTY_HOLDINGS;
  const market = useGameStore((s) => s.market);
  const openApp = useGameStore((s) => s.openApp);

  const rows = useMemo(() => {
    return Object.entries(holdings)
      .filter(([, amount]) => amount > 0)
      .map(([id, amount]) => {
        const token = market.tokens[id];
        const def = TOKENS.find((t) => t.id === id);
        const price = token?.price ?? 0;
        const dayOpen = token?.dayOpen ?? price;
        const usd = amount * price;
        const dayChangePct =
          dayOpen > 0 ? ((price - dayOpen) / dayOpen) * 100 : 0;
        return {
          id,
          name: def?.name ?? id,
          amount,
          price,
          usd,
          dayChangePct,
        };
      })
      .sort((a, b) => b.usd - a.usd);
  }, [holdings, market.tokens]);

  const totalUsd = holdingsValue(holdings, market);
  const hasHoldings = rows.length > 0;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, TOP_PAD) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">
          Wallet
        </Text>
        <Text style={styles.subtitle}>
          Self-custody · not your bank balance
        </Text>

        <View
          style={styles.totalCard}
          accessible
          accessibilityRole="summary"
          accessibilityLabel={`Estimated wallet value ${formatCurrency(totalUsd)}. Live USD at the current market price.`}
        >
          <Text style={styles.totalLabel}>Estimated value</Text>
          <Text style={[styles.totalAmount, tabularNums]}>
            {formatCurrency(totalUsd)}
          </Text>
          <Text style={styles.totalHint}>
            Live USD at the current market price.
          </Text>
        </View>

        {hasHoldings ? (
          <>
            <Text style={styles.sectionHead} accessibilityRole="header">
              Tokens
            </Text>
            {rows.map((row) => {
              const isUp = row.dayChangePct >= 0;
              return (
                <View
                  key={row.id}
                  style={styles.row}
                  accessible
                  accessibilityLabel={buildHoldingA11yLabel({
                    name: row.name,
                    amount: row.amount,
                    symbol: row.id,
                    usd: row.usd,
                    dayChangePct: row.dayChangePct,
                  })}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowName}>{row.name}</Text>
                    <Text style={[styles.rowAmount, tabularNums]}>
                      {formatTokenAmount(row.amount)} {row.id} ·{' '}
                      {formatTokenPrice(row.price)}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowUsd, tabularNums]}>
                      {formatCurrency(row.usd)}
                    </Text>
                    <Text
                      style={[
                        styles.rowChange,
                        tabularNums,
                        { color: isUp ? color.success : color.danger },
                      ]}
                    >
                      {formatSignedPercent(row.dayChangePct)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <View style={styles.emptyCard}>
            <View
              style={styles.emptyGlyph}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text style={styles.emptyGlyphMark}>$</Text>
            </View>
            <Text
              style={styles.emptyTitle}
              accessibilityRole="header"
            >
              Your wallet is empty
            </Text>
            <Text style={styles.emptyBody}>
              Self-custody means you hold the coins yourself — no bank, no
              middleman. Buy your first token on Exchange to see it land here.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.emptyButton,
                pressed && styles.emptyButtonPressed,
              ]}
              onPress={() => openApp('exchange')}
              accessibilityRole="button"
              accessibilityLabel="Open Exchange"
              accessibilityHint="Buy your first token to fund this wallet"
              hitSlop={8}
            >
              <Text style={styles.emptyButtonLabel}>Open Exchange</Text>
            </Pressable>
            <Text style={styles.emptyFootnote}>
              Bank cash and Cash Swipe earnings live in their own apps.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: color.text.secondary,
  },
  totalCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#1a1408',
    borderWidth: 1,
    borderColor: 'rgba(251,178,74,0.25)',
  },
  totalLabel: {
    fontSize: fontSize.caption,
    color: WALLET_ACCENT,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    marginTop: spacing.sm,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  totalHint: {
    marginTop: spacing.xs,
    fontSize: fontSize.caption,
    color: color.text.tertiary,
  },
  sectionHead: {
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: color.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  rowAmount: {
    marginTop: 2,
    fontSize: fontSize.label,
    color: color.text.secondary,
  },
  rowUsd: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  rowChange: {
    marginTop: 2,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
  },
  emptyCard: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
    alignItems: 'center',
  },
  emptyGlyph: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(251,178,74,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(251,178,74,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyGlyphMark: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: WALLET_ACCENT,
  },
  emptyTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: spacing.sm,
    fontSize: fontSize.body,
    color: color.text.secondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: spacing.lg,
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: WALLET_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonPressed: {
    opacity: 0.85,
  },
  emptyButtonLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: '#2A1C05',
  },
  emptyFootnote: {
    marginTop: spacing.md,
    fontSize: fontSize.caption,
    color: color.text.tertiary,
    textAlign: 'center',
  },
});
