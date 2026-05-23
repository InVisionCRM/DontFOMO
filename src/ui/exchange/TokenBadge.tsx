/**
 * TokenBadge.tsx — a token's emoji logo.
 * ------------------------------------------------------------------
 * Token logos are bare emojis — no circle, no background — rendered at
 * a given box size. Presentational. Takes the emoji directly so it
 * works for both catalogue tokens and player-created tokens.
 */
import { StyleSheet, Text, View } from 'react-native';

interface TokenBadgeProps {
  /** The token's emoji logo. */
  emoji: string;
  /** Box size in points; the emoji is sized from it. */
  size: number;
}

export function TokenBadge({ emoji, size }: TokenBadgeProps) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Text style={{ fontSize: size * 0.84 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
