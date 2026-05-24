/**
 * Avatar.tsx — the onboarding profile avatar.
 * ------------------------------------------------------------------
 * Auto-derived from the typed display name's first letter, matching
 * the mockup. Bible §6 keeps the profile minimal — "just a player
 * name and bio" — so we don't ship a picker. The gradient is the
 * mockup's warm orange.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';
import { fontWeight } from '../../theme/theme';

interface Props {
  /** Source string the initial is taken from. */
  name: string;
  /** Pixel diameter (default 78, matching the mockup). */
  size?: number;
}

export function Avatar({ name, size = 78 }: Props) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <LinearGradient
      colors={['#FB923C', '#EA580C'] as const}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.42 }]}>{initial}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: '#FFFFFF',
    fontWeight: fontWeight.bold,
  },
});
