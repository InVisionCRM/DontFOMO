/**
 * HomeWidgets.tsx — the two home-screen glass widgets.
 * ------------------------------------------------------------------
 * The Portfolio widget and the Clout widget that sit above the app
 * grid. Connected to the game store — they read live net worth,
 * portfolio day change, post streak, handle, date, and re-render only
 * when those inputs change (not on every clock tick).
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { GlassSurface } from './GlassSurface';
import { formatCurrency, formatDate, formatSignedPercent } from './format';
import { useGameStore } from '../state/store';
import { ownedValue } from '../engine/assets';
import { ASSET_CATALOG } from '../data/assets';
import { color, fontSize, fontWeight, radius, spacing, tabularNums } from '../theme/theme';
import {
  buildPortfolioSparkline,
  homeNetWorth,
  portfolioDayChangePercent,
} from './portfolioSparkline';

/** Widget-specific layout metrics (not part of the global type scale). */
const WIDGET_HEIGHT = 150;
const VALUE_SIZE = 26;

/** Flame glyph for the daily-streak indicator. */
const FLAME =
  'M12 12c2 -2.96 0 -7 -1 -8c0 3.038 -1.773 4.741 -3 6c-1.226 1.26 -2 3.24 -2 5a6 6 0 1 0 12 0c0 -1.532 -1.056 -3.94 -2 -5c-1.786 3 -2.791 3 -4 2z';

function sparklinePoints(yValues: readonly number[]): string {
  const width = 150;
  const height = 28;
  const step = yValues.length > 1 ? width / (yValues.length - 1) : width;
  return yValues
    .map((y, i) => {
      const x = Math.round(i * step);
      const py = Math.round(y * height);
      return `${x},${py}`;
    })
    .join(' ');
}

export function HomeWidgets() {
  const cash = useGameStore((s) => s.cash);
  const holdings = useGameStore((s) => s.holdings);
  const market = useGameStore((s) => s.market);
  const assets = useGameStore((s) => s.assets);
  const followers = useGameStore((s) => s.followers);
  const handle = useGameStore((s) => s.handle);
  const dailyPost = useGameStore((s) => s.dailyPost);
  const dateLabel = useGameStore((s) => formatDate(s.clock.now));

  const assetsBook = ownedValue(ASSET_CATALOG, assets ?? []);
  const netWorth = homeNetWorth(cash, holdings ?? {}, market, assetsBook);
  const dayChange = portfolioDayChangePercent(holdings ?? {}, market);
  const sparkY = buildPortfolioSparkline(holdings ?? {}, market);
  const streakDays = dailyPost?.currentStreakDays ?? 0;

  const portfolioCaption =
    Object.keys(holdings ?? {}).some((id) => (holdings ?? {})[id] > 0)
      ? `${formatSignedPercent(dayChange)} crypto today`
      : 'Cash · open Exchange to trade';

  const streakCaption =
    streakDays === 0
      ? 'Post on Clout to start'
      : `${streakDays}-day post streak`;

  return (
    <View style={styles.row}>
      <GlassSurface radius={radius.lg} style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.label}>Portfolio</Text>
          <Text style={styles.sub}>{dateLabel}</Text>
        </View>
        <Text style={[styles.value, tabularNums]}>{formatCurrency(netWorth)}</Text>
        <Svg
          width="100%"
          height={28}
          viewBox="0 0 150 28"
          preserveAspectRatio="none"
          style={styles.spark}
        >
          <Polyline
            points={sparklinePoints(sparkY)}
            fill="none"
            stroke={color.text.primary}
            strokeOpacity={0.4}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={styles.sub}>{portfolioCaption}</Text>
      </GlassSurface>

      <GlassSurface radius={radius.lg} style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.label}>Clout</Text>
          <Text style={styles.sub}>{handle}</Text>
        </View>
        <Text style={[styles.value, tabularNums]}>
          {followers.toLocaleString('en-US')}
        </Text>
        <Text style={styles.sub}>followers</Text>
        <View style={styles.flameRow}>
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path
              d={FLAME}
              fill="none"
              stroke={color.warning}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.dayText}>{streakCaption}</Text>
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
    marginTop: 'auto',
    letterSpacing: -0.5,
  },
  spark: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  flameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 'auto',
  },
  dayText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
    opacity: 0.9,
  },
});
