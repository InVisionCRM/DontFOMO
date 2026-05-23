/**
 * Dock.tsx — the home-screen dock.
 * ------------------------------------------------------------------
 * The glass bar pinned near the bottom of the home screen holding the
 * four dock apps. Presentational — taps are reported via onAppPress.
 */
import { StyleSheet } from 'react-native';
import { GlassSurface } from './GlassSurface';
import { AppIcon, type IconRect } from './AppIcon';
import { DOCK_APPS, type AppDefinition } from '../data/apps';
import { radius, spacing } from '../theme/theme';

/** Dock height in points (used by PhoneShell to reserve layout space). */
export const DOCK_HEIGHT = 92;

interface DockProps {
  /** Called when a dock app is tapped, with its measured rectangle. */
  onAppPress?: (app: AppDefinition, rect: IconRect) => void;
}

export function Dock({ onAppPress }: DockProps) {
  return (
    <GlassSurface radius={radius.xl} style={styles.dock}>
      {DOCK_APPS.map((app) => (
        <AppIcon
          key={app.id}
          app={app}
          size={58}
          showLabel={false}
          onPress={onAppPress}
        />
      ))}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  dock: {
    height: DOCK_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
  },
});
