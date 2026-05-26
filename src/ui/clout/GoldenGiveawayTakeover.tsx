/**
 * GoldenGiveawayTakeover.tsx — the full-screen Clout takeover.
 * ------------------------------------------------------------------
 * Stage 6.5a / Scam Library v1.1 Event #10. Mounts inside the Clout
 * screen when `cloutTakeover` is non-null. Two real exit paths:
 *
 *   1. Participate → opens an in-component send-confirm sheet. The
 *      `Confirm` button on that sheet resolves the instance as
 *      `caught: false` (the player fell for it; the store applies the
 *      30% cash + 30% crypto drain).
 *   2. Verify @handle → calls `onVerify` which the parent screen
 *      uses to swap to the compare view.
 *
 * "Dismiss" is the intentionally-doesn't-resolve path: it shakes and
 * surfaces a "It will come back" message but leaves the takeover in
 * place. This is the lockout-pressure flavour Scam Library v1.1
 * specifies for this Inbound Lure. The Director's 3-day timeout fires
 * eventually if the player walks away from the game entirely.
 *
 * Mockup-derived palette stays inline per CLAUDE.md §13 convention.
 */
import { useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { GoldenGiveawayTakeover as TakeoverState } from '../../data/goldenGiveaway';

/** Format a remaining-ms countdown as "HH:MM:SS". Clamped at 00:00:00. */
function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export interface GoldenGiveawayTakeoverProps {
  takeover: TakeoverState;
  /** Current game-clock now (epoch ms) — drives the live countdown. */
  now: number;
  /** Player tapped "Verify @handle". */
  onVerify: () => void;
  /** Player confirmed the send. Store will resolve as fell-for. */
  onConfirmParticipate: () => void;
}

export function GoldenGiveawayTakeover(props: GoldenGiveawayTakeoverProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dismissLabel, setDismissLabel] = useState<string>('Dismiss for now');
  const shake = useState(new Animated.Value(0))[0];

  const remaining = formatRemaining(props.takeover.expiresAt - props.now);
  const initials = props.takeover.fakeName
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 1)
    .join('')
    .toUpperCase();

  const shakeAndStay = () => {
    setDismissLabel('It will come back. Resolve it.');
    Animated.sequence([
      Animated.timing(shake, { toValue: -4, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 4, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -3, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 3, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => setDismissLabel('Dismiss for now'), 2200);
    return () => clearTimeout(t);
  };
  // Belt-and-braces cleanup for the dismiss-message reset timer; the
  // `useState` setter above already fires the reset, but unmount mid-
  // shake (e.g. player tapped Participate→Confirm) shouldn't leave a
  // stale timer flipping state on a dead component.
  useEffect(() => () => undefined, []);

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live · Promoted</Text>
          </View>
          <Pressable onPress={shakeAndStay} hitSlop={10}>
            <Text style={styles.closeX}>×</Text>
          </Pressable>
        </View>

        <View style={styles.author}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || 'V'}</Text>
          </View>
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{props.takeover.fakeName}</Text>
              <View style={styles.vb}>
                <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
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
            <Text style={styles.handle}>{props.takeover.fakeHandle}</Text>
          </View>
        </View>

        <Text style={styles.title}>{props.takeover.title}</Text>
        <Text style={styles.body}>{props.takeover.body}</Text>

        <View style={styles.meter}>
          <View style={styles.meterTop}>
            <Text style={styles.meterLabel}>Allocation</Text>
            <Text style={styles.meterClaimed}>
              {props.takeover.claimedPercent}% claimed
            </Text>
          </View>
          <View style={styles.meterBar}>
            <View
              style={[styles.meterFill, { width: `${props.takeover.claimedPercent}%` }]}
            />
          </View>
          <View style={styles.meterStats}>
            <Text style={styles.meterStatText}>
              <Text style={styles.meterStatBold}>
                {props.takeover.walletsClaimed}
              </Text>{' '}
              / {props.takeover.walletsTotal} wallets
            </Text>
          </View>
        </View>

        <View style={styles.countdownRow}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={9} stroke="#fda4a8" strokeWidth={2} />
            <Path
              d="M12 7v5l3 2"
              stroke="#fda4a8"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.countdownText}>
            Closes in <Text style={styles.countdownTime}>{remaining}</Text>
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.btn,
              styles.btnPrimary,
              pressed && styles.btnPressed,
            ]}
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Participate in the giveaway"
          >
            <Text style={styles.btnPrimaryText}>
              Participate — send ETH
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.btn,
              styles.btnGhost,
              pressed && styles.btnPressed,
            ]}
            onPress={props.onVerify}
            accessibilityRole="button"
            accessibilityLabel={`Verify ${props.takeover.fakeHandle}`}
          >
            <Text style={styles.btnGhostText}>
              Verify {props.takeover.fakeHandle}
            </Text>
          </Pressable>
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <Pressable onPress={shakeAndStay}>
              <Text style={styles.dismissText}>{dismissLabel}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      {sheetOpen && (
        <SendConfirmSheet
          takeover={props.takeover}
          onCancel={() => setSheetOpen(false)}
          onConfirm={() => {
            setSheetOpen(false);
            props.onConfirmParticipate();
          }}
        />
      )}
    </View>
  );
}

/* -------- send-confirm sheet -------- */

interface SendConfirmSheetProps {
  takeover: TakeoverState;
  onCancel: () => void;
  onConfirm: () => void;
}

function SendConfirmSheet(props: SendConfirmSheetProps) {
  return (
    <View style={sheetStyles.scrim}>
      <ScrollView contentContainerStyle={sheetStyles.scrollContent}>
        <View style={sheetStyles.card}>
          <Text style={sheetStyles.from}>MetaPocket · Send ETH</Text>
          <Text style={sheetStyles.title}>Confirm transaction</Text>
          <Text style={sheetStyles.sub}>
            You're about to send ETH to the giveaway contract advertised by{' '}
            <Text style={sheetStyles.subAccent}>
              {props.takeover.fakeHandle}
            </Text>
            .
          </Text>

          <Row label="Send" value={`${props.takeover.suggestedEthAmount.toFixed(2)} ETH`} />
          <Row label="To" value={props.takeover.contractAddress} small />
          <Row label="From" value="Main wallet" />
          <Row label="Network fee" value="~$3.40" />

          <View style={sheetStyles.promise}>
            <Text style={sheetStyles.promiseTitle}>
              You will receive{' '}
              <Text style={sheetStyles.promiseBold}>
                {(props.takeover.suggestedEthAmount * 2).toFixed(2)} ETH back
              </Text>
            </Text>
            <Text style={sheetStyles.promiseSub}>
              within 60 minutes, automatically.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              sheetStyles.btn,
              sheetStyles.btnDanger,
              pressed && sheetStyles.btnPressed,
            ]}
            onPress={props.onConfirm}
            accessibilityRole="button"
            accessibilityLabel="Confirm and send 0.50 ETH"
          >
            <Text style={sheetStyles.btnDangerText}>
              Confirm · send {props.takeover.suggestedEthAmount.toFixed(2)} ETH
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              sheetStyles.btn,
              sheetStyles.btnCalm,
              pressed && sheetStyles.btnPressed,
            ]}
            onPress={props.onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={sheetStyles.btnCalmText}>Cancel</Text>
          </Pressable>
          <Text style={sheetStyles.fee}>This transaction is irreversible.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Row(props: { label: string; value: string; small?: boolean }) {
  return (
    <View style={sheetStyles.row}>
      <Text style={sheetStyles.rowLabel}>{props.label}</Text>
      <Text
        style={[
          sheetStyles.rowValue,
          props.small && sheetStyles.rowValueSmall,
        ]}
        numberOfLines={1}
      >
        {props.value}
      </Text>
    </View>
  );
}

/* -------- styles -------- */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 14,
    paddingTop: 70,
    paddingBottom: 24,
  },
  card: {
    flex: 1,
    borderRadius: 28,
    padding: 22,
    backgroundColor: '#110a02',
    borderWidth: 1,
    borderColor: 'rgba(247,201,72,0.32)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ea3943',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  closeX: {
    fontSize: 22,
    color: '#71767b',
    paddingHorizontal: 4,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 22,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#c98a16',
    borderWidth: 2,
    borderColor: 'rgba(247,201,72,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#1a1205',
    fontWeight: '800',
    fontSize: 19,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    color: '#fff',
    fontSize: 15.5,
    fontWeight: '800',
  },
  vb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1d9bf0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    color: '#f7c948',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  title: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 18,
    letterSpacing: -0.3,
    lineHeight: 29,
  },
  body: {
    color: '#d4c5a0',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  meter: {
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(247,201,72,0.20)',
  },
  meterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meterLabel: {
    color: '#b9a878',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meterClaimed: {
    color: '#f7c948',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meterBar: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 10,
    overflow: 'hidden',
  },
  meterFill: {
    height: 6,
    backgroundColor: '#f7c948',
    borderRadius: 999,
  },
  meterStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 9,
  },
  meterStatText: {
    color: '#d4c5a0',
    fontSize: 12.5,
  },
  meterStatBold: {
    color: '#fff',
    fontWeight: '800',
  },
  countdownRow: {
    marginTop: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: 'rgba(234,57,67,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(234,57,67,0.32)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  countdownText: {
    color: '#fda4a8',
    fontSize: 13,
    fontWeight: '700',
  },
  countdownTime: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: 16,
    gap: 9,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#f7c948',
  },
  btnPrimaryText: {
    color: '#1a1205',
    fontSize: 15.5,
    fontWeight: '800',
  },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  btnGhostText: {
    color: '#e7e9ea',
    fontSize: 15.5,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.86,
  },
  dismissText: {
    textAlign: 'center',
    color: '#71767b',
    fontSize: 12,
    marginTop: 12,
    paddingVertical: 4,
  },
});

const sheetStyles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.66)',
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#0f1116',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1f232b',
    padding: 22,
  },
  from: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: '#f7c948',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  sub: {
    color: '#9aa0ad',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
    textAlign: 'center',
  },
  subAccent: {
    color: '#f7c948',
    fontWeight: '700',
  },
  row: {
    marginTop: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 9,
  },
  rowLabel: {
    color: '#71767b',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 10.5,
    fontWeight: '800',
  },
  rowValue: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  rowValueSmall: {
    fontSize: 11.5,
  },
  promise: {
    marginTop: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(247,201,72,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(247,201,72,0.30)',
  },
  promiseTitle: {
    color: '#f7c948',
    fontSize: 13,
    fontWeight: '700',
  },
  promiseBold: {
    color: '#fff',
    fontWeight: '800',
  },
  promiseSub: {
    color: '#f7c948',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  btn: {
    marginTop: 11,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDanger: {
    backgroundColor: '#ea3943',
  },
  btnDangerText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  btnCalm: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  btnCalmText: {
    color: '#e7e9ea',
    fontSize: 15,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.86,
  },
  fee: {
    color: '#71767b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 11,
  },
});
