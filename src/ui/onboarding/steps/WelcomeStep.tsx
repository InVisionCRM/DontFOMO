/**
 * WelcomeStep.tsx — onboarding step 0.
 * ------------------------------------------------------------------
 * Bible §13's first impression. Centered logo + tagline + a single
 * "Get started" CTA. No progress bar — the flow's segments start
 * counting from the Profile step.
 */
import { StyleSheet, Text, View } from 'react-native';
import { OnboardingButton } from '../OnboardingButton';
import { fontWeight } from '../../../theme/theme';

interface Props {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.spacer} />
      <Text style={styles.logo}>
        DON&apos;T <Text style={styles.logoAccent}>FOMO</Text>
      </Text>
      <Text style={styles.tagline}>
        Live the crypto life. Build a fortune. Survive the scams that come
        for it.
      </Text>
      <View style={styles.spacer} />
      <OnboardingButton label="Get started" onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { flex: 1 },
  logo: {
    fontSize: 40,
    fontWeight: fontWeight.bold,
    letterSpacing: -1.5,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  logoAccent: {
    color: '#FFD9A8',
  },
  tagline: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
  },
});
