/**
 * HomeScreen.tsx — the home screen contents.
 * ------------------------------------------------------------------
 * The two widgets, the app grid, and the page dots. The widgets are
 * connected to the store themselves; this component lays out the
 * structure, renders the app grid from data, and forwards icon taps.
 */
import { StyleSheet, View } from 'react-native';
import { HomeWidgets } from './HomeWidgets';
import { AppIcon, type IconRect } from './AppIcon';
import { GRID_APPS, type AppDefinition } from '../data/apps';
import { spacing } from '../theme/theme';

interface HomeScreenProps {
  /** Bottom padding reserved for the dock, set by PhoneShell. */
  bottomReserve: number;
  /** Called when a grid app is tapped, with its measured rectangle. */
  onAppPress?: (app: AppDefinition, rect: IconRect) => void;
}

export function HomeScreen({ bottomReserve, onAppPress }: HomeScreenProps) {
  return (
    <View style={[styles.container, { paddingBottom: bottomReserve }]}>
      <HomeWidgets />

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
