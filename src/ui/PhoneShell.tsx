/**
 * PhoneShell.tsx — the in-game phone, top level.
 * ------------------------------------------------------------------
 * Composes the home screen: wallpaper, the simulated status bar, the
 * home contents, the dock, the home indicator, and the opened-app
 * overlay. Handles the device safe-area insets so everything clears
 * the notch and the bottom gesture area.
 *
 * It owns the zoom origin (the rect of the last-tapped icon) and tells
 * the store which app to open. The live game state itself is read by
 * the connected components below it.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wallpaper } from './Wallpaper';
import { PhoneStatusBar } from './PhoneStatusBar';
import { HomeScreen } from './HomeScreen';
import { Dock, DOCK_HEIGHT } from './Dock';
import { AppView } from './AppView';
import type { IconRect } from './AppIcon';
import { useGameStore } from '../state/store';
import type { AppDefinition } from '../data/apps';
import { color, spacing } from '../theme/theme';

/** Gap between the dock and the bottom safe area. */
const DOCK_GAP = 10;

export function PhoneShell() {
  const insets = useSafeAreaInsets();
  const openApp = useGameStore((s) => s.openApp);

  // The rect of the last-tapped icon — the origin the app zooms from.
  const [origin, setOrigin] = useState<IconRect | null>(null);

  const handleAppPress = (app: AppDefinition, rect: IconRect): void => {
    setOrigin(rect);
    openApp(app.id);
  };

  const dockBottom = insets.bottom + DOCK_GAP;
  const bottomReserve = dockBottom + DOCK_HEIGHT + spacing.lg;

  return (
    <View style={styles.root}>
      <Wallpaper />

      <PhoneStatusBar />

      <HomeScreen bottomReserve={bottomReserve} onAppPress={handleAppPress} />

      <View style={[styles.dockWrap, { bottom: dockBottom }]}>
        <Dock onAppPress={handleAppPress} />
      </View>

      <View style={styles.homeIndicator} />

      <AppView origin={origin} />
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
