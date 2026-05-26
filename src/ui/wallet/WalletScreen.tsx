/**
 * WalletScreen.tsx — the Wallet app (v1).
 * ------------------------------------------------------------------
 * Shows on-device crypto holdings and estimated USD value. Bank cash
 * lives in the Bank app; this is the player's self-custody view.
 */
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { holdingsValue } from '../../engine/economy';
import { TOKENS } from '../../data/tokens';
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

const TOP_PAD = 52;
const WALLET_ACCENT = '#FBB24A';

export function WalletScreen() {
  const insets = useSafeAreaInsets();
  const holdings = useGameStore((s) => s.holdings) ?? {};
  const market = useGameStore((s) => s.market);

  const rows = useMemo(() => {
    return Object.entries(holdings)
      .filter(([, amount]) => amount > 0)
      .map(([id, amount]) => {
        const token = market.tokens[id];
        const def = TOKENS.find((t) => t.id === id);
        const price = token?.price ?? 0;
        const usd = amount * price;
        return {
          id,
          name: def?.name ?? id,
          amount,
          usd,
        };
      })
      .sort((a, b) => b.usd - a.usd);
  }, [holdings, market.tokens]);

  const totalUsd = holdingsValue(holdings, market);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, TOP_PAD) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Wallet</Text>
        <Text style={styles.subtitle}>Self-custody · not your bank balance</Text>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Estimated value</Text>
          <Text style={[styles.totalAmount, tabularNums]}>
            {formatCurrency(totalUsd)}
          </Text>
        </View>

        {rows.length === 0 ? (
          <Text style={styles.empty}>
            No tokens yet. Buy on Exchange or recover funds after a scam from
            Bank and Cash Swipe.
          </Text>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={styles.row}>
              <View>
                <Text style={styles.rowName}>{row.name}</Text>
                <Text style={[styles.rowAmount, tabularNums]}>
                  {row.amount.toLocaleString('en-US', {
                    maximumFractionDigits: 6,
                  })}{' '}
                  {row.id}
                </Text>
              </View>
              <Text style={[styles.rowUsd, tabularNums]}>
                {formatCurrency(row.usd)}
              </Text>
            </View>
          ))
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
  empty: {
    marginTop: spacing.xxl,
    fontSize: fontSize.body,
    color: color.text.secondary,
    lineHeight: 22,
  },
  row: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: WALLET_ACCENT,
  },
});
