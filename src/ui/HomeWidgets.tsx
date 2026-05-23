/**
 * HomeWidgets.tsx — the two home-screen glass widgets.
 * ------------------------------------------------------------------
 * The Portfolio widget and the Clout widget that sit above the app
 * grid. Both are presentational glass cards driven entirely by props.
 * Checkpoint 1 feeds them placeholder values; checkpoint 2 wires them
 * to the live game store.
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { GlassSurface } from './GlassSurface';
import { color, fontSize, fontWeight, radius, spacing, tabularNums } from '../theme/theme';

/** Widget-specific layout metrics (not part of the global type scale). */
const WIDGET_HEIGHT = 150;
const VALUE_SIZE = 26;

/** Flame glyph for the daily-streak indicator. */
const FLAME =
  'M12 12c2 -2.96 0 -7 -1 -8c0 3.038 -1.773 4.741 -3 6c-1.226 1.26 -2 3.24 -2 5a6 6 0 1 0 12 0c0 -1.532 -1.056 -3.94 -2 -5c-1.786 3 -2.791 3 -4 2z';

interface HomeWidgetsProps {
  /** Portfolio value, pre-formatted as currency. */
  portfolioValue: string;
  /** Today's in-game date, e.g. "Fri, May 22". */
  dateLabel: string;
  /** Follower count, pre-formatted. */
  followers: string;
  /** The player's Clout handle, e.g. "@degen_kyle". */
  handle: string;
  /** Day-streak label, e.g. "Day 1". */
  dayLabel: string;
}

export function HomeWidgets({
  portfolioValue,
  dateLabel,
  followers,
  handle,
  dayLabel,
}: HomeWidgetsProps) {
  return (
    <View style={styles.row}>
      <GlassSurface radius={radius.lg} style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.label}>Portfolio</Text>
          <Text style={styles.sub}>{dateLabel}</Text>
        </View>
        <Text style={[styles.value, tabularNums]}>{portfolioValue}</Text>
        <Svg
          width="100%"
          height={28}
          viewBox="0 0 150 28"
          preserveAspectRatio="none"
          style={styles.spark}
        >
          <Polyline
            points="0,19 30,17 60,20 90,16 120,18 150,17"
            fill="none"
            stroke={color.text.primary}
            strokeOpacity={0.4}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={styles.sub}>Starting balance</Text>
      </GlassSurface>

      <GlassSurface radius={radius.lg} style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.label}>Clout</Text>
          <Text style={styles.sub}>{handle}</Text>
        </View>
        <Text style={[styles.value, tabularNums]}>{followers}</Text>
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
          <Text style={styles.dayText}>{dayLabel}</Text>
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
