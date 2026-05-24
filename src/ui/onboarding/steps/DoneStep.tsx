/**
 * DoneStep.tsx — onboarding step 5 (final).
 * ------------------------------------------------------------------
 * Tapping "Enter DON'T FOMO" dispatches `finishOnboarding`, which
 * flips `hasOnboarded` to true. App.tsx subscribes to that flag and
 * swaps to PhoneShell, so this component does not need an `onNext`
 * callback — the routing handles itself.
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { OnboardingButton } from '../OnboardingButton';
import { useGameStore } from '../../../state/store';
import { fontWeight, spacing } from '../../../theme/theme';

export function DoneStep() {
  const handle = useGameStore((s) => s.handle);
  const finishOnboarding = useGameStore((s) => s.finishOnboarding);

  // Strip the leading "@" for the welcome line.
  const displayName = handle.startsWith('@') ? handle.slice(1) : handle;

  return (
    <View style={styles.root}>
      <View style={styles.spacer} />
      <View style={styles.checkCircle}>
        <Svg width={44} height={44} viewBox="0 0 24 24">
          <Path
            d="M5 12l5 5l9 -9"
            stroke="#FFFFFF"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </View>
      <Text style={styles.title}>You&apos;re all set</Text>
      <Text style={styles.subtitle}>
        Welcome to DON&apos;T FOMO, {displayName}. The markets never sleep
        — and neither do the scammers.
      </Text>
      <View style={styles.spacer} />
      <OnboardingButton label="Enter DON'T FOMO" onPress={finishOnboarding} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { flex: 1 },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14.5,
    lineHeight: 22,
    marginTop: 10,
    textAlign: 'center',
  },
});
