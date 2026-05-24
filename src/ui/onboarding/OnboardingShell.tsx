/**
 * OnboardingShell.tsx — the top-level onboarding container.
 * ------------------------------------------------------------------
 * Bible §13's first-launch flow lives here, gated above PhoneShell
 * by `onboarding.hasOnboarded` in the store (see App.tsx).
 *
 * The shell owns the linear step state (`currentStep`) and renders
 * the right step component. Each step is presentational, dispatches
 * its own store actions (setProfile, generateWallet,
 * copySeedToClipboard, finishOnboarding), and calls `onNext` to
 * advance. The Done step calls `finishOnboarding` which flips the
 * gate and swaps in PhoneShell.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wallpaper } from '../Wallpaper';
import { PhoneStatusBar } from '../PhoneStatusBar';
import { color, spacing } from '../../theme/theme';
import { WelcomeStep } from './steps/WelcomeStep';
import { ProfileStep } from './steps/ProfileStep';
import { WalletIntroStep } from './steps/WalletIntroStep';
import { SeedPhraseStep } from './steps/SeedPhraseStep';
import { ConfirmPhraseStep } from './steps/ConfirmPhraseStep';
import { DoneStep } from './steps/DoneStep';

/** Total step count — bump only if the mockup adds a step. */
export const ONBOARDING_STEPS = 6;

export function OnboardingShell() {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);

  const goNext = (): void => {
    setCurrentStep((s) => Math.min(s + 1, ONBOARDING_STEPS - 1));
  };

  return (
    <View style={styles.root}>
      <Wallpaper />
      <PhoneStatusBar />

      <View
        style={[
          styles.body,
          {
            paddingTop: insets.top + spacing.huge,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
      >
        {currentStep === 0 ? <WelcomeStep onNext={goNext} /> : null}
        {currentStep === 1 ? <ProfileStep onNext={goNext} /> : null}
        {currentStep === 2 ? <WalletIntroStep onNext={goNext} /> : null}
        {currentStep === 3 ? <SeedPhraseStep onNext={goNext} /> : null}
        {currentStep === 4 ? <ConfirmPhraseStep onNext={goNext} /> : null}
        {currentStep === 5 ? <DoneStep /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
  },
});
