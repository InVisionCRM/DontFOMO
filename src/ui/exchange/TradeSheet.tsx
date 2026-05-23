/**
 * TradeSheet.tsx — the buy / sell bottom sheet.
 * ------------------------------------------------------------------
 * Slides up over the Exchange when the player taps Buy or Sell. Quick
 * amount buttons, a live "you receive" quote with the exchange fee,
 * and an in-sheet confirmation. Drives the store's buyToken /
 * sellToken actions.
 *
 * The slide uses React Native's built-in Animated.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { resolveTokenDefinition } from './playerTokenView';
import { useGameStore } from '../../state/store';
import { quoteBuy, quoteSell } from '../../engine/economy';
import { formatCurrency, formatTokenAmount } from '../format';
import {
  color,
  fontSize,
  fontWeight,
  motion,
  radius,
  spacing,
  tabularNums,
} from '../../theme/theme';

export interface TradeRequest {
  tokenId: string;
  mode: 'buy' | 'sell';
}

interface TradeSheetProps {
  request: TradeRequest | null;
  onClose: () => void;
}

const QUICK_AMOUNTS = [100, 500, 1000];

export function TradeSheet({ request, onClose }: TradeSheetProps) {
  const { height } = useWindowDimensions();
  const market = useGameStore((s) => s.market);
  const cash = useGameStore((s) => s.cash);
  const holdings = useGameStore((s) => s.holdings);
  const playerTokens = useGameStore((s) => s.playerTokens);
  const buyToken = useGameStore((s) => s.buyToken);
  const sellToken = useGameStore((s) => s.sellToken);

  const [displayed, setDisplayed] = useState<TradeRequest | null>(null);
  const [amount, setAmount] = useState(0);
  const [phase, setPhase] = useState<'input' | 'done'>('input');
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (request) {
      setDisplayed(request);
      setPhase('input');
      const s = useGameStore.getState();
      const token = s.market.tokens[request.tokenId];
      const available =
        request.mode === 'buy'
          ? s.cash
          : (s.holdings[request.tokenId] ?? 0) * (token?.price ?? 0);
      setAmount(Math.min(100, Math.max(0, available)));
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.duration.base,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start();
    } else if (displayed) {
      Animated.timing(progress, {
        toValue: 0,
        duration: motion.duration.base,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setDisplayed(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  if (!displayed) {
    return null;
  }

  const { tokenId, mode } = displayed;
  const token = resolveTokenDefinition(tokenId, playerTokens);
  const marketState = market.tokens[tokenId];
  if (!token || !marketState) {
    return null;
  }
  const price = marketState.price;
  const owned = holdings[tokenId] ?? 0;
  const available = mode === 'buy' ? cash : owned * price;

  const buyQuote = quoteBuy(amount, price);
  const sellTokenAmount =
    amount >= available ? owned : price > 0 ? amount / price : 0;
  const sellQuote = quoteSell(sellTokenAmount, price);

  const canConfirm = amount > 0 && amount <= available + 1e-6;
  const accent = mode === 'buy' ? color.success : color.danger;

  const scrimOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });

  const confirm = (): void => {
    if (!canConfirm) return;
    if (mode === 'buy') {
      buyToken(tokenId, amount);
    } else {
      sellToken(tokenId, sellTokenAmount);
    }
    setPhase('done');
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.scrim, { opacity: scrimOpacity }]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.grip} />

        {phase === 'input' ? (
          <>
            <Text style={styles.title}>
              {mode === 'buy' ? 'Buy' : 'Sell'} {token.name}
            </Text>

            <View style={styles.payBox}>
              <Text style={styles.payLabel}>
                {mode === 'buy' ? 'You pay' : 'You sell'}
              </Text>
              <Text style={[styles.payValue, tabularNums]}>
                {formatCurrency(amount)}
              </Text>
            </View>

            <View style={styles.quick}>
              {QUICK_AMOUNTS.map((value) => (
                <Pressable
                  key={value}
                  style={styles.quickBtn}
                  onPress={() => setAmount(Math.min(value, available))}
                >
                  <Text style={styles.quickText}>
                    ${value.toLocaleString('en-US')}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.quickBtn}
                onPress={() => setAmount(available)}
              >
                <Text style={styles.quickText}>Max</Text>
              </Pressable>
            </View>

            <View style={styles.line}>
              <Text style={styles.lineKey}>You receive</Text>
              <Text style={[styles.lineValue, tabularNums]}>
                {mode === 'buy'
                  ? `${formatTokenAmount(buyQuote.tokenAmount)} ${token.id}`
                  : formatCurrency(sellQuote.usd)}
              </Text>
            </View>
            <View style={styles.line}>
              <Text style={styles.lineKey}>Exchange fee</Text>
              <Text style={[styles.lineValue, tabularNums]}>
                {formatCurrency(mode === 'buy' ? buyQuote.fee : sellQuote.fee)}
              </Text>
            </View>

            <Pressable
              style={[
                styles.confirm,
                { backgroundColor: accent },
                !canConfirm && styles.confirmDisabled,
              ]}
              onPress={confirm}
              disabled={!canConfirm}
              accessibilityRole="button"
            >
              <Text style={styles.confirmText}>
                Confirm {mode === 'buy' ? 'buy' : 'sell'}
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.done}>
            <Text style={[styles.doneCheck, { color: accent }]}>✓</Text>
            <Text style={styles.doneTitle}>
              {mode === 'buy' ? 'Buy' : 'Sell'} order filled
            </Text>
            <Text style={styles.doneText}>Your balance has been updated.</Text>
            <Pressable
              style={styles.doneBtn}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: '#000000',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.strong,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  grip: {
    width: 38,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: color.border.strong,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    marginBottom: spacing.md,
  },
  payBox: {
    backgroundColor: color.bg.elevated,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  payLabel: {
    fontSize: fontSize.label,
    color: color.text.secondary,
  },
  payValue: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    marginTop: 4,
  },
  quick: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: color.bg.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
  },
  quickText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  lineKey: {
    fontSize: fontSize.body,
    color: color.text.secondary,
  },
  lineValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  confirm: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: radius.lg,
  },
  confirmDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  done: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  doneCheck: {
    fontSize: 44,
    fontWeight: fontWeight.bold,
  },
  doneTitle: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  doneText: {
    fontSize: fontSize.body,
    color: color.text.secondary,
  },
  doneBtn: {
    marginTop: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.huge,
    borderRadius: radius.lg,
    backgroundColor: color.bg.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.strong,
  },
  doneBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
});
