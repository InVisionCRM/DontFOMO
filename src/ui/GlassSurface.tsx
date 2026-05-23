/**
 * GlassSurface.tsx — a frosted-glass panel.
 * ------------------------------------------------------------------
 * The translucent blurred surface used by the home widgets and the
 * dock. React Native has no CSS backdrop-filter, so this layers an
 * expo-blur BlurView under a faint white tint and a hairline border.
 * Purely presentational.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { glass } from '../theme/theme';

interface GlassSurfaceProps {
  /** Corner radius in points. */
  radius: number;
  /** Extra styles for the outer container (size, padding, margins). */
  style?: ViewStyle | ViewStyle[];
  children?: ReactNode;
}

export function GlassSurface({ radius, style, children }: GlassSurfaceProps) {
  return (
    <View style={[styles.container, { borderRadius: radius }, style]}>
      <BlurView
        intensity={24}
        tint="light"
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, backgroundColor: glass.fill },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.border,
          { borderRadius: radius },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  border: {
    borderWidth: 1,
    borderColor: glass.border,
  },
});
