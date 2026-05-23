/**
 * HomeScreen.tsx — the home screen contents.
 * ------------------------------------------------------------------
 * The two widgets, the app grid, and the page dots. Presentational —
 * it renders the apps from data and reports taps via onAppPress.
 */
import { StyleSheet, View } from 'react-native';
import { HomeWidgets } from './HomeWidgets';
import { AppIcon } from './AppIcon';
import { GRID_APPS, type AppDefinition } from '../data/apps';
import { spacing } from '../theme/theme';

interface HomeScreenProps {
  portfolioValue: string;
  dateLabel: string;
  followers: string;
  handle: string;
  dayLabel: string;
  /** Bottom padding reserved for the dock, set by PhoneShell. */
  bottomReserve: number;
  onAppPress?: (app: AppDefinition) => void;
}

export function HomeScreen({
  portfolioValue,
  dateLabel,
  followers,
  handle,
  dayLabel,
  bottomReserve,
  onAppPress,
}: HomeScreenProps) {
  return (
    <View style={[styles.container, { paddingBottom: bottomReserve }]}>
      <HomeWidgets
        portfolioValue={portfolioValue}
        dateLabel={dateLabel}
        followers={followers}
        handle={handle}
        dayLabel={dayLabel}
      />

      <View style={styles.grid}>
        {GRID_APPS.map((app) => (
          <View key={app.id} style={styles.cell}>
            <AppIcon app={app} onPress={onAppPress} />
          </View>
        ))}
      </View>

      <View style={styles.dots}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xxl,
  },
  cell: {
    width: '25%',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 'auto',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  dotActive: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
});
