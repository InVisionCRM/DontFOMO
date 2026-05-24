/**
 * ProfileStep.tsx — onboarding step 1 (X profile).
 * ------------------------------------------------------------------
 * "Onboarding starts on X" (Bible §13 + §6). The player enters a
 * display name and a bio — that's it. The avatar is auto-derived
 * from the name's first letter.
 *
 * Continue is disabled until the player has typed at least one
 * character of a display name. Tapping it dispatches `setProfile`
 * (which slugifies the handle) and advances to the Wallet Intro
 * step.
 */
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { OnboardingButton } from '../OnboardingButton';
import { ProgressBars } from '../ProgressBars';
import { Avatar } from '../Avatar';
import { useGameStore } from '../../../state/store';
import { fontSize, fontWeight, radius, spacing } from '../../../theme/theme';

interface Props {
  onNext: () => void;
}

export function ProfileStep({ onNext }: Props) {
  const setProfile = useGameStore((s) => s.setProfile);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  const canContinue = name.trim().length > 0;

  const handleContinue = (): void => {
    if (!canContinue) return;
    setProfile(name, bio);
    onNext();
  };

  return (
    <View style={styles.root}>
      <ProgressBars total={4} filled={1} />
      <Text style={styles.title}>Create your profile</Text>
      <Text style={styles.subtitle}>
        This is who the world sees on Clout. Start here — before anything
        else.
      </Text>

      <View style={styles.avatarWrap}>
        <Avatar name={name || '?'} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Display name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="rgba(255,255,255,0.4)"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={24}
          style={styles.input}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="say something honest"
          placeholderTextColor="rgba(255,255,255,0.4)"
          maxLength={80}
          style={styles.input}
        />
      </View>

      <View style={styles.spacer} />
      <OnboardingButton
        label="Continue"
        onPress={handleContinue}
        disabled={!canContinue}
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
  avatarWrap: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  field: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    marginTop: spacing.md,
  },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11.5,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    color: '#FFFFFF',
    fontSize: fontSize.body,
    paddingVertical: 4,
    marginTop: 2,
  },
  spacer: { flex: 1 },
});
