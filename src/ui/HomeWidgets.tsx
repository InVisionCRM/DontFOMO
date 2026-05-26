/**
 * HomeWidgets.tsx — the two home-screen glass widgets.
 * ------------------------------------------------------------------
 * The Portfolio widget and the Clout widget that sit above the app
 * grid. Connected to the game store — they read live net worth,
 * followers, handle, the date and the post streak, and re-render only
 * when those actually change (not on every clock tick).
 */
import { StyleSheet, Text, View } from 'react-native';
import { GlassSurface } from './GlassSurface';
import { Sparkline } from './Sparkline';
import {
  formatCurrency,
  formatDate,
  formatSignedPercent,
} from './format';
import { computeNetWorth, useGameStore } from '../state/store';
import { holdingsValue } from '../engine/economy';
import { ownedValue } from '../engine/assets';
import { ASSET_CATALOG } from '../data/assets';
import { dayNumber } from '../engine/time/clock';
import {
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
  tabularNums,
} from '../theme/theme';

/** Widget-specific layout metrics (not part of the global type scale). */
const WIDGET_HEIGHT = 150;
const VALUE_SIZE = 26;
const SPARK_W = 150;
const SPARK_H = 28;

const EMPTY_HISTORY: readonly number[] = [];

export function HomeWidgets() {
  const cash = useGameStore((s) => s.cash);
  const holdings = useGameStore((s) => s.holdings);
  const market = useGameStore((s) => s.market);
  const assets = useGameStore((s) => s.assets);
  const history = useGameStore((s) => s.netWorthHistory ?? EMPTY_HISTORY);
  const followers = useGameStore((s) => s.followers);
  const handle = useGameStore((s) => s.handle);
  const streakDays = useGameStore((s) => s.dailyPost.currentStreakDays);
  const dateLabel = useGameStore((s) => formatDate(s.clock.now));
  const day = useGameStore((s) => dayNumber(s.clock));

  const netWorth = computeNetWorth(cash, holdings, market, assets ?? []);
  const cryptoValue = holdingsValue(holdings, market);
  const assetsValue = ownedValue(ASSET_CATALOG, assets ?? []);
  const sparkData = history.length >= 2 ? history : [netWorth, netWorth];
  const sessionStart = sparkData[0] ?? netWorth;
  const sessionDeltaPct =
    sessionStart > 0 ? ((netWorth - sessionStart) / sessionStart) * 100 : 0;
  const trendUp = sessionDeltaPct >= 0;
  const trendColor = trendUp ? color.success : color.danger;

  return (
    <View style={styles.row}>
      <GlassSurface radius={radius.lg} style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.label}>Portfolio</Text>
          <Text style={styles.sub}>{dateLabel}</Text>
        </View>
        <Text style={[styles.value, tabularNums]}>{formatCurrency(netWorth)}</Text>
        <Sparkline
          data={[...sparkData]}
          width={SPARK_W}
          height={SPARK_H}
          color={trendColor}
        />
        <Text style={[styles.delta, { color: trendColor }, tabularNums]}>
          {formatSignedPercent(sessionDeltaPct)} session
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {`Cash ${formatCurrency(cash)} · Crypto ${formatCurrency(cryptoValue)}`}
          {assetsValue > 0 ? ` · Assets ${formatCurrency(assetsValue)}` : ''}
        </Text>
      </GlassSurface>

      <GlassSurface radius={radius.lg} style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.label}>Clout</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {handle}
          </Text>
        </View>
        <Text style={[styles.value, tabularNums]}>
          {followers.toLocaleString('en-US')}
        </Text>
        <Text style={styles.sub}>followers</Text>
        <View style={styles.flameRow}>
          <Text style={styles.dayText}>{`Day ${day}`}</Text>
          <Text style={styles.streakDot}>·</Text>
          <Text style={styles.dayText}>
            {streakDays === 0 ? 'No post streak' : `${streakDays}d streak`}
          </Text>
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    flex: 1,
    height: WIDGET_HEIGHT,
    padding: spacing.lg,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  sub: {
    fontSize: fontSize.caption,
    color: color.text.primary,
    opacity: 0.6,
  },
  value: {
    fontSize: VALUE_SIZE,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    marginTop: spacing.xs,
    letterSpacing: -0.5,
  },
  delta: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
  flameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  streakDot: {
    fontSize: fontSize.caption,
    color: color.text.primary,
    opacity: 0.45,
  },
  dayText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
    opacity: 0.9,
  },
});
