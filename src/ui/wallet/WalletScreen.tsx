/**
 * WalletScreen.tsx — the Wallet app (production v1).
 * ------------------------------------------------------------------
 * Shows the player's on-phone balance: cash, crypto holdings, and
 * total net worth. No on-chain custody — DON'T FOMO is a simulation
 * (CLAUDE.md §7). The recovery phrase lives in Clipboard history if
 * the player copied it during onboarding.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '../../state/store';
import { computeNetWorth } from '../../engine/economy/netWorth';
import { holdingsValue } from '../../engine/economy';
import { ownedValue } from '../../engine/assets';
import { ASSET_CATALOG } from '../../data/assets';
import {
  PLAYER_AVATAR_GRADIENT,
  resolveDisplayName,
} from '../../engine/player/identity';
import { senderInitials } from '../../engine/mail';
import { formatCurrency } from '../format';
import { fontWeight, tabularNums } from '../../theme/theme';

const TOP_PAD = 52;
const BG = '#0B0F14';
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.1)';
const LABEL = 'rgba(255,255,255,0.55)';
const VALUE = '#FFFFFF';
const ACCENT = '#FBB24A';

export function WalletScreen() {
  const insets = useSafeAreaInsets();
  const cash = useGameStore((s) => s.cash);
  const holdings = useGameStore((s) => s.holdings);
  const market = useGameStore((s) => s.market);
  const assets = useGameStore((s) => s.assets);
  const handle = useGameStore((s) => s.handle);
  const displayName = useGameStore((s) => s.displayName);
  const peakNetWorth = useGameStore((s) => s.peakNetWorth);

  const crypto = holdingsValue(holdings, market);
  const lifestyle = ownedValue(ASSET_CATALOG, assets ?? []);
  const netWorth = computeNetWorth(cash, holdings, market, assets ?? []);
  const name = resolveDisplayName(displayName, handle);
  const tokenCount = Object.keys(holdings).filter(
    (id) => (holdings[id] ?? 0) > 0,
  ).length;
  const ownedCount = (assets ?? []).length;

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
          {lifestyle > 0 && (
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>Lifestyle</Text>
              <Text style={[styles.rowValue, tabularNums]}>
                {formatCurrency(lifestyle)}
              </Text>
            </View>
          )}
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>All-time high</Text>
            <Text style={[styles.rowValue, tabularNums]}>
              {formatCurrency(peakNetWorth)}
            </Text>
          </View>
        </View>

        {ownedCount > 0 && (
          <Text style={styles.assetHint}>
            {ownedCount} Market asset{ownedCount === 1 ? '' : 's'} included in
            lifestyle
          </Text>
        )}

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
    color: VALUE,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: VALUE,
  },
  profileHandle: {
    fontSize: 14,
    color: LABEL,
    marginTop: 2,
  },
  profileText: {
    flex: 1,
  },
  heroCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 13,
    color: LABEL,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroValue: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
    color: VALUE,
    marginTop: 6,
    letterSpacing: -1,
  },
  heroSub: {
    fontSize: 13,
    color: ACCENT,
    marginTop: 8,
  },
  rowCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  rowLabel: {
    fontSize: 15,
    color: LABEL,
  },
  rowValue: {
    fontSize: 17,
    fontWeight: fontWeight.semibold,
    color: VALUE,
  },
  assetHint: {
    fontSize: 12.5,
    color: LABEL,
    marginTop: 10,
    textAlign: 'center',
  },
  note: {
    fontSize: 12.5,
    lineHeight: 18,
    color: LABEL,
    marginTop: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
