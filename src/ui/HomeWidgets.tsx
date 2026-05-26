/**
 * HomeWidgets.tsx — the two home-screen glass widgets.
 * ------------------------------------------------------------------
 * The Portfolio widget and the Clout widget that sit above the app
 * grid. Connected to the game store — they read live net worth,
 * followers, handle, the date and the day number, and re-render only
 * when those actually change (not on every clock tick).
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GlassSurface } from './GlassSurface';
import { Sparkline } from './Sparkline';
import { formatCurrency, formatDate, formatSignedPercent } from './format';
import { useGameStore, STARTING_CASH } from '../state/store';
import { computeNetWorth } from '../engine/economy/netWorth';
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

/** Flame glyph for the daily-streak indicator. */
const FLAME =
  'M12 12c2 -2.96 0 -7 -1 -8c0 3.038 -1.773 4.741 -3 6c-1.226 1.26 -2 3.24 -2 5a6 6 0 1 0 12 0c0 -1.532 -1.056 -3.94 -2 -5c-1.786 3 -2.791 3 -4 2z';

function portfolioDeltaLabel(netWorth: number): string {
  const delta = netWorth - STARTING_CASH;
  if (Math.abs(delta) < 0.005) return 'At starting balance';
  const pct = ((netWorth - STARTING_CASH) / STARTING_CASH) * 100;
  return `${formatSignedPercent(pct)} since Day 1`;
}

export function HomeWidgets() {
  const cash = useGameStore((s) => s.cash);
  const holdings = useGameStore((s) => s.holdings);
  const market = useGameStore((s) => s.market);
  const assets = useGameStore((s) => s.assets);
  const portfolioHistory = useGameStore((s) => s.portfolioHistory);
  const followers = useGameStore((s) => s.followers);
  const handle = useGameStore((s) => s.handle);
  const dailyPost = useGameStore((s) => s.dailyPost);
  const dateLabel = useGameStore((s) => formatDate(s.clock.now));
  const day = useGameStore((s) => dayNumber(s.clock));

  const netWorth = computeNetWorth(cash, holdings, market, assets ?? []);
  const history =
    portfolioHistory && portfolioHistory.length > 0
      ? portfolioHistory
      : [netWorth];
  const trendUp = history[history.length - 1] >= history[0];
  const sparkColor = trendUp ? '#4ADE80' : '#FB7185';

  return (
    <View style={styles.row}>
      <GlassSurface radius={radius.lg} style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.label}>Portfolio</Text>
          <Text style={styles.sub}>{dateLabel}</Text>
        </View>
        <Text style={[styles.value, tabularNums]}>{formatCurrency(netWorth)}</Text>
        <Sparkline
          data={history}
          width={140}
          height={28}
          color={sparkColor}
        />
        <Text style={styles.sub}>{portfolioDeltaLabel(netWorth)}</Text>
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
          <Text style={styles.dayText}>
            {dailyPost.currentStreakDays > 0
              ? `${dailyPost.currentStreakDays}-day streak · Day ${day}`
              : `Day ${day}`}
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
