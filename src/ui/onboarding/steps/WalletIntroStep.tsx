/**
 * WalletIntroStep.tsx — onboarding step 2.
 * ------------------------------------------------------------------
 * Tells the player what a wallet is. Tapping "Generate wallet"
 * dispatches `generateWallet`, which parks a 12-word phrase on the
 * onboarding slice for the next step to show.
 */
import { StyleSheet, Text, View } from 'react-native';
import { OnboardingButton } from '../OnboardingButton';
import { ProgressBars } from '../ProgressBars';
import { useGameStore } from '../../../state/store';
import { fontWeight } from '../../../theme/theme';

interface Props {
  onNext: () => void;
}

export function WalletIntroStep({ onNext }: Props) {
  const generateWallet = useGameStore((s) => s.generateWallet);

  const handleGenerate = (): void => {
    generateWallet();
    onNext();
  };

  return (
    <View style={styles.root}>
      <ProgressBars total={4} filled={2} />
      <Text style={styles.title}>Create your wallet</Text>
      <Text style={styles.subtitle}>
        A wallet holds your crypto and signs your transactions. We&apos;ll
        generate a Secret Recovery Phrase — the master key to everything
        you&apos;ll own.
      </Text>
      <View style={styles.spacer} />
      <OnboardingButton label="Generate wallet" onPress={handleGenerate} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14.5,
    lineHeight: 22,
    marginTop: 10,
  },
  spacer: { flex: 1 },
});
