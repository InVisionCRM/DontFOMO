/**
 * TokenRow.tsx — one row in the Exchange token list.
 * ------------------------------------------------------------------
 * Emoji logo, name, ticker / category, a sparkline, and the live
 * price and day change. Presentational — reports taps via onPress.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sparkline } from '../Sparkline';
import { TokenBadge } from './TokenBadge';
import { OwnBadge } from './OwnBadge';
import { formatSignedPercent, formatTokenPrice } from '../format';
import { dayChangePercent, type TokenMarketState } from '../../engine/market';
import type { TokenDefinition } from '../../data/tokens';
import {
  color,
  fontSize,
  fontWeight,
  spacing,
  tabularNums,
} from '../../theme/theme';

interface TokenRowProps {
  token: TokenDefinition;
  state: TokenMarketState;
  /** True for a token the player launched — shows the YOURS badge. */
  isOwn?: boolean;
  onPress?: (token: TokenDefinition) => void;
}

export function TokenRow({ token, state, isOwn, onPress }: TokenRowProps) {
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
      <TokenBadge emoji={token.emoji} size={40} />

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {token.name}
          </Text>
          {isOwn && <OwnBadge />}
        </View>
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
