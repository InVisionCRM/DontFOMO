/**
 * SettingsScreen.tsx — the Settings app (v1).
 * ------------------------------------------------------------------
 * Minimal shell for device-local controls. "Reset game" wipes the
 * AsyncStorage save and returns the player to onboarding.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '../../state/store';
import {
  appAccent,
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../../theme/theme';

const TOP_PAD = 52;
const SETTINGS_ACCENT = appAccent.settings;

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const resetGame = useGameStore((s) => s.resetGame);
  const [resetting, setResetting] = useState(false);

  const confirmReset = (): void => {
    Alert.alert(
      'Reset game?',
      'This deletes all progress on this device and returns you to the start. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setResetting(true);
            resetGame(Date.now())
              .catch((error) => {
                console.warn('[DontFOMO] reset game failed:', error);
                Alert.alert(
                  'Reset failed',
                  'Could not clear your save. Try again, or delete and reinstall Expo Go.',
                );
              })
              .finally(() => setResetting(false));
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, TOP_PAD) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Game</Text>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [
                styles.resetRow,
                pressed && !resetting && styles.resetRowPressed,
              ]}
              onPress={confirmReset}
              disabled={resetting}
              accessibilityRole="button"
              accessibilityLabel="Reset game"
              accessibilityState={{ disabled: resetting, busy: resetting }}
            >
              <View style={styles.resetCopy}>
                <Text style={styles.resetTitle}>Reset game</Text>
                <Text style={styles.resetHint}>
                  Delete save data and start over from onboarding
                </Text>
              </View>
              {resetting ? (
                <ActivityIndicator color={color.danger} />
              ) : (
                <Text style={styles.resetChevron}>›</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    marginBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: color.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: color.bg.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
    overflow: 'hidden',
  },
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  resetRowPressed: {
    backgroundColor: color.bg.elevated,
  },
  resetCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  resetTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.danger,
  },
  resetHint: {
    fontSize: fontSize.label,
    color: color.text.secondary,
    lineHeight: 18,
  },
  resetChevron: {
    fontSize: 22,
    color: SETTINGS_ACCENT,
    fontWeight: fontWeight.regular,
  },
});
