/**
 * OwnBadge.tsx — the "YOURS" pill.
 * ------------------------------------------------------------------
 * A small inline badge marking a token the player launched themselves.
 * It sits beside the token name in the Exchange list so a player token
 * reads as just-another-coin while still being recognisably theirs.
 *
 * Presentational — no props, no state.
 */
import { StyleSheet, Text, View } from 'react-native';
import { color, fontSize, fontWeight, radius } from '../../theme/theme';

export function OwnBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>YOURS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: color.brandSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.brand,
  },
  text: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.6,
    color: color.brandText,
  },
});
