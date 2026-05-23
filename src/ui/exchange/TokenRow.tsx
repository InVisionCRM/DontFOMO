/**
 * TokenRow.tsx — one row in the Exchange token list.
 * ------------------------------------------------------------------
 * Badge, name, ticker / category, a sparkline, and the live price and
 * day change. Presentational — reports taps via onPress.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkline } from '../Sparkline';
import { formatSignedPercent, formatTokenPrice } from '../format';
import { dayChangePercent, type TokenMarketState } from '../../engine/market';
import type { TokenDefinition } from '../../data/tokens';
import {
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
  tabularNums,
} from '../../theme/theme';

interface TokenRowProps {
  token: TokenDefinition;
  state: TokenMarketState;
  onPress?: (token: TokenDefinition) => void;
}

export function TokenRow({ token, state, onPress }: TokenRowProps) {
  const change = dayChangePercent(state);
  const changeColor =
    change > 0 ? color.success : change < 0 ? color.danger : color.text.tertiary;

  return (
    <Pressable
      style={styles.row}
      onPress={() => onPress?.(token)}
      accessibilityRole="button"
      accessibilityLabel={`${token.name}, ${formatTokenPrice(state.price)}`}
    >
      <LinearGradient
        colors={token.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.badge}
      >
        <Text style={styles.badgeText}>{token.id.slice(0, 2)}</Text>
      </LinearGradient>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {token.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {token.id} · {token.category}
        </Text>
      </View>

      <Sparkline
        data={state.history.slice(-24)}
        width={56}
        height={26}
        color={changeColor}
      />

      <View style={styles.right}>
        <Text style={[styles.price, tabularNums]}>
          {formatTokenPrice(state.price)}
        </Text>
        <Text style={[styles.change, tabularNums, { color: changeColor }]}>
          {formatSignedPercent(change)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border.hairline,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  meta: {
    fontSize: fontSize.caption,
    color: color.text.secondary,
    marginTop: 1,
  },
  right: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  price: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  change: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
});
