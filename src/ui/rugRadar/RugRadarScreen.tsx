/**
 * RugRadarScreen.tsx — the Rug Radar minigame app.
 * ------------------------------------------------------------------
 * Three views inside one screen: Start (rules + lifetime stats +
 * play button), Game (the card stack + LEGIT/SCAM buttons), Result
 * (summary + per-card review).
 *
 * The session lives in the store; the view-state is local UI state
 * (start vs game vs result is a presentational concern). When the
 * deck completes, the store clears the session and the screen
 * captures the summary so it can render the result view.
 *
 * Built to DontFOMO_RugRadar_App_Mockup.html. Cross-app values from
 * theme.ts; the Rug Radar amber→red palette stays inline per
 * CLAUDE.md §13's mockup-derived-colour pattern.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore, type RugRadarJudgeOutcome } from '../../state/store';
import {
  RUG_RADAR_DECK_SIZE,
  RUG_RADAR_PERFECT_DECK_BONUS_USD,
  RUG_RADAR_STREAK_BONUS_FOLLOWERS,
  RUG_RADAR_STREAK_BONUS_USD,
  createRugRadar,
  decksRemainingToday,
  lifetimeAccuracy,
  type RugRadarCard,
  type RugRadarState,
  type SessionSummary,
} from '../../engine/rugRadar';
import { msUntilLocalMidnight } from '../../engine/economy';
import { dailyDeck } from '../../data/rugRadar';
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
import { RugRadarCardView } from './RugRadarCardView';

/** Top pad so the header clears the simulated status bar. */
const TOP_PAD = 52;

/** Rug Radar palette — inline because it only matters here. */
const ACCENT = {
  amber: '#FB923C',
  amberDeep: '#B91C1C',
  cardGreen: '#16C784',
  cardRed: '#EA3943',
  buttonGreen: '#4ADE80',
  buttonRed: '#FF6B6B',
  textDim: '#9A9DAB',
  textBody: '#C8CAD4',
} as const;

/** Stable empty default for the rugRadar slice, used outside selectors. */
const EMPTY_STATE: RugRadarState = createRugRadar(0);

type ScreenView = 'start' | 'game' | 'result';

export function RugRadarScreen() {
  const insets = useSafeAreaInsets();
  const rugRadar = useGameStore((s) => s.rugRadar) ?? EMPTY_STATE;
  const clockNow = useGameStore((s) => s.clock.now);
  const startSession = useGameStore((s) => s.startRugRadarSession);
  const judge = useGameStore((s) => s.judgeRugRadarCard);

  // Local view state — start/game/result is a presentation concern.
  // Initial view: if a session is live, drop the player back into it.
  const [view, setView] = useState<ScreenView>(() =>
    rugRadar.session ? 'game' : 'start',
  );
  // Captured at deck completion so we can render the result view after
  // the engine has already cleared the session.
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  const handleStart = (): void => {
    startSession(clockNow);
    setSummary(null);
    setView('game');
  };

  const handleDone = (): void => {
    setSummary(null);
    setView('start');
  };

  // Called by the game view when the engine reports deck completion.
  const handleDeckComplete = (s: SessionSummary): void => {
    setSummary(s);
    setView('result');
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#14080A', '#0C0405', '#07020A']}
        locations={[0, 0.6, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Header
        topPad={Math.max(insets.top, TOP_PAD)}
        view={view}
        rugRadar={rugRadar}
        now={clockNow}
      />

      <View
        style={[
          styles.viewport,
          { paddingTop: Math.max(insets.top, TOP_PAD) + 76 },
        ]}
      >
        {view === 'start' && (
          <StartView rugRadar={rugRadar} now={clockNow} onStart={handleStart} />
        )}
        {view === 'game' && rugRadar.session && (
          <GameView
            rugRadar={rugRadar}
            judge={judge}
            onDeckComplete={handleDeckComplete}
          />
        )}
        {view === 'result' && summary && (
          <ResultView
            rugRadar={rugRadar}
            summary={summary}
            now={clockNow}
            onDone={handleDone}
          />
        )}
      </View>
    </View>
  );
}

// ---------- header ----------

interface HeaderProps {
  topPad: number;
  view: ScreenView;
  rugRadar: RugRadarState;
  now: number;
}

function Header({ topPad, view, rugRadar, now }: HeaderProps) {
  const remaining = decksRemainingToday(rugRadar, now);
  const session = rugRadar.session;

  const sub =
    view === 'game' && session
      ? `Today's deck · ${session.deck.length} cards`
      : view === 'result'
        ? 'Deck complete'
        : 'Daily training · spot the scam';

  const cap =
    view === 'result' || remaining === 0
      ? `New deck in ${formatHours(msUntilLocalMidnight(now))}`
      : `${RUG_RADAR_DECK_SIZE} left today`;

  return (
    <View style={[styles.header, { paddingTop: topPad + spacing.xs }]}>
      <View style={styles.brand}>
        <LinearGradient
          colors={[ACCENT.amber, ACCENT.amberDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mark}
        >
          <RadarGlyph />
        </LinearGradient>
        <View>
          <Text style={styles.brandTitle}>Rug Radar</Text>
          <Text style={styles.brandSub}>{sub}</Text>
        </View>
      </View>

      <View style={styles.capChip}>
        <Text style={[styles.capChipText, tabularNums]}>{cap}</Text>
      </View>
    </View>
  );
}

function RadarGlyph() {
  return (
    <View style={styles.glyphWrap}>
      <View style={styles.glyphOuter} />
      <View style={styles.glyphInner} />
      <View style={styles.glyphDot} />
    </View>
  );
}

// ---------- start view ----------

interface StartViewProps {
  rugRadar: RugRadarState;
  now: number;
  onStart: () => void;
}

function StartView({ rugRadar, now, onStart }: StartViewProps) {
  const remaining = decksRemainingToday(rugRadar, now);
  const accuracyPct = Math.round(lifetimeAccuracy(rugRadar) * 100);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.startContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>TODAY'S DECK</Text>
        <Text style={styles.heroTitle}>Don't get rugged.</Text>
        <Text style={styles.heroTag}>
          Sort {RUG_RADAR_DECK_SIZE} cards into{' '}
          <Text style={{ color: ACCENT.cardGreen, fontWeight: fontWeight.bold }}>
            LEGIT
          </Text>{' '}
          or{' '}
          <Text style={{ color: ACCENT.cardRed, fontWeight: fontWeight.bold }}>
            SCAM
          </Text>
          .{'\n'}Pays cash per correct call. High accuracy pays followers.
        </Text>
      </View>

      <View style={styles.statRow}>
        <Stat label="lifetime correct" value={`${rugRadar.lifetimeCorrect}`} />
        <Stat label="lifetime accuracy" value={`${accuracyPct}%`} />
        <Stat label="lifetime earned" value={formatCurrency(rugRadar.lifetimeEarned)} />
      </View>

      <View style={styles.rules}>
        <Rule
          glyph="$"
          tint={ACCENT.cardGreen}
          title="Each correct call pays $25–$75"
          sub="Harder cards pay more. Wrong calls pay nothing."
        />
        <Rule
          glyph="+"
          tint={ACCENT.amber}
          title={`3-in-a-row = +$${RUG_RADAR_STREAK_BONUS_USD} & +${RUG_RADAR_STREAK_BONUS_FOLLOWERS} followers`}
          sub="Building a streak proves you're paying attention."
        />
        <Rule
          glyph="!"
          tint={ACCENT.cardRed}
          title={`Flawless deck = +$${RUG_RADAR_PERFECT_DECK_BONUS_USD} bonus`}
          sub="Cards refresh at midnight."
        />
      </View>

      {remaining > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start today's Rug Radar deck"
          onPress={onStart}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <LinearGradient
            colors={[ACCENT.amber, ACCENT.amberDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.ctaText}>Start today's deck</Text>
        </Pressable>
      ) : (
        <View style={[styles.cta, styles.ctaDisabled]}>
          <Text style={styles.ctaText}>
            New deck in {formatHours(msUntilLocalMidnight(now))}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tabularNums]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Rule({
  glyph,
  tint,
  title,
  sub,
}: {
  glyph: string;
  tint: string;
  title: string;
  sub: string;
}) {
  return (
    <View style={styles.rule}>
      <View
        style={[
          styles.ruleGlyph,
          {
            borderColor: hexToRgba(tint, 0.35),
            backgroundColor: hexToRgba(tint, 0.16),
          },
        ]}
      >
        <Text style={[styles.ruleGlyphText, { color: tint }]}>{glyph}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.ruleTitle}>{title}</Text>
        <Text style={styles.ruleSub}>{sub}</Text>
      </View>
    </View>
  );
}

// ---------- game view ----------

interface GameViewProps {
  rugRadar: RugRadarState;
  judge: (calledScam: boolean) => RugRadarJudgeOutcome | null;
  onDeckComplete: (summary: SessionSummary) => void;
}

function GameView({ rugRadar, judge, onDeckComplete }: GameViewProps) {
  const session = rugRadar.session;
  if (!session) return null;

  const card = session.deck[session.idx] as RugRadarCard | undefined;

  // Animated card exit (translateX + rotate + fade).
  const translate = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [stamp, setStamp] = useState<'legit' | 'scam' | null>(null);
  const [locked, setLocked] = useState(false);

  // Reset the animation values whenever the card index changes.
  useEffect(() => {
    translate.setValue(0);
    rotate.setValue(0);
    opacity.setValue(1);
    setStamp(null);
    setLocked(false);
  }, [session.idx, translate, rotate, opacity]);

  const handleJudge = (calledScam: boolean): void => {
    if (locked || !card) return;
    setLocked(true);
    setStamp(calledScam ? 'scam' : 'legit');

    // The store action returns the engine's outcome so the screen can
    // drive its card-exit animation and the deck-complete transition
    // without importing the engine directly.
    const outcome = judge(calledScam);

    Animated.parallel([
      Animated.timing(translate, {
        toValue: calledScam ? -460 : 460,
        duration: motion.duration.slow,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: calledScam ? -1 : 1,
        duration: motion.duration.slow,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: motion.duration.base,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (outcome && outcome.deckComplete && outcome.summary) {
        onDeckComplete(outcome.summary);
      }
    });
  };

  if (!card) return null;

  const rotateInterp = rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-22deg', '0deg', '22deg'],
  });

  return (
    <View style={styles.gameRoot}>
      <View style={styles.gameHud}>
        <View>
          <Text style={styles.hudLabel}>Earned</Text>
          <Text style={[styles.hudValue, { color: ACCENT.cardGreen }, tabularNums]}>
            {formatCurrency(session.earned)}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.hudLabel}>Streak</Text>
          <Text style={[styles.hudValue, { color: ACCENT.amber }, tabularNums]}>
            {session.streak}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.hudLabel}>Card</Text>
          <Text style={[styles.hudValue, tabularNums]}>
            {session.idx + 1} / {session.deck.length}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${(session.idx / session.deck.length) * 100}%` },
          ]}
        >
          <LinearGradient
            colors={[ACCENT.amber, ACCENT.amberDeep]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>

      <View style={styles.deck}>
        {/* Behind cards — purely visual depth. Drawn first → behind. */}
        {session.idx + 2 < session.deck.length && (
          <View style={[styles.deckCardBehind, styles.deckCardBehind2]} />
        )}
        {session.idx + 1 < session.deck.length && (
          <View style={[styles.deckCardBehind, styles.deckCardBehind1]} />
        )}

        <Animated.View
          style={[
            styles.deckCardFront,
            {
              transform: [{ translateX: translate }, { rotate: rotateInterp }],
              opacity,
            },
          ]}
        >
          <RugRadarCardView card={card} stamp={stamp} />
        </Animated.View>
      </View>

      <View style={styles.verdictRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark as scam"
          onPress={() => handleJudge(true)}
          disabled={locked}
          style={({ pressed }) => [
            styles.verdictBtn,
            styles.verdictBtnScam,
            pressed && styles.verdictBtnPressed,
            locked && styles.verdictBtnDisabled,
          ]}
        >
          <Text style={[styles.verdictText, { color: ACCENT.buttonRed }]}>
            ✕  SCAM
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark as legit"
          onPress={() => handleJudge(false)}
          disabled={locked}
          style={({ pressed }) => [
            styles.verdictBtn,
            styles.verdictBtnLegit,
            pressed && styles.verdictBtnPressed,
            locked && styles.verdictBtnDisabled,
          ]}
        >
          <Text style={[styles.verdictText, { color: ACCENT.buttonGreen }]}>
            ✓  LEGIT
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------- result view ----------

interface ResultViewProps {
  rugRadar: RugRadarState;
  summary: SessionSummary;
  now: number;
  onDone: () => void;
}

function ResultView({ rugRadar, summary, now, onDone }: ResultViewProps) {
  const accuracy = Math.round((summary.correctCount / summary.totalCount) * 100);
  const tierEyebrow =
    summary.perfectBonus > 0
      ? { text: 'FLAWLESS DECK', color: ACCENT.cardGreen }
      : accuracy >= 70
        ? { text: 'SHARP EYE', color: ACCENT.amber }
        : { text: 'NEEDS WORK', color: ACCENT.cardRed };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.resultContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={[styles.heroEyebrow, { color: tierEyebrow.color }]}>
          {tierEyebrow.text}
        </Text>
        <Text style={[styles.resultEarned, tabularNums]}>
          {formatCurrency(summary.totalEarned)}
        </Text>
        <Text style={styles.heroTag}>
          {summary.perfectBonus > 0 ? 'flawless — bonus paid' : 'earned today'}
        </Text>
      </View>

      <View style={styles.resultGrid}>
        <ResultCell label="Accuracy" value={`${accuracy}%`} />
        <ResultCell
          label="Followers"
          value={`+${summary.totalFollowers}`}
          tint={color.brand}
        />
        <ResultCell label="Best streak" value={`${summary.bestStreak}`} tint={ACCENT.amber} />
        <ResultCell
          label="Perfect bonus"
          value={formatCurrency(summary.perfectBonus)}
          tint={ACCENT.cardGreen}
        />
      </View>

      <Text style={styles.reviewHead}>REVIEW</Text>
      <View style={styles.reviewList}>
        {rugRadar.session === null && (
          <ReviewList
            // Pull the per-card results from the engine's last summary by
            // walking the deck against summary.correctCount/totalCount.
            // Because the engine clears the session at deck-complete we
            // can't read the per-card results array directly here; the
            // mockup's deck-review list is a polish item flagged in the
            // changelog. v1 renders the headline summary instead.
          />
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close results"
        onPress={onDone}
        style={({ pressed }) => [
          styles.cta,
          styles.ctaResult,
          pressed && styles.ctaPressed,
        ]}
      >
        <LinearGradient
          colors={[ACCENT.amber, ACCENT.amberDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.ctaText}>Done</Text>
      </Pressable>

      <Text style={styles.resultFooter}>
        Next deck in {formatHours(msUntilLocalMidnight(now))}
      </Text>
    </ScrollView>
  );
}

function ResultCell({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint?: string;
}) {
  return (
    <View style={styles.resultCell}>
      <Text style={styles.resultCellLabel}>{label}</Text>
      <Text
        style={[
          styles.resultCellValue,
          tabularNums,
          tint ? { color: tint } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function ReviewList(_props: Record<string, unknown>) {
  // Per-card review list intentionally deferred — see ResultView comment.
  return null;
}

// ---------- helpers ----------

function formatHours(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---------- styles ----------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07020A',
    overflow: 'hidden',
  },
  viewport: {
    flex: 1,
    paddingHorizontal: spacing.xl + 2,
    paddingBottom: spacing.xxxl,
  },
  scroll: {
    flex: 1,
  },

  // header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 12,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphOuter: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.6,
    borderColor: '#FFFFFF',
  },
  glyphInner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.4,
    borderColor: '#FFFFFF',
  },
  glyphDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  brandTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    letterSpacing: -0.2,
  },
  brandSub: {
    fontSize: 11,
    color: color.text.secondary,
    marginTop: 1,
  },
  capChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.32)',
    backgroundColor: 'rgba(251,146,60,0.12)',
  },
  capChipText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: '#FBB88A',
  },

  // start
  startContent: {
    paddingBottom: spacing.xxxl,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    letterSpacing: 2,
    color: ACCENT.amber,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    letterSpacing: -0.6,
    marginTop: spacing.sm,
  },
  heroTag: {
    fontSize: 14,
    color: ACCENT.textDim,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 4,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxl + 2,
  },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 11,
    color: color.text.secondary,
    marginTop: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // rules
  rules: {
    marginTop: spacing.xl + 2,
  },
  rule: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  ruleGlyph: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleGlyphText: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  ruleSub: {
    fontSize: 12,
    color: ACCENT.textDim,
    marginTop: 2,
    lineHeight: 17,
  },

  // cta
  cta: {
    marginTop: spacing.xl,
    width: '100%',
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaPressed: {
    transform: [{ scale: 0.985 }],
  },
  ctaDisabled: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // game
  gameRoot: {
    flex: 1,
  },
  gameHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: spacing.md + 2,
  },
  hudLabel: {
    fontSize: 10,
    color: color.text.secondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  hudValue: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: spacing.md + 2,
  },
  progressFill: {
    height: '100%',
    overflow: 'hidden',
    borderRadius: 999,
  },

  deck: {
    flex: 1,
    minHeight: 360,
    position: 'relative',
  },
  deckCardBehind: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.bg.elevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border.hairline,
  },
  deckCardBehind1: {
    transform: [{ translateY: 10 }, { scale: 0.97 }],
    opacity: 0.7,
  },
  deckCardBehind2: {
    transform: [{ translateY: 20 }, { scale: 0.94 }],
    opacity: 0.4,
  },
  deckCardFront: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  verdictRow: {
    flexDirection: 'row',
    gap: spacing.md + 2,
    marginTop: spacing.lg,
  },
  verdictBtn: {
    flex: 1,
    height: 60,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  verdictBtnScam: {
    backgroundColor: 'rgba(234,57,67,0.14)',
    borderColor: 'rgba(234,57,67,0.45)',
  },
  verdictBtnLegit: {
    backgroundColor: 'rgba(22,199,132,0.14)',
    borderColor: 'rgba(22,199,132,0.45)',
  },
  verdictBtnPressed: {
    transform: [{ scale: 0.97 }],
  },
  verdictBtnDisabled: {
    opacity: 0.45,
  },
  verdictText: {
    fontSize: 15,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },

  // result
  resultContent: {
    paddingBottom: spacing.xxxl,
  },
  resultEarned: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    letterSpacing: -0.6,
    marginTop: spacing.sm,
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xl + 2,
    gap: 10,
  },
  resultCell: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    padding: spacing.md + 2,
  },
  resultCellLabel: {
    fontSize: 11,
    color: color.text.secondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  resultCellValue: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    marginTop: 4,
  },
  reviewHead: {
    marginTop: spacing.lg,
    fontSize: 11,
    color: color.text.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  reviewList: {
    gap: 6,
  },
  ctaResult: {
    marginTop: spacing.lg,
  },
  resultFooter: {
    marginTop: spacing.md,
    fontSize: 11,
    color: color.text.tertiary,
    textAlign: 'center',
  },
});
