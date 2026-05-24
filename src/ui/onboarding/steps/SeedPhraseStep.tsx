/**
 * SeedPhraseStep.tsx — onboarding step 3 (the trap).
 * ------------------------------------------------------------------
 * Bible §11/§13's flagship Slow Burn lives in this screen. The
 * player sees the 12 words and two affordances:
 *
 *   - **Continue** — the safe path. They saved the phrase by reading
 *     it.
 *   - **Copy to clipboard** — the trap. Tapping it writes a
 *     sensitive entry into the Clipboard via `copySeedToClipboard`.
 *     The Scam Director's later scan tick (Stage 6) detonates from
 *     that entry; the player can defuse it any time before that by
 *     deleting it in the Clipboard app.
 *
 * Tapping Copy DOES NOT advance — the trap is the copy itself, not
 * the navigation. The player still has to tap Continue.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OnboardingButton } from '../OnboardingButton';
import { ProgressBars } from '../ProgressBars';
import { useGameStore } from '../../../state/store';
import { SEED_PHRASE_LENGTH } from '../../../engine/onboarding';
import { fontWeight, radius, spacing } from '../../../theme/theme';

interface Props {
  onNext: () => void;
}

export function SeedPhraseStep({ onNext }: Props) {
  const phrase = useGameStore((s) => s.onboarding.pendingSeedPhrase);
  const copySeedToClipboard = useGameStore((s) => s.copySeedToClipboard);
  const [copied, setCopied] = useState(false);

  const words = phrase ?? new Array(SEED_PHRASE_LENGTH).fill('—');

  const handleCopy = (): void => {
    copySeedToClipboard(Date.now());
    setCopied(true);
  };

  return (
    <View style={styles.root}>
      <ProgressBars total={4} filled={3} />
      <Text style={styles.title}>Your recovery phrase</Text>
      <Text style={styles.subtitle}>
        These 12 words are your wallet. Save them somewhere safe.
      </Text>

      <View style={styles.grid}>
        {words.map((word, i) => (
          <View key={i} style={styles.wordCell}>
            <Text style={styles.wordIndex}>{i + 1}</Text>
            <Text style={styles.wordText}>{word}</Text>
          </View>
        ))}
      </View>

      <View style={styles.warning}>
        <Text style={styles.warningText}>
          Never share these words with anyone. Anyone who has them controls
          your wallet.
        </Text>
      </View>

      <View style={styles.spacer} />
      <OnboardingButton
        label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
        onPress={handleCopy}
        variant="ghost"
        disabled={copied}
      />
      <View style={styles.buttonGap} />
      <OnboardingButton label="I've saved it — Continue" onPress={onNext} />
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  wordCell: {
    width: '31%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordIndex: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginRight: 4,
  },
  wordText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: fontWeight.semibold,
  },
  warning: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(251,146,60,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.4)',
  },
  warningText: {
    color: '#FFE2C4',
    fontSize: 12.5,
    lineHeight: 18.5,
  },
  spacer: { flex: 1 },
  buttonGap: { height: spacing.sm + 2 },
});
