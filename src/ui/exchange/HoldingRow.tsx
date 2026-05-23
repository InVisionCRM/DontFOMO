/**
 * HoldingRow.tsx — one row in the Exchange Portfolio list.
 * ------------------------------------------------------------------
 * Emoji logo, name, amount owned, and the holding's current value and
 * day change. Presentational — tapping it opens the token (to sell).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TokenBadge } from './TokenBadge';
import { OwnBadge } from './OwnBadge';
import { formatCurrency, formatSignedPercent, formatTokenAmount } from '../format';
import { dayChangePercent, type TokenMarketState } from '../../engine/market';
import type { TokenDefinition } from '../../data/tokens';
import {
  color,
  fontSize,
  fontWeight,
  spacing,
  tabularNums,
} from '../../theme/theme';

interface HoldingRowProps {
  token: TokenDefinition;
  state: TokenMarketState;
  /** Amount of the token owned. */
  amount: number;
  /** True for a token the player launched — shows the YOURS badge. */
  isOwn?: boolean;
  onPress?: (token: TokenDefinition) => void;
}

export function HoldingRow({
  token,
  state,
  amount,
  isOwn,
  onPress,
}: HoldingRowProps) {
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
      <TokenBadge emoji={token.emoji} size={40} />

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {token.name}
          </Text>
          {isOwn && <OwnBadge />}
        </View>
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
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
    flexShrink: 1,
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
