/**
 * HoldingRow.tsx — one row in the Exchange Portfolio list.
 * ------------------------------------------------------------------
 * Badge, name, amount owned, and the holding's current value and day
 * change. Presentational — tapping it opens the token (to sell).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency, formatSignedPercent, formatTokenAmount } from '../format';
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

interface HoldingRowProps {
  token: TokenDefinition;
  state: TokenMarketState;
  /** Amount of the token owned. */
  amount: number;
  onPress?: (token: TokenDefinition) => void;
}

export function HoldingRow({ token, state, amount, onPress }: HoldingRowProps) {
  const value = amount * state.price;
  const change = dayChangePercent(state);
  const changeColor =
    change > 0 ? color.success : change < 0 ? color.danger : color.text.tertiary;

  return (
    <Pressable
      style={styles.row}
      onPress={() => onPress?.(token)}
      accessibilityRole="button"
      accessibilityLabel={`${token.name} holding, worth ${formatCurrency(value)}`}
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
          {formatTokenAmount(amount)} {token.id}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.value, tabularNums]}>{formatCurrency(value)}</Text>
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
  value: {
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
