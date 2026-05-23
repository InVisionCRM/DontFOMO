/**
 * LaunchTokenCard.tsx — the "Launch your own token" entry card.
 * ------------------------------------------------------------------
 * Sits on the Exchange's Portfolio tab. Tapping it opens the launch
 * wizard. It reads the live game state to show the next launch's cost
 * (the first token is free), and switches to a quiet disabled state
 * once the player has used both of their lifetime launches.
 *
 * Presentational — reports the tap through onPress.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useGameStore } from '../../state/store';
import { dayNumber } from '../../engine/time/clock';
import { MAX_PLAYER_TOKENS, tokenLaunchCost } from '../../engine/economy';
import { formatCurrency } from '../format';
import {
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../../theme/theme';

interface LaunchTokenCardProps {
  /** Open the launch wizard. */
  onPress: () => void;
}

export function LaunchTokenCard({ onPress }: LaunchTokenCardProps) {
  const playerTokens = useGameStore((s) => s.playerTokens);
  const clock = useGameStore((s) => s.clock);

  const atMax = playerTokens.length >= MAX_PLAYER_TOKENS;
  const cost = tokenLaunchCost(playerTokens.length + 1, dayNumber(clock));
  const costLabel =
    cost === 0 ? "Your first one's free." : `Costs ${formatCurrency(cost)}.`;

  if (atMax) {
    return (
      <View style={[styles.card, styles.cardDisabled]}>
        <View style={[styles.icon, styles.iconDisabled]}>
          <Text style={styles.iconEmoji}>🚀</Text>
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>Both tokens launched</Text>
          <Text style={styles.sub}>
            You have used both of your lifetime token launches.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Launch your own token"
    >
      <LinearGradient
        colors={color.brandGradient}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.icon}
      >
        <Text style={styles.iconEmoji}>🚀</Text>
      </LinearGradient>
      <View style={styles.text}>
        <Text style={styles.title}>Launch your own token</Text>
        <Text style={styles.sub}>Mint a coin. {costLabel}</Text>
      </View>
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path
          d="M9 6l6 6l-6 6"
          stroke={color.text.tertiary}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: color.brandSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.brand,
  },
  cardDisabled: {
    backgroundColor: color.bg.surface,
    borderColor: color.border.hairline,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDisabled: {
    backgroundColor: color.bg.elevated,
    opacity: 0.5,
  },
  iconEmoji: {
    fontSize: 26,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  sub: {
    fontSize: fontSize.label,
    color: color.text.secondary,
    marginTop: 2,
  },
});
