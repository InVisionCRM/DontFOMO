/**
 * ExchangeScreen.tsx — the Exchange app.
 * ------------------------------------------------------------------
 * The main screen — balance card, Markets / Portfolio segment, filter
 * chips, the Sponsored ad, the live token list — plus the token detail
 * screen and the buy / sell trade sheet layered over it.
 *
 * Built to the approved Exchange mockup.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BalanceCard } from './BalanceCard';
import { TokenRow } from './TokenRow';
import { TokenDetail } from './TokenDetail';
import { ExchangeAd } from './ExchangeAd';
import { HoldingRow } from './HoldingRow';
import { TradeSheet, type TradeRequest } from './TradeSheet';
import { LaunchTokenCard } from './LaunchTokenCard';
import { LaunchWizard } from './LaunchWizard';
import {
  playerTokenToDefinition,
  resolveTokenDefinition,
} from './playerTokenView';
import { useGameStore } from '../../state/store';
import { holdingsValue } from '../../engine/economy';
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
  const holdings = useGameStore((s) => s.holdings);
  const playerTokens = useGameStore((s) => s.playerTokens);

  const [segment, setSegment] = useState<Segment>('markets');
  const [filter, setFilter] = useState<Filter>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tradeRequest, setTradeRequest] = useState<TradeRequest | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const cryptoValue = holdingsValue(holdings, market);
  const total = cash + cryptoValue;

  // Player-launched tokens trade alongside the catalogue tokens.
  const ownIds = new Set(playerTokens.map((p) => p.id));
  const allTokens = [...TOKENS, ...playerTokens.map(playerTokenToDefinition)];
  const tokens =
    filter === 'All'
      ? allTokens
      : allTokens.filter((t) => t.category === filter);
  const heldIds = Object.keys(holdings);

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
                  isOwn={ownIds.has(token.id)}
                  onPress={(t) => setSelectedId(t.id)}
                />
              ))}
            </View>
          </>
        ) : (
          <View>
            {heldIds.length > 0 ? (
              heldIds.map((id) => {
                const def = resolveTokenDefinition(id, playerTokens);
                return def ? (
                  <HoldingRow
                    key={id}
                    token={def}
                    state={market.tokens[id]}
                    amount={holdings[id]}
                    isOwn={ownIds.has(id)}
                    onPress={(t) => setSelectedId(t.id)}
                  />
                ) : null;
              })
            ) : (
              <View style={styles.portfolio}>
                <Text style={styles.emptyTitle}>No holdings yet</Text>
                <Text style={styles.emptyText}>
                  Buy a token from Markets to start your portfolio.
                </Text>
              </View>
            )}

            <LaunchTokenCard onPress={() => setWizardOpen(true)} />

            <Text style={styles.cashLine}>
              {formatCurrency(cash)} cash available to trade
            </Text>
          </View>
        )}
      </ScrollView>

      <LaunchWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onLaunched={(id) => {
          setWizardOpen(false);
          setSelectedId(id);
        }}
      />

      <TokenDetail
        tokenId={selectedId}
        onBack={() => setSelectedId(null)}
        onTrade={(id, mode) => setTradeRequest({ tokenId: id, mode })}
      />

      <TradeSheet
        request={tradeRequest}
        onClose={() => setTradeRequest(null)}
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
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
