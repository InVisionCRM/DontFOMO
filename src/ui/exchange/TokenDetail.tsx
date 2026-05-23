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
import { useEffect, useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { CandlestickChart } from './CandlestickChart';
import { useGameStore } from '../../state/store';
import { TOKEN_BY_ID } from '../../data/tokens';
import { dayChangePercent, toCandles } from '../../engine/market';
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
}

/** Timeframe tabs — each maps to a candle count over the kept history. */
const TIMEFRAMES = [
  { label: '1H', candles: 14 },
  { label: '1D', candles: 26 },
  { label: '1W', candles: 34 },
  { label: '1M', candles: 44 },
  { label: 'ALL', candles: 60 },
] as const;

/** Top padding so content clears the notch. */
const TOP_PAD = 52;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statKey}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function TokenDetail({ tokenId, onBack }: TokenDetailProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const market = useGameStore((s) => s.market);

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

  const token = TOKEN_BY_ID[displayedId];
  const state = market.tokens[displayedId];
  const change = dayChangePercent(state);
  const changeColor =
    change > 0 ? color.success : change < 0 ? color.danger : color.text.tertiary;
  const candles = toCandles(state.history, TIMEFRAMES[timeframe].candles);
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
        <LinearGradient
          colors={token.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badge}
        >
          <Text style={styles.badgeText}>{token.id.slice(0, 2)}</Text>
        </LinearGradient>
        <View>
          <Text style={styles.topName}>{token.name}</Text>
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
          style={[styles.tradeBtn, styles.sellBtn]}
          accessibilityRole="button"
        >
          <Text style={styles.sellText}>Sell</Text>
        </Pressable>
        <Pressable
          style={[styles.tradeBtn, styles.buyBtn]}
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
  badge: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  topName: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
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
