/**
 * PhoneShell.tsx — the in-game phone, top level.
 * ------------------------------------------------------------------
 * Composes the home screen: wallpaper, the simulated status bar, the
 * home contents, the dock, and the home indicator. Handles the device
 * safe-area insets so everything clears the notch and the bottom
 * gesture area.
 *
 * Purely structural — the live game state is read by the connected
 * components below it (PhoneStatusBar, HomeWidgets), so the shell
 * itself does not re-render on every clock tick.
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

export function PhoneShell() {
  const insets = useSafeAreaInsets();

  const dockBottom = insets.bottom + DOCK_GAP;
  const bottomReserve = dockBottom + DOCK_HEIGHT + spacing.lg;

  return (
    <View style={styles.root}>
      <Wallpaper />

      <PhoneStatusBar />

      <HomeScreen bottomReserve={bottomReserve} />

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
