/**
 * App.tsx — the app entry component.
 * ------------------------------------------------------------------
 * For now this is a minimal dark BOOT SCREEN that proves the scaffold
 * runs and that the design tokens render correctly on a device.
 *
 * It will be replaced in Stage 2 of the migration plan by the real
 * top-level shell (onboarding flow vs. the game, via Expo Router).
 * Keeping it tiny and presentational on purpose — no game logic here.
 */
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { color, fontSize, fontWeight, spacing } from './src/theme/theme';

export default function App() {
  return (
    <View style={styles.container}>
      {/* Light status-bar icons, because the background is dark. */}
      <StatusBar style="light" />

      <Text style={styles.wordmark}>
        Crypto<Text style={styles.wordmarkAccent}>Life</Text>
      </Text>

      <Text style={styles.tagline}>Live a crypto life. Learn to keep it.</Text>

      <Text style={styles.build}>v1 · scaffold</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    letterSpacing: 0.5,
  },
  wordmarkAccent: {
    color: color.brand,
  },
  tagline: {
    marginTop: spacing.md,
    fontSize: fontSize.body,
    color: color.text.secondary,
  },
  build: {
    position: 'absolute',
    bottom: spacing.huge,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: color.text.tertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
