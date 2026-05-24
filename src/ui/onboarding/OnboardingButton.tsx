/**
 * OnboardingButton.tsx — the onboarding flow's primary/ghost button.
 * ------------------------------------------------------------------
 * One look, two variants. The primary button is white-on-violet (the
 * main CTA on every step). The ghost button is glass-on-violet, used
 * for the "Copy to clipboard" trap and other secondary actions. Both
 * support a `disabled` state that dims and blocks taps.
 *
 * Inline styles per the codebase pattern (CLAUDE.md §13 — "mockup-
 * derived colours stay inline" for onboarding's purple-magenta scene).
 */
import { Pressable, StyleSheet, Text } from 'react-native';
import { fontSize, fontWeight, radius, spacing } from '../../theme/theme';

export type OnboardingButtonVariant = 'primary' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: OnboardingButtonVariant;
  disabled?: boolean;
  /** Optional accessibility hint for screen readers. */
  accessibilityHint?: string;
}

export function OnboardingButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityHint,
}: Props) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={isPrimary ? styles.labelPrimary : styles.labelGhost}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: {
    backgroundColor: '#FFFFFF',
  },
  ghost: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
  labelPrimary: {
    color: '#1A1330',
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.2,
  },
  labelGhost: {
    color: '#FFFFFF',
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.2,
  },
});
