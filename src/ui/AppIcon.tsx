/**
 * AppIcon.tsx — one app icon: gradient tile + glyph + optional label.
 * ------------------------------------------------------------------
 * Renders an AppDefinition as a rounded gradient tile with its SVG
 * glyph, and the name label below. Presentational — it reports taps
 * through onPress and holds no game logic.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import type { AppDefinition } from '../data/apps';
import { color, elevation, fontSize, fontWeight } from '../theme/theme';

/** Glossy top highlight overlaid on every icon tile. */
const GLOSS = ['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)'] as const;

interface AppIconProps {
  app: AppDefinition;
  /** Tile width/height in points. */
  size?: number;
  /** Show the name label below the tile. */
  showLabel?: boolean;
  /** Called when the icon is tapped. */
  onPress?: (app: AppDefinition) => void;
}

export function AppIcon({
  app,
  size = 62,
  showLabel = true,
  onPress,
}: AppIconProps) {
  const tileRadius = size * 0.24;
  const glyph = size * 0.5;

  return (
    <Pressable
      style={styles.wrap}
      onPress={() => onPress?.(app)}
      accessibilityRole="button"
      accessibilityLabel={app.name}
    >
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.tile,
              elevation.e1,
              { width: size, height: size, borderRadius: tileRadius },
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={app.gradient}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: tileRadius }]}
            />
            <LinearGradient
              colors={GLOSS}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.6 }}
              style={[StyleSheet.absoluteFill, { borderRadius: tileRadius }]}
            />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.tileBorder,
                { borderRadius: tileRadius },
              ]}
            />
            <Svg width={glyph} height={glyph} viewBox="0 0 24 24">
              <Path
                d={app.iconPath}
                stroke="#FFFFFF"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          {showLabel && (
            <Text style={styles.label} numberOfLines={1}>
              {app.name}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 7,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.9 }],
  },
  tileBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.regular,
    color: color.text.primary,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
