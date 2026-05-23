/**
 * ExchangeScreen.tsx — the Exchange app.
 * ------------------------------------------------------------------
 * The main screen — balance card, Markets / Portfolio segment, filter
 * chips, the live token list — plus the token detail screen, which
 * slides in over it when a token is tapped. Built to the approved
 * Exchange mockup.
 *
 * Trading and a real portfolio arrive in checkpoint 3.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BalanceCard } from './BalanceCard';
import { TokenRow } from './TokenRow';
import { TokenDetail } from './TokenDetail';
import { ExchangeAd } from './ExchangeAd';
import { useGameStore } from '../../state/store';
import { TOKENS, TOKEN_CATEGORIES, type TokenCategory } from '../../data/tokens';
import { formatCurrency } from '../format';
import {
  appAccent,
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../../theme/theme';

type Segment = 'markets' | 'portfolio';
type Filter = 'All' | TokenCategory;

const FILTERS: readonly Filter[] = ['All', ...TOKEN_CATEGORIES];
/** Top padding so content clears the notch (the status bar joins later). */
const TOP_PAD = 52;

export function ExchangeScreen() {
  const insets = useSafeAreaInsets();
  const cash = useGameStore((s) => s.cash);
  const market = useGameStore((s) => s.market);

  const [segment, setSegment] = useState<Segment>('markets');
  const [filter, setFilter] = useState<Filter>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // No holdings until trading lands in checkpoint 3.
  const cryptoValue = 0;
  const total = cash + cryptoValue;

  const tokens =
    filter === 'All' ? TOKENS : TOKENS.filter((t) => t.category === filter);

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
        <Text style={styles.title}>Exchange</Text>

        <BalanceCard total={total} cash={cash} cryptoValue={cryptoValue} />

        <View style={styles.segment}>
          {(['markets', 'portfolio'] as const).map((seg) => (
            <Pressable
              key={seg}
              style={[styles.segTab, segment === seg && styles.segTabOn]}
              onPress={() => setSegment(seg)}
            >
              <Text
                style={[styles.segText, segment === seg && styles.segTextOn]}
              >
                {seg === 'markets' ? 'Markets' : 'Portfolio'}
              </Text>
            </Pressable>
          ))}
        </View>

        {segment === 'markets' ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {FILTERS.map((f) => (
                <Pressable
                  key={f}
                  style={[styles.chip, filter === f && styles.chipOn]}
                  onPress={() => setFilter(f)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filter === f && styles.chipTextOn,
                    ]}
                  >
                    {f}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <ExchangeAd onPress={(id) => setSelectedId(id)} />

            <View>
              {tokens.map((token) => (
                <TokenRow
                  key={token.id}
                  token={token}
                  state={market.tokens[token.id]}
                  onPress={(t) => setSelectedId(t.id)}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.portfolio}>
            <Text style={styles.emptyTitle}>No holdings yet</Text>
            <Text style={styles.emptyText}>
              Buy a token from Markets to start your portfolio.
            </Text>
            <Text style={styles.cashLine}>
              {formatCurrency(cash)} cash available to trade
            </Text>
          </View>
        )}
      </ScrollView>

      <TokenDetail tokenId={selectedId} onBack={() => setSelectedId(null)} />
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
  segment: {
    flexDirection: 'row',
    backgroundColor: color.bg.surface,
    borderRadius: radius.md,
    padding: 4,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  segTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  segTabOn: {
    backgroundColor: color.bg.elevated,
  },
  segText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.text.secondary,
  },
  segTextOn: {
    color: color.text.primary,
  },
  chips: {
    gap: 8,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
  },
  chipOn: {
    backgroundColor: color.bg.elevated,
    borderColor: appAccent.coinDeck,
  },
  chipText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: color.text.secondary,
  },
  chipTextOn: {
    color: color.text.primary,
  },
  portfolio: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: color.text.secondary,
    textAlign: 'center',
  },
  cashLine: {
    fontSize: fontSize.label,
    color: color.text.tertiary,
    marginTop: spacing.md,
  },
});
