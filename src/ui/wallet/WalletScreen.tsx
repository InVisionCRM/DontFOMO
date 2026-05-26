/**
 * WalletScreen.tsx — the Wallet app (Stage 6).
 * ------------------------------------------------------------------
 * On-phone balance: cash, crypto holdings, and total net worth.
 * Simulated only — not a custodial wallet (CLAUDE.md §7).
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '../../state/store';
import { computeNetWorth, holdingsValue } from '../../engine/economy';
import {
  PLAYER_AVATAR_GRADIENT,
  resolveDisplayName,
} from '../../engine/player/identity';
import { senderInitials } from '../../engine/mail';
import { formatCurrency } from '../format';
import { fontWeight, tabularNums } from '../../theme/theme';

const TOP_PAD = 52;
const BG = '#0B0F14';
const LABEL = 'rgba(255,255,255,0.55)';
const ACCENT = '#FBB24A';

export function WalletScreen() {
  const insets = useSafeAreaInsets();
  const cash = useGameStore((s) => s.cash);
  const holdings = useGameStore((s) => s.holdings);
  const market = useGameStore((s) => s.market);
  const assets = useGameStore((s) => s.assets);
  const handle = useGameStore((s) => s.handle);
  const displayName = useGameStore((s) => s.displayName);

  const crypto = holdingsValue(holdings, market);
  const netWorth = computeNetWorth(cash, holdings, market, assets ?? []);
  const name = resolveDisplayName(displayName, handle);
  const tokenCount = Object.keys(holdings).filter(
    (id) => (holdings[id] ?? 0) > 0,
  ).length;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, TOP_PAD) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Wallet</Text>

        <View style={styles.profileRow}>
          <LinearGradient
            colors={PLAYER_AVATAR_GRADIENT}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{senderInitials(name)}</Text>
          </LinearGradient>
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{name}</Text>
            <Text style={styles.profileHandle}>{handle}</Text>
          </View>
        </View>

        <LinearGradient
          colors={['#1A2634', '#0F1720']}
          style={styles.heroCard}
        >
          <Text style={styles.heroLabel}>Total balance</Text>
          <Text style={[styles.heroValue, tabularNums]}>
            {formatCurrency(netWorth)}
          </Text>
          <Text style={styles.heroSub}>
            {tokenCount === 0
              ? 'Cash only — buy tokens on Exchange'
              : `${tokenCount} token${tokenCount === 1 ? '' : 's'} on Exchange`}
          </Text>
        </LinearGradient>

        <View style={styles.rowCard}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Cash</Text>
            <Text style={[styles.rowValue, tabularNums]}>
              {formatCurrency(cash)}
            </Text>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Crypto</Text>
            <Text style={[styles.rowValue, tabularNums]}>
              {formatCurrency(crypto)}
            </Text>
          </View>
        </View>

        <Text style={styles.note}>
          Simulated wallet — not connected to a real chain. Never share a
          recovery phrase with anyone.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: fontWeight.bold,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: fontWeight.semibold,
  },
  profileHandle: {
    color: LABEL,
    fontSize: 14,
    marginTop: 2,
  },
  heroCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(251, 178, 74, 0.25)',
  },
  heroLabel: {
    color: LABEL,
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroValue: {
    color: ACCENT,
    fontSize: 36,
    fontWeight: fontWeight.bold,
    marginTop: 6,
  },
  heroSub: {
    color: LABEL,
    fontSize: 14,
    marginTop: 8,
  },
  rowCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  rowLabel: {
    color: LABEL,
    fontSize: 15,
  },
  rowValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: fontWeight.semibold,
  },
  note: {
    color: LABEL,
    fontSize: 13,
    lineHeight: 18,
  },
});
