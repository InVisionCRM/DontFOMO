/**
 * HomeWidgets.tsx — the two home-screen glass widgets.
 * ------------------------------------------------------------------
 * The Portfolio widget and the Clout widget that sit above the app
 * grid. Connected to the game store — they read live cash, followers,
 * handle, the date and the day number, and re-render only when those
 * actually change (not on every clock tick).
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GlassSurface } from './GlassSurface';
import { Sparkline } from './Sparkline';
import {
  cloutFollowingCount,
  formatCurrency,
  formatDate,
  pickPortfolioSparkline,
  portfolioCaption,
} from './format';
import { useGameStore, STARTING_CASH } from '../state/store';
import { dayNumber } from '../engine/time/clock';
import { holdingsValue } from '../engine/economy';
import { ownedValue } from '../engine/assets';
import { ASSET_CATALOG } from '../data/assets';
import { color, fontSize, fontWeight, radius, spacing, tabularNums } from '../theme/theme';

/** Widget-specific layout metrics (not part of the global type scale). */
const WIDGET_HEIGHT = 150;
const VALUE_SIZE = 26;

/** Flame glyph for the daily-streak indicator. */
const FLAME =
  'M12 12c2 -2.96 0 -7 -1 -8c0 3.038 -1.773 4.741 -3 6c-1.226 1.26 -2 3.24 -2 5a6 6 0 1 0 12 0c0 -1.532 -1.056 -3.94 -2 -5c-1.786 3 -2.791 3 -4 2z';

export function HomeWidgets() {
  const cash = useGameStore((s) => s.cash);
  const holdings = useGameStore((s) => s.holdings);
  const market = useGameStore((s) => s.market);
  const assets = useGameStore((s) => s.assets ?? []);
  const followers = useGameStore((s) => s.followers);
  const handle = useGameStore((s) => s.handle);
  const dateLabel = useGameStore((s) => formatDate(s.clock.now));
  const day = useGameStore((s) => dayNumber(s.clock));

  const cryptoValue = holdingsValue(holdings, market);
  const assetValue = ownedValue(ASSET_CATALOG, assets);
  const netWorth = cash + cryptoValue + assetValue;
  const sparkData = pickPortfolioSparkline(market, holdings);
  const caption = portfolioCaption(
    netWorth,
    cash,
    cryptoValue,
    assetValue,
    STARTING_CASH,
  );
  const sparkColor =
    sparkData.length >= 2 && sparkData[sparkData.length - 1]! >= sparkData[0]!
      ? color.success
      : color.danger;

  return (
    <View style={styles.row}>
      <GlassSurface radius={radius.lg} style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.label}>Portfolio</Text>
          <Text style={styles.sub}>{dateLabel}</Text>
        </View>
        <Text style={[styles.value, tabularNums]}>{formatCurrency(netWorth)}</Text>
        <Sparkline
          data={sparkData}
          width={150}
          height={28}
          color={sparkColor}
        />
        <Text style={styles.sub}>{caption}</Text>
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
          <Text style={styles.dayText}>{`Day ${day}`}</Text>
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
