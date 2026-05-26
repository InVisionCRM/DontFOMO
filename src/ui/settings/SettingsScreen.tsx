/**
 * SettingsScreen.tsx — the Settings app (production v1).
 * ------------------------------------------------------------------
 * Read-only player summary: identity, game day, net worth, diamonds.
 * No account linking — the phone is the game.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore, STARTING_CASH } from '../../state/store';
import { computeNetWorth } from '../../engine/economy/netWorth';
import { dayNumber } from '../../engine/time/clock';
import { resolveDisplayName } from '../../engine/player/identity';
import { formatCurrency, formatDate } from '../format';
import { fontWeight, tabularNums } from '../../theme/theme';

const TOP_PAD = 52;
const BG = '#F2F2F7';
const CARD = '#FFFFFF';
const LABEL = '#8E8E93';
const VALUE = '#000000';

interface RowProps {
  label: string;
  value: string;
  last?: boolean;
}

function SettingsRow({ label, value, last }: RowProps) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, tabularNums]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const cash = useGameStore((s) => s.cash);
  const holdings = useGameStore((s) => s.holdings);
  const market = useGameStore((s) => s.market);
  const assets = useGameStore((s) => s.assets);
  const handle = useGameStore((s) => s.handle);
  const displayName = useGameStore((s) => s.displayName);
  const bio = useGameStore((s) => s.bio);
  const followers = useGameStore((s) => s.followers);
  const diamonds = useGameStore((s) => s.diamonds);
  const peakNetWorth = useGameStore((s) => s.peakNetWorth);
  const clock = useGameStore((s) => s.clock);

  const netWorth = computeNetWorth(cash, holdings, market, assets ?? []);
  const name = resolveDisplayName(displayName, handle);
  const day = dayNumber(clock);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, TOP_PAD) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.section}>Player</Text>
        <View style={styles.card}>
          <SettingsRow label="Name" value={name} />
          <SettingsRow label="Handle" value={handle} />
          <SettingsRow
            label="Bio"
            value={bio.trim() || '—'}
            last={followers === 0}
          />
          {followers > 0 && (
            <SettingsRow
              label="Followers"
              value={followers.toLocaleString('en-US')}
              last
            />
          )}
        </View>

        <Text style={styles.section}>Game</Text>
        <View style={styles.card}>
          <SettingsRow label="In-game date" value={formatDate(clock.now)} />
          <SettingsRow label="Day" value={String(day)} />
          <SettingsRow label="Net worth" value={formatCurrency(netWorth)} />
          <SettingsRow
            label="Peak net worth"
            value={formatCurrency(peakNetWorth)}
          />
          <SettingsRow label="Starting cash" value={formatCurrency(STARTING_CASH)} />
          <SettingsRow label="Diamonds" value={String(diamonds)} last />
        </View>

        <Text style={styles.footer}>DON&apos;T FOMO · v1.0.0</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 34,
    fontWeight: fontWeight.bold,
    color: VALUE,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  section: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    color: LABEL,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 16,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60,60,67,0.18)',
  },
  rowLabel: {
    fontSize: 17,
    color: VALUE,
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 17,
    color: LABEL,
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    fontSize: 13,
    color: LABEL,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
});
