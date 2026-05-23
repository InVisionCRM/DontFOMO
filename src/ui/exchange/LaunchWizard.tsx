/**
 * LaunchWizard.tsx — the player token-launch flow.
 * ------------------------------------------------------------------
 * A full-screen flow that slides in over the Exchange when the player
 * taps the launch card on the Portfolio tab. Three steps:
 *   1. pick a logo emoji from the curated grid;
 *   2. name the token and choose a ticker (validated live);
 *   3. review the cost and launch.
 *
 * On launch it drives the store's `launchToken` action, then reports
 * the new token id so the Exchange can open its detail screen — the
 * screen updating is the confirmation (Design Bible §5).
 *
 * The slide uses React Native's built-in Animated.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { TokenBadge } from './TokenBadge';
import { useGameStore } from '../../state/store';
import { dayNumber } from '../../engine/time/clock';
import {
  MAX_PLAYER_TOKENS,
  PLAYER_TOKEN_START_PRICE,
  tokenLaunchCost,
} from '../../engine/economy';
import { LAUNCH_EMOJIS } from '../../data/launch';
import { formatCurrency, formatTokenPrice } from '../format';
import {
  color,
  fontSize,
  fontWeight,
  motion,
  radius,
  spacing,
  tabularNums,
} from '../../theme/theme';

interface LaunchWizardProps {
  /** Whether the wizard is open. */
  open: boolean;
  /** Close without launching. */
  onClose: () => void;
  /** A token was launched — its id, so the Exchange can open it. */
  onLaunched: (tokenId: string) => void;
}

/** Top padding so content clears the notch. */
const TOP_PAD = 52;
/** Name and ticker length limits. */
const NAME_MAX = 18;
const TICKER_MIN = 3;
const TICKER_MAX = 6;
/** The emoji grid is six columns wide. */
const GRID_COLS = 6;
const GRID_GAP = spacing.sm;

export function LaunchWizard({ open, onClose, onLaunched }: LaunchWizardProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const playerTokens = useGameStore((s) => s.playerTokens);
  const clock = useGameStore((s) => s.clock);
  const cash = useGameStore((s) => s.cash);
  const market = useGameStore((s) => s.market);
  const launchToken = useGameStore((s) => s.launchToken);

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0); // 0 logo · 1 name · 2 review
  const [emoji, setEmoji] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setMounted(true);
      setStep(0);
      setEmoji(null);
      setName('');
      setTicker('');
      slide.setValue(width);
      Animated.timing(slide, {
        toValue: 0,
        duration: motion.duration.base,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(slide, {
        toValue: width,
        duration: motion.duration.base,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, width]);

  if (!mounted) {
    return null;
  }

  const trimmedName = name.trim();
  const nameValid = trimmedName.length > 0;
  const tickerTaken =
    ticker.length >= TICKER_MIN && market.tokens[ticker] !== undefined;
  const tickerValid =
    ticker.length >= TICKER_MIN &&
    ticker.length <= TICKER_MAX &&
    !tickerTaken;

  const cost = tokenLaunchCost(playerTokens.length + 1, dayNumber(clock));
  const canAfford = cost <= cash;
  const slotLabel = `${playerTokens.length === 0 ? '1st' : '2nd'} of ${MAX_PLAYER_TOKENS}`;

  const stepValid =
    step === 0
      ? emoji !== null
      : step === 1
        ? nameValid && tickerValid
        : canAfford;

  const onTickerChange = (raw: string): void => {
    setTicker(raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, TICKER_MAX));
  };

  const goBack = (): void => {
    if (step > 0) {
      setStep((s) => s - 1);
    } else {
      onClose();
    }
  };

  const doLaunch = (): void => {
    if (emoji === null || !nameValid || !tickerValid || !canAfford) {
      return;
    }
    launchToken({
      id: ticker,
      name: trimmedName,
      emoji,
      gradient: color.brandGradient,
    });
    if (useGameStore.getState().market.tokens[ticker]) {
      onLaunched(ticker);
    } else {
      onClose();
    }
  };

  const goNext = (): void => {
    if (!stepValid) {
      return;
    }
    if (step < 2) {
      setStep((s) => s + 1);
    } else {
      doLaunch();
    }
  };

  const cell = Math.floor(
    (width - spacing.lg * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS,
  );

  const tickerHelp = tickerTaken
    ? 'That ticker is already listed on the Exchange.'
    : ticker.length > 0 && ticker.length < TICKER_MIN
      ? `Use at least ${TICKER_MIN} letters.`
      : "3–6 letters · your coin's trading symbol.";

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { transform: [{ translateX: slide }] },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[styles.topBar, { paddingTop: Math.max(insets.top, TOP_PAD) }]}
        >
          <Pressable
            style={styles.back}
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={step > 0 ? 'Previous step' : 'Close'}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M15 6l-6 6l6 6"
                stroke={color.text.primary}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </Pressable>
          <Text style={styles.topTitle}>New token</Text>
          <View style={styles.pips}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.pip, i <= step && styles.pipOn]}
              />
            ))}
          </View>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && (
            <>
              <Text style={styles.stepLabel}>Step 1 of 3</Text>
              <Text style={styles.h1}>Pick your logo</Text>
              <Text style={styles.sub}>
                This emoji is your coin's face everywhere on the Exchange.
              </Text>
              <View style={styles.grid}>
                {LAUNCH_EMOJIS.map((e) => (
                  <Pressable
                    key={e}
                    style={[
                      styles.cell,
                      { width: cell, height: cell },
                      emoji === e && styles.cellSel,
                    ]}
                    onPress={() => setEmoji(e)}
                    accessibilityRole="button"
                    accessibilityLabel={`Logo ${e}`}
                    accessibilityState={{ selected: emoji === e }}
                  >
                    <Text style={{ fontSize: Math.round(cell * 0.46) }}>
                      {e}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Text style={styles.stepLabel}>Step 2 of 3</Text>
              <Text style={styles.h1}>Name your token</Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>TOKEN NAME</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="DogeMoon"
                  placeholderTextColor={color.text.tertiary}
                  maxLength={NAME_MAX}
                  autoCapitalize="words"
                  autoCorrect={false}
                  accessibilityLabel="Token name"
                />
                <Text style={styles.fieldHelp}>
                  The full name shown on the Exchange.
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>TICKER</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputTicker,
                    tickerTaken && styles.inputError,
                  ]}
                  value={ticker}
                  onChangeText={onTickerChange}
                  placeholder="DMOON"
                  placeholderTextColor={color.text.tertiary}
                  maxLength={TICKER_MAX}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  accessibilityLabel="Ticker symbol"
                />
                <Text
                  style={[
                    styles.fieldHelp,
                    tickerTaken && styles.fieldHelpError,
                  ]}
                >
                  {tickerHelp}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>PREVIEW</Text>
              <View style={styles.previewRow}>
                <TokenBadge emoji={emoji ?? '🪙'} size={40} />
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName} numberOfLines={1}>
                    {trimmedName || 'Your token'}
                  </Text>
                  <Text style={styles.previewMeta} numberOfLines={1}>
                    {ticker || '———'} · Your token
                  </Text>
                </View>
                <View style={styles.previewRight}>
                  <Text style={[styles.previewPrice, tabularNums]}>
                    {formatTokenPrice(PLAYER_TOKEN_START_PRICE)}
                  </Text>
                  <Text style={[styles.previewChange, tabularNums]}>0.0%</Text>
                </View>
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.stepLabel}>Step 3 of 3</Text>
              <Text style={styles.h1}>Review &amp; launch</Text>

              <View style={styles.reviewCard}>
                <Text style={styles.reviewEmoji}>{emoji}</Text>
                <Text style={styles.reviewName}>{trimmedName}</Text>
                <Text style={styles.reviewTicker}>{ticker}</Text>
                <View style={styles.reviewRows}>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewKey}>Starting price</Text>
                    <Text style={[styles.reviewValue, tabularNums]}>
                      {formatTokenPrice(PLAYER_TOKEN_START_PRICE)}
                    </Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewKey}>Token slot</Text>
                    <Text style={styles.reviewValue}>{slotLabel}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewKey}>Launch cost</Text>
                    <Text
                      style={[
                        styles.reviewValue,
                        tabularNums,
                        cost === 0 && styles.reviewValueFree,
                      ]}
                    >
                      {cost === 0 ? 'FREE' : formatCurrency(cost)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.noteBox}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Circle
                    cx={12}
                    cy={12}
                    r={9}
                    stroke={color.brand}
                    strokeWidth={2}
                    fill="none"
                  />
                  <Path
                    d="M12 16.5v-5M12 8h0"
                    stroke={color.brand}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    fill="none"
                  />
                </Svg>
                <Text style={styles.noteText}>
                  Your first token is free; a second launch costs more the
                  longer you have survived. Once it is live, your followers
                  drive its price — pump it to gain followers, dump it and
                  they leave.
                </Text>
              </View>

              {!canAfford && (
                <Text style={styles.affordWarn}>
                  You need {formatCurrency(cost)} to launch — you have{' '}
                  {formatCurrency(cash)}.
                </Text>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.primaryBtn, !stepValid && styles.primaryBtnDisabled]}
            onPress={goNext}
            disabled={!stepValid}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>
              {step < 2 ? 'Next' : `Launch ${ticker}`}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: color.bg.base,
  },
  fill: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  back: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  pips: {
    flexDirection: 'row',
    gap: 5,
    marginLeft: 'auto',
  },
  pip: {
    width: 20,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: color.bg.elevated,
  },
  pipOn: {
    backgroundColor: color.brand,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  stepLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: color.brand,
    letterSpacing: 0.7,
  },
  h1: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    marginTop: 4,
  },
  sub: {
    fontSize: fontSize.body,
    color: color.text.secondary,
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginTop: spacing.lg,
  },
  cell: {
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSel: {
    backgroundColor: color.brandSoft,
    borderWidth: 2,
    borderColor: color.brand,
  },
  field: {
    marginTop: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: color.text.secondary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: color.bg.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.strong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  inputTicker: {
    letterSpacing: 1,
  },
  inputError: {
    borderColor: color.danger,
  },
  fieldHelp: {
    fontSize: fontSize.caption,
    color: color.text.tertiary,
    marginTop: 6,
  },
  fieldHelpError: {
    color: color.danger,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
  },
  previewInfo: {
    flex: 1,
    minWidth: 0,
  },
  previewName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  previewMeta: {
    fontSize: fontSize.caption,
    color: color.text.secondary,
    marginTop: 1,
  },
  previewRight: {
    alignItems: 'flex-end',
  },
  previewPrice: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  previewChange: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: color.text.tertiary,
    marginTop: 2,
  },
  reviewCard: {
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
    alignItems: 'center',
  },
  reviewEmoji: {
    fontSize: 52,
  },
  reviewName: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    marginTop: spacing.sm,
  },
  reviewTicker: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: color.text.secondary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  reviewRows: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border.hairline,
  },
  reviewKey: {
    fontSize: fontSize.body,
    color: color.text.secondary,
  },
  reviewValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  reviewValueFree: {
    color: color.success,
  },
  noteBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
  },
  noteText: {
    flex: 1,
    fontSize: fontSize.label,
    color: color.text.secondary,
    lineHeight: 19,
  },
  affordWarn: {
    fontSize: fontSize.label,
    color: color.danger,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border.hairline,
  },
  primaryBtn: {
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: radius.lg,
    backgroundColor: color.brand,
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
});
