/**
 * PhoneShell.tsx — the in-game phone, top level.
 * ------------------------------------------------------------------
 * Composes the whole home screen: wallpaper, the simulated status bar,
 * the home contents, the dock, and the home indicator. Handles the
 * device safe-area insets so everything clears the notch and the
 * bottom gesture area.
 *
 * Checkpoint 1 of Stage 2 — static. The clock and the game state are
 * placeholders here; checkpoint 2 wires in the engine and the store.
 */
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wallpaper } from './Wallpaper';
import { PhoneStatusBar } from './PhoneStatusBar';
import { HomeScreen } from './HomeScreen';
import { Dock, DOCK_HEIGHT } from './Dock';
import { color, spacing } from '../theme/theme';

/** Gap between the dock and the bottom safe area. */
const DOCK_GAP = 10;

/**
 * Placeholder game state for checkpoint 1. The Zustand store replaces
 * every value here in checkpoint 2 — see CLAUDE.md §5.
 */
const PLACEHOLDER = {
  portfolioValue: '$500.00',
  followers: '0',
  handle: '@degen_kyle',
  dayLabel: 'Day 1',
} as const;

/** Format a Date as "Fri, May 22". */
function formatDate(now: Date): string {
  return now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function PhoneShell() {
  const insets = useSafeAreaInsets();

  // Captured once at launch for checkpoint 1. The live, ticking clock
  // arrives with the time engine in checkpoint 2.
  const now = new Date();

  const dockBottom = insets.bottom + DOCK_GAP;
  const bottomReserve = dockBottom + DOCK_HEIGHT + spacing.lg;

  return (
    <View style={styles.root}>
      <Wallpaper />

      <PhoneStatusBar now={now} topInset={insets.top} />

      <HomeScreen
        portfolioValue={PLACEHOLDER.portfolioValue}
        dateLabel={formatDate(now)}
        followers={PLACEHOLDER.followers}
        handle={PLACEHOLDER.handle}
        dayLabel={PLACEHOLDER.dayLabel}
        bottomReserve={bottomReserve}
      />

      <View style={[styles.dockWrap, { bottom: dockBottom }]}>
        <Dock />
      </View>

      <View style={styles.homeIndicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  dockWrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 9,
    left: '50%',
    marginLeft: -65,
    width: 130,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
});
