/**
 * ConfirmPhraseStep.tsx — onboarding step 4.
 * ------------------------------------------------------------------
 * The mockup shows 12 empty boxes and a "Paste from clipboard"
 * affordance. Tapping Paste fills the grid from the latest clipboard
 * entry — which is the seed phrase IF the player tapped Copy on the
 * previous step. That's the lure that makes the Copy trap feel
 * useful.
 *
 * v1 also exposes a safe escape hatch — "I wrote it down" — so a
 * player who avoided Copy isn't stuck. Either path enables Confirm.
 * The trap is the Copy from step 3, not anything done here.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OnboardingButton } from '../OnboardingButton';
import { ProgressBars } from '../ProgressBars';
import { readLatest } from '../../../engine/clipboard';
import { SEED_PHRASE_LENGTH } from '../../../engine/onboarding';
import { useGameStore } from '../../../state/store';
import { fontWeight, radius, spacing } from '../../../theme/theme';

interface Props {
  onNext: () => void;
}

export function ConfirmPhraseStep({ onNext }: Props) {
  const clipboard = useGameStore((s) => s.clipboard);
  const pending = useGameStore((s) => s.onboarding.pendingSeedPhrase);

  /** What's currently displayed in the grid; null = empty boxes. */
  const [filled, setFilled] = useState<readonly string[] | null>(null);
  const [pasteNote, setPasteNote] = useState<string>('');

  const handlePaste = (): void => {
    const latest = readLatest(clipboard);
    if (!latest) {
      setPasteNote('Clipboard is empty — copy your phrase first.');
      return;
    }
    const tokens = latest.content.trim().toLowerCase().split(/\s+/);
    if (tokens.length !== SEED_PHRASE_LENGTH) {
      setPasteNote('That doesn’t look like a recovery phrase.');
      return;
    }
    setFilled(tokens);
    setPasteNote('Pasted — that was easy.');
  };

  const handleManual = (): void => {
    // Safe path — trust the player they wrote it down; fill from
    // the pending phrase so the grid feels confirmed.
    setFilled(pending ?? null);
    setPasteNote('Marked as saved.');
  };

  return (
    <View style={styles.root}>
      <ProgressBars total={4} filled={4} />
      <Text style={styles.title}>Confirm your phrase</Text>
      <Text style={styles.subtitle}>
        Enter your recovery phrase to confirm you saved it correctly.
      </Text>

      <View style={styles.grid}>
        {Array.from({ length: SEED_PHRASE_LENGTH }, (_, i) => (
          <View
            key={i}
            style={[styles.cell, filled ? styles.cellFilled : null]}
          >
            <Text style={styles.cellIndex}>{i + 1}</Text>
            {filled ? (
              <Text style={styles.cellText}>{filled[i] ?? ''}</Text>
            ) : null}
          </View>
        ))}
      </View>

      <OnboardingButton
        label="Paste from clipboard"
        onPress={handlePaste}
        variant="ghost"
      />
      <View style={styles.buttonGap} />
      <Text style={styles.pasteNote} onPress={handleManual}>
        {pasteNote || 'I wrote it down — mark as saved'}
      </Text>

      <View style={styles.spacer} />
      <OnboardingButton
        label="Confirm"
        onPress={onNext}
        disabled={!filled}
      />
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
    marginBottom: spacing.md,
  },
  cell: {
    width: '31%',
    minHeight: 38,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderStyle: 'solid',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cellIndex: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    marginRight: 4,
  },
  cellText: {
    color: '#FFD9A8',
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
  buttonGap: { height: spacing.sm + 2 },
  pasteNote: {
    color: 'rgba(159,245,196,0.85)',
    fontSize: 12.5,
    textAlign: 'center',
    minHeight: 18,
    paddingVertical: spacing.sm,
  },
  spacer: { flex: 1 },
});
