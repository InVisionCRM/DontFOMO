/**
 * HomeWidgets.tsx — the two home-screen glass widgets.
 * ------------------------------------------------------------------
 * The Portfolio widget and the Clout widget that sit above the app
 * grid. Connected to the game store — they read live net worth,
 * followers, handle, the date and the day number, and re-render only
 * when those actually change (not on every clock tick).
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { GlassSurface } from './GlassSurface';
import { formatCurrency, formatDate, formatSignedPercent } from './format';
import { useGameStore, STARTING_CASH } from '../state/store';
import { dayNumber } from '../engine/time/clock';
import { computeNetWorth } from '../engine/economy';
import { canPostToday } from '../engine/clout';
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

const EMPTY_HOLDINGS: Record<string, number> = {};
const EMPTY_ASSETS: readonly never[] = [];

/** Sparkline polyline — slightly different slope when net worth is up vs down. */
function sparkPoints(netWorth: number): string {
  const up = netWorth >= STARTING_CASH;
  return up
    ? '0,19 30,17 60,20 90,14 120,16 150,12'
    : '0,14 30,18 60,16 90,20 120,17 150,19';
}

export function HomeWidgets() {
  const cash = useGameStore((s) => s.cash);
  const followers = useGameStore((s) => s.followers);
  const handle = useGameStore((s) => s.handle);
  const holdings = useGameStore((s) => s.holdings) ?? EMPTY_HOLDINGS;
  const market = useGameStore((s) => s.market);
  const assets = useGameStore((s) => s.assets) ?? EMPTY_ASSETS;
  const dailyPost = useGameStore((s) => s.dailyPost);
  const dateLabel = useGameStore((s) => formatDate(s.clock.now));
  const day = useGameStore((s) => dayNumber(s.clock));

  const netWorth = useMemo(
    () => computeNetWorth(cash, holdings, market, assets),
    [cash, holdings, market, assets],
  );

  const portfolioHint = useMemo(() => {
    if (netWorth === STARTING_CASH) return 'Starting balance';
    const pct = ((netWorth - STARTING_CASH) / STARTING_CASH) * 100;
    return `${formatSignedPercent(pct)} vs start`;
  }, [netWorth]);

  const postToday = canPostToday(dailyPost, Date.now());
  const streak = dailyPost.currentStreakDays;
  const streakLabel = postToday
    ? streak > 0
      ? `Post today · ${streak}d streak`
      : 'Post today for followers'
    : streak > 0
      ? `${streak}d streak`
      : `Day ${day}`;

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
            points={sparkPoints(netWorth)}
            fill="none"
            stroke={color.text.primary}
            strokeOpacity={0.4}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={styles.sub}>{portfolioHint}</Text>
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
              stroke={postToday ? color.warning : color.text.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={postToday ? 1 : 0.55}
            />
          </Svg>
          <Text style={[styles.dayText, postToday && styles.dayTextActive]}>
            {streakLabel}
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
    opacity: 0.75,
  },
  dayTextActive: {
    opacity: 1,
    color: color.warning,
  },
});
