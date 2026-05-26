/**
 * GoldenGiveawayCompare.tsx — the Verify→Compare flow.
 * ------------------------------------------------------------------
 * Stage 6.5a. Shown when the player taps "Verify @handle" on the
 * takeover overlay. Renders the two accounts side-by-side — the
 * 3-day-old clone vs the 2019-vintage real founder with the pinned
 * anti-scam tweet — so the player can spot the lure for themselves.
 *
 * Two real exits:
 *   - Report fake account → resolves the instance as `caught: true`
 *     via `onReport`. The store pays the minor vigilance reward and
 *     pushes the friend-voice teaching thread.
 *   - Participate anyway → resolves the instance as `caught: false`.
 *     The store applies the 30% cash + 30% crypto drain.
 *
 * "Back" returns to the takeover overlay without resolving.
 *
 * Reads the canon from the takeover snapshot pinned in the store —
 * NEVER from `GOLDEN_GIVEAWAY_CANON` directly — so a save persisted
 * mid-instance still renders correctly after a canon rename.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GOLDEN_GIVEAWAY_CANON, type GoldenGiveawayTakeover } from '../../data/goldenGiveaway';

export interface GoldenGiveawayCompareProps {
  takeover: GoldenGiveawayTakeover;
  onBack: () => void;
  /** Player tapped Report — resolve as caught. */
  onReport: () => void;
  /** Player tapped Participate Anyway — resolve as fell-for. */
  onParticipateAnyway: () => void;
}

/** Format a follower count tersely — 412, 1.4M, etc. */
function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

export function GoldenGiveawayCompare(props: GoldenGiveawayCompareProps) {
  // Pull the live, frozen-at-deploy snapshot for the handles and names.
  // Pull the *static* canon for the rest (bios, follower counts, the
  // pinned warning) — those are pure copy that doesn't need to live in
  // the per-instance snapshot.
  const real = GOLDEN_GIVEAWAY_CANON.real;
  const fake = GOLDEN_GIVEAWAY_CANON.fake;
  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Pressable onPress={props.onBack} hitSlop={10}>
          <View style={styles.backRow}>
            <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 6l-6 6l6 6"
                stroke="#1d9bf0"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.backText}>Back</Text>
          </View>
        </Pressable>
        <Text style={styles.title}>Search</Text>
      </View>

      <View style={styles.searchPill}>
        <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
          <Path
            d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0M21 21l-6 -6"
            stroke="#71767b"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={styles.searchText}>{props.takeover.fakeName}</Text>
      </View>
      <Text style={styles.resultLabel}>2 accounts · verified</Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {/* FAKE */}
        <AccountRow
          avatarBg="#c98a16"
          avatarText="V"
          name={props.takeover.fakeName}
          handle={props.takeover.fakeHandle}
          followers={fake.followers}
          bio={fake.bio}
          pills={[
            { kind: 'warn', text: `Joined ${fake.joinedDaysAgo} days ago` },
            { kind: 'warn', text: 'Handle ends in _eth' },
            { kind: 'neutral', text: 'Verified (Gold)' },
          ]}
          pinLabel="Promoted post"
          pinBody={`${props.takeover.title} First ${props.takeover.walletsTotal} wallets that send 0.05–5 ETH get double back instantly. ${props.takeover.claimedPercent}% claimed.`}
        />

        {/* REAL */}
        <AccountRow
          avatarBg="#7c5cff"
          avatarText="V"
          name={real.name}
          handle={real.handle}
          followers={real.followers}
          bio={real.bio}
          pills={[
            { kind: 'good', text: `Joined ${real.joined}` },
            { kind: 'good', text: 'Original handle' },
            { kind: 'neutral', text: 'Verified (Blue)' },
          ]}
          pinLabel="Pinned 8 months ago"
          pinBody={real.pinnedTweet}
        />
      </ScrollView>

      <View style={styles.ctaRow}>
        <Pressable
          style={({ pressed }) => [
            styles.cta,
            styles.ctaReport,
            pressed && styles.ctaPressed,
          ]}
          onPress={props.onReport}
          accessibilityRole="button"
          accessibilityLabel="Report the fake account"
        >
          <Text style={styles.ctaReportText}>Report fake account</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.cta,
            styles.ctaParticipate,
            pressed && styles.ctaPressed,
          ]}
          onPress={props.onParticipateAnyway}
          accessibilityRole="button"
          accessibilityLabel="Participate anyway"
        >
          <Text style={styles.ctaParticipateText}>Participate anyway</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* -------- account row -------- */

interface Pill {
  kind: 'warn' | 'good' | 'neutral';
  text: string;
}

interface AccountRowProps {
  avatarBg: string;
  avatarText: string;
  name: string;
  handle: string;
  followers: number;
  bio: string;
  pills: readonly Pill[];
  pinLabel: string;
  pinBody: string;
}

function AccountRow(props: AccountRowProps) {
  return (
    <View style={rowStyles.root}>
      <View style={[rowStyles.avatar, { backgroundColor: props.avatarBg }]}>
        <Text style={rowStyles.avatarText}>{props.avatarText}</Text>
      </View>
      <View style={rowStyles.body}>
        <View style={rowStyles.nameRow}>
          <Text style={rowStyles.name}>{props.name}</Text>
          <View style={rowStyles.vb}>
            <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
              <Path
                d="M5 12l5 5l10 -10"
                stroke="#fff"
                strokeWidth={3.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </View>
        <Text style={rowStyles.handle}>
          {props.handle} · {fmtFollowers(props.followers)} followers
        </Text>
        <Text style={rowStyles.bio}>{props.bio}</Text>
        <View style={rowStyles.pills}>
          {props.pills.map((p, i) => (
            <View
              key={i}
              style={[
                rowStyles.pill,
                p.kind === 'warn' && rowStyles.pillWarn,
                p.kind === 'good' && rowStyles.pillGood,
              ]}
            >
              <Text
                style={[
                  rowStyles.pillText,
                  p.kind === 'warn' && rowStyles.pillTextWarn,
                  p.kind === 'good' && rowStyles.pillTextGood,
                ]}
              >
                {p.text}
              </Text>
            </View>
          ))}
        </View>
        <View style={rowStyles.pin}>
          <View style={rowStyles.pinLabelRow}>
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 4l3 6l6 0.75l-4.5 4l1.5 6.25l-6 -3l-6 3l1.5 -6.25l-4.5 -4l6 -0.75z"
                stroke="#6fb6e8"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={rowStyles.pinLabel}>{props.pinLabel}</Text>
          </View>
          <Text style={rowStyles.pinBody}>{props.pinBody}</Text>
        </View>
      </View>
    </View>
  );
}

/* -------- styles -------- */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  top: {
    paddingTop: 64,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#16181c',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  backText: {
    color: '#1d9bf0',
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    color: '#e7e9ea',
    fontSize: 16,
    fontWeight: '800',
  },
  searchPill: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#16181c',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  searchText: {
    color: '#e7e9ea',
    fontSize: 14,
    fontWeight: '700',
  },
  resultLabel: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    color: '#71767b',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: '#16181c',
    backgroundColor: '#000',
  },
  cta: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaReport: {
    backgroundColor: '#16c784',
  },
  ctaReportText: {
    color: '#04261a',
    fontWeight: '800',
    fontSize: 14,
  },
  ctaParticipate: {
    backgroundColor: '#ea3943',
  },
  ctaParticipateText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  ctaPressed: {
    opacity: 0.86,
  },
});

const rowStyles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#16181c',
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    color: '#fff',
    fontSize: 14.5,
    fontWeight: '800',
  },
  vb: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#1d9bf0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    color: '#71767b',
    fontSize: 13,
    marginTop: 1,
  },
  bio: {
    color: '#c9ced6',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  pills: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  pillWarn: {
    backgroundColor: 'rgba(234,57,67,0.10)',
    borderColor: 'rgba(234,57,67,0.40)',
  },
  pillGood: {
    backgroundColor: 'rgba(22,199,132,0.10)',
    borderColor: 'rgba(22,199,132,0.40)',
  },
  pillText: {
    color: '#71767b',
    fontSize: 11.5,
    fontWeight: '600',
  },
  pillTextWarn: {
    color: '#fda4a8',
  },
  pillTextGood: {
    color: '#6ee7b7',
  },
  pin: {
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: 'rgba(29,155,240,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(29,155,240,0.22)',
  },
  pinLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  pinLabel: {
    color: '#6fb6e8',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pinBody: {
    color: '#cfe2f3',
    fontSize: 12.5,
    lineHeight: 18,
  },
});
