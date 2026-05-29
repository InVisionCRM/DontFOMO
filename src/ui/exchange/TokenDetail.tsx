/**
 * TokenDetail.tsx — the in-Exchange token detail screen.
 * ------------------------------------------------------------------
 * Slides in over the Exchange when a token is tapped: the live price,
 * the candlestick chart, timeframe tabs, the stat grid, an about line,
 * and the Buy / Sell bar. Slides back out on Back.
 *
 * The Buy / Sell buttons are inert here — trading lands in checkpoint
 * 3. The slide uses React Native's built-in Animated.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { CandlestickChart } from './CandlestickChart';
import { TokenBadge } from './TokenBadge';
import { OwnBadge } from './OwnBadge';
import { resolveTokenDefinition } from './playerTokenView';
import { useGameStore } from '../../state/store';
import {
  MARKET_TICK_MS,
  dayChangePercent,
  toCandles,
  type Candle,
} from '../../engine/market';
import {
  priceAtTick,
  priceSequence,
  tickAtTime,
  tokenSeed,
} from '../../engine/market/deterministicMarket';
import { snapshotsInRange } from '../../engine/market/snapshots';
import { TOKEN_BY_ID } from '../../data/tokens';
import { formatSignedPercent, formatTokenPrice } from '../format';
import {
  appAccent,
  color,
  fontSize,
  fontWeight,
  motion,
  radius,
  spacing,
  tabularNums,
} from '../../theme/theme';

interface TokenDetailProps {
  /** The token to show; null = closed. */
  tokenId: string | null;
  onBack: () => void;
  /** Open the trade sheet for this token in the given mode. */
  onTrade: (tokenId: string, mode: 'buy' | 'sell') => void;
}

/**
 * Timeframe tabs — each maps to a wall-clock time window the chart
 * shows. Candles are time-aligned (e.g. 1H = ~4 minutes per candle),
 * so they appear/scroll/grow naturally as ticks come in — Bible §2's
 * "shared market" property in visible form.
 *
 * `windowMs` is the duration the chart covers (from `now − windowMs`
 * to `now`). `candleCount` is how many candles to draw in that window.
 * `useSnapshots` flips long-range timeframes to read from the baked
 * snapshot table (one entry per in-game day) so they render fast even
 * on a months-old world.
 */
const TIMEFRAMES = [
  { label: '1H', windowMs: 60 * 60 * 1000, candleCount: 30, useSnapshots: false },
  { label: '1D', windowMs: 24 * 60 * 60 * 1000, candleCount: 48, useSnapshots: false },
  { label: '1W', windowMs: 7 * 24 * 60 * 60 * 1000, candleCount: 56, useSnapshots: false },
  { label: '1M', windowMs: 30 * 24 * 60 * 60 * 1000, candleCount: 60, useSnapshots: false },
  { label: 'ALL', windowMs: 0, candleCount: 60, useSnapshots: true },
] as const;

/** Top padding so content clears the notch. */
const TOP_PAD = 52;

/**
 * Bucket a flat array of prices into `count` OHLC candles. Each
 * candle aggregates roughly `prices.length / count` consecutive
 * prices. Identical to the legacy `toCandles` but kept local because
 * the rest of the chart now lives here.
 */
function bucketCandles(prices: readonly number[], count: number): Candle[] {
  if (prices.length === 0 || count < 1) return [];
  const bucketSize = Math.max(1, Math.ceil(prices.length / count));
  const candles: Candle[] = [];
  for (let i = 0; i < prices.length; i += bucketSize) {
    const bucket = prices.slice(i, i + bucketSize);
    let high = bucket[0];
    let low = bucket[0];
    for (const p of bucket) {
      if (p > high) high = p;
      if (p < low) low = p;
    }
    candles.push({
      open: bucket[0],
      close: bucket[bucket.length - 1],
      high,
      low,
    });
  }
  return candles;
}

/**
 * Build the candle series for a catalog token at the given world
 * tick / timeframe. Pulls live prices from the deterministic OU
 * walker for short windows; reads from the baked snapshot table for
 * the ALL view.
 *
 * For runtime / player tokens (no entry in the catalog), falls back
 * to bucketing the per-session `history` buffer.
 */
function buildCatalogCandles(
  tokenId: string,
  currentTick: number,
  timeframe: (typeof TIMEFRAMES)[number],
): Candle[] {
  const def = TOKEN_BY_ID[tokenId];
  if (!def) return [];
  const seed = tokenSeed(tokenId);

  // ALL: sample from snapshots (one per in-game day). Cheap.
  if (timeframe.useSnapshots) {
    const samples = snapshotsInRange(tokenId, 0, currentTick).map((s) => s.price);
    if (samples.length === 0) return [];
    return bucketCandles(samples, timeframe.candleCount);
  }

  // Short window: walk the OU model over [startTick, currentTick].
  const windowTicks = Math.floor(timeframe.windowMs / MARKET_TICK_MS);
  const startTick = Math.max(0, currentTick - windowTicks);
  if (startTick >= currentTick) return [];

  // Snapshot-accelerated jump to startTick.
  const startPrice =
    startTick === 0
      ? def.basePrice
      : priceAtTick(def, seed, def.basePrice, 0, def.basePrice, startTick, tokenId);
  // Pull the full visible window in one pass.
  const prices = priceSequence(def, seed, def.basePrice, startTick, startPrice, currentTick);
  return bucketCandles(prices, timeframe.candleCount);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statKey}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function TokenDetail({ tokenId, onBack, onTrade }: TokenDetailProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const market = useGameStore((s) => s.market);
  const holdings = useGameStore((s) => s.holdings);
  const playerTokens = useGameStore((s) => s.playerTokens);

  const [displayedId, setDisplayedId] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState(1); // index into TIMEFRAMES
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (tokenId) {
      setDisplayedId(tokenId);
      setTimeframe(1);
      slide.setValue(width);
      Animated.timing(slide, {
        toValue: 0,
        duration: motion.duration.base,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start();
    } else if (displayedId) {
      Animated.timing(slide, {
        toValue: width,
        duration: motion.duration.base,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setDisplayedId(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId, width]);

  if (!displayedId) {
    return null;
  }

  const token = resolveTokenDefinition(displayedId, playerTokens);
  const state = market.tokens[displayedId];
  if (!token || !state) {
    return null;
  }
  const isOwn = playerTokens.some((p) => p.id === displayedId);
  const owned = (holdings[displayedId] ?? 0) > 0;
  const change = dayChangePercent(state);
  const changeColor =
    change > 0 ? color.success : change < 0 ? color.danger : color.text.tertiary;
  const tf = TIMEFRAMES[timeframe];
  // Catalog tokens read from the deterministic engine / snapshots
  // (Bible §2 — shared world). Player tokens fall back to bucketing
  // the per-session history buffer.
  const isCatalog = TOKEN_BY_ID[displayedId] !== undefined;
  const candles = useMemo(() => {
    if (isCatalog) {
      const currentTick = tickAtTime(Date.now(), MARKET_TICK_MS);
      return buildCatalogCandles(displayedId, currentTick, tf);
    }
    return toCandles(state.history, tf.candleCount);
  }, [displayedId, isCatalog, tf, state.history, state.price]);
  const chartWidth = width - spacing.lg * 2;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { transform: [{ translateX: slide }] },
      ]}
    >
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, TOP_PAD) }]}>
        <Pressable
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to markets"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path
              d="M15 6l-6 6l6 6"
              stroke={color.text.primary}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Pressable>
        <TokenBadge emoji={token.emoji} size={36} />
        <View style={styles.topInfo}>
          <View style={styles.topNameRow}>
            <Text style={styles.topName} numberOfLines={1}>
              {token.name}
            </Text>
            {isOwn && <OwnBadge />}
          </View>
          <Text style={styles.topTicker}>{token.id}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.price, tabularNums]}>
          {formatTokenPrice(state.price)}
        </Text>
        <Text style={[styles.change, { color: changeColor }]}>
          {formatSignedPercent(change)} today
        </Text>

        <View style={styles.chartWrap}>
          <CandlestickChart candles={candles} width={chartWidth} height={180} />
        </View>

        <View style={styles.tfTabs}>
          {TIMEFRAMES.map((tf, i) => (
            <Pressable
              key={tf.label}
              style={[styles.tf, timeframe === i && styles.tfOn]}
              onPress={() => setTimeframe(i)}
            >
              <Text style={[styles.tfText, timeframe === i && styles.tfTextOn]}>
                {tf.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.statGrid}>
          <Stat label="Market cap" value={token.marketCap} />
          <Stat label="24h volume" value={token.volume24h} />
          <Stat label="Category" value={token.category} />
          <Stat label="Liquidity" value={token.liquidity} />
        </View>

        <Text style={styles.about}>{token.description}</Text>
      </ScrollView>

      <View style={styles.tradeBar}>
        <Pressable
          style={[
            styles.tradeBtn,
            styles.sellBtn,
            !owned && styles.tradeBtnDisabled,
          ]}
          onPress={() => onTrade(displayedId, 'sell')}
          disabled={!owned}
          accessibilityRole="button"
        >
          <Text style={styles.sellText}>Sell</Text>
        </Pressable>
        <Pressable
          style={[styles.tradeBtn, styles.buyBtn]}
          onPress={() => onTrade(displayedId, 'buy')}
          accessibilityRole="button"
        >
          <Text style={styles.buyText}>Buy</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: color.bg.base,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topInfo: {
    flexShrink: 1,
    minWidth: 0,
  },
  topNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  topName: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
    flexShrink: 1,
  },
  topTicker: {
    fontSize: fontSize.caption,
    color: color.text.secondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  price: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    marginTop: spacing.sm,
    letterSpacing: -1,
  },
  change: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
  chartWrap: {
    marginVertical: spacing.lg,
  },
  tfTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.lg,
  },
  tf: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
  },
  tfOn: {
    backgroundColor: color.bg.elevated,
    borderColor: appAccent.coinDeck,
  },
  tfText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: color.text.secondary,
  },
  tfTextOn: {
    color: color.text.primary,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stat: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
    borderRadius: radius.md,
    padding: 12,
  },
  statKey: {
    fontSize: fontSize.caption,
    color: color.text.secondary,
  },
  statValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
    marginTop: 3,
  },
  about: {
    fontSize: fontSize.body,
    color: color.text.secondary,
    lineHeight: 21,
    marginTop: spacing.lg,
  },
  tradeBar: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border.hairline,
    backgroundColor: color.bg.base,
  },
  tradeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  tradeBtnDisabled: {
    opacity: 0.4,
  },
  sellBtn: {
    backgroundColor: color.bg.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.danger,
  },
  sellText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: color.danger,
  },
  buyBtn: {
    backgroundColor: color.success,
  },
  buyText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: color.bg.base,
  },
});
