/**
 * LoanBorrowSheet.tsx — the "Take a loan" bottom sheet.
 * ------------------------------------------------------------------
 * Slides up from the bottom; lists the three loan tiers and their
 * terms. Tapping a tier closes the sheet and reports the choice to
 * the parent. Animation pattern mirrors TradeSheet from Stage 3.
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
import {
  LOAN_TIERS,
  loanWeeklyPayment,
  type LoanTierDefinition,
} from '../../engine/economy';
import { formatCurrency } from '../format';
import {
  color,
  fontSize,
  fontWeight,
  motion,
  radius,
  spacing,
  tabularNums,
} from '../../theme/theme';

interface LoanBorrowSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (tierId: string) => void;
}

const CARD_BG = '#0E1212';
const CARD_BORDER = '#243230';

export function LoanBorrowSheet({
  open,
  onClose,
  onSelect,
}: LoanBorrowSheetProps) {
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.duration.base,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: motion.duration.base,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) {
    return null;
  }

  const scrimOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });

  const handleSelect = (tier: LoanTierDefinition): void => {
    onSelect(tier.id);
    onClose();
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
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
        <Text style={styles.title}>Take a loan</Text>
        <Text style={styles.subtitle}>
          Cash now, paid back weekly with interest. Bigger loans, harsher
          terms.
        </Text>

        <View style={styles.tiers}>
          {LOAN_TIERS.map((tier) => {
            const weekly = loanWeeklyPayment(tier);
            return (
              <Pressable
                key={tier.id}
                style={styles.tier}
                onPress={() => handleSelect(tier)}
                accessibilityRole="button"
                accessibilityLabel={`Borrow ${formatCurrency(tier.principal)}`}
              >
                <View style={styles.tierInfo}>
                  <Text style={[styles.tierAmount, tabularNums]}>
                    {formatCurrency(tier.principal)}
                  </Text>
                  <Text style={styles.tierMeta}>
                    Repaid over {tier.termWeeks} weeks ·{' '}
                    {formatCurrency(weekly)}/wk
                  </Text>
                </View>
                <Text style={styles.tierApr}>
                  {(tier.aprBps / 100).toFixed(0)}% APR
                </Text>
              </Pressable>
            );
          })}
        </View>
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
    paddingBottom: spacing.xxxl,
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
    fontSize: 19,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fontSize.label,
    color: color.text.secondary,
    marginBottom: spacing.md,
  },
  tiers: {
    gap: 10,
  },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CARD_BORDER,
    borderRadius: radius.md,
    padding: 14,
  },
  tierInfo: {
    flex: 1,
    minWidth: 0,
  },
  tierAmount: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  tierMeta: {
    fontSize: fontSize.caption,
    color: color.text.secondary,
    marginTop: 2,
  },
  tierApr: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: color.warning,
  },
});
