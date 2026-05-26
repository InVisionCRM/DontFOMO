/**
 * MarketScreen.tsx — the Market app (Bible §5).
 * ------------------------------------------------------------------
 * "Buy assets to grow your net worth and your following." Title +
 * subtitle, three category filter chips (Cars / Watches / Houses),
 * a 2-column grid of `AssetCard`s, slide-in `AssetDetail`.
 *
 * Built to the approved Market mockup.
 */
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AssetCard } from './AssetCard';
import { AssetDetail } from './AssetDetail';
import { useGameStore } from '../../state/store';
import {
  ASSET_CATEGORIES,
  findAsset,
  isOwned,
  ownedValue,
  type AssetCategory,
  type OwnedAsset,
} from '../../engine/assets';
import { ASSET_CATALOG } from '../../data/assets';
import { fontWeight } from '../../theme/theme';

/** Stable empty-array fallback for the Fast-Refresh stale-state guard. */
const EMPTY_OWNED: readonly OwnedAsset[] = [];

const TOP_PAD = 52;
const SCREEN_BG = '#0F0D13';
const TEXT_COLOR = '#F1EEF5';
const MUTED_COLOR = '#9B93A8';
const CHIP_BG = '#1C1825';
const CHIP_BORDER = '#2C2638';
const CHIP_TEXT = '#9B93A8';
const CHIP_ON_BG = '#3A1F33';
const CHIP_ON_BORDER = '#EC4899';
const CHIP_ON_TEXT = '#F9C8E0';

export function MarketScreen() {
  const insets = useSafeAreaInsets();
  const cash = useGameStore((s) => s.cash) ?? 0;
  const owned = useGameStore((s) => s.assets) ?? EMPTY_OWNED;
  const buyAsset = useGameStore((s) => s.buyAsset);
  const sellAsset = useGameStore((s) => s.sellAsset);

  const [category, setCategory] = useState<AssetCategory>('Cars');
  const [openId, setOpenId] = useState<string | null>(null);

  const ownedCount = owned.length;
  const collectionValue = ownedValue(ASSET_CATALOG, owned);

  const visible = useMemo(
    () => ASSET_CATALOG.filter((a) => a.category === category),
    [category],
  );
  const opened = openId ? findAsset(ASSET_CATALOG, openId) ?? null : null;
  const openedOwned = opened ? isOwned(owned, opened.id) : false;
  const canBuyOpened = opened ? cash >= opened.price : false;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, TOP_PAD) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Market</Text>
        <Text style={styles.subtitle}>
          Buy assets to grow your net worth and your following.
        </Text>
        {ownedCount > 0 && (
          <Text style={styles.ownedLine}>
            {ownedCount} owned · ${collectionValue.toLocaleString('en-US')} book
            value
          </Text>
        )}

        <View style={styles.chips}>
          {ASSET_CATEGORIES.map((c) => {
            const on = c === category;
            return (
              <View
                key={c}
                style={[
                  styles.chip,
                  on && styles.chipOn,
                ]}
                onTouchEnd={() => setCategory(c)}
              >
                <Text
                  style={[styles.chipText, on && styles.chipTextOn]}
                  accessibilityRole="button"
                  accessibilityLabel={c}
                >
                  {c}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.grid}>
          {visible.map((a) => (
            <View key={a.id} style={styles.cell}>
              <AssetCard
                asset={a}
                owned={isOwned(owned, a.id)}
                onPress={setOpenId}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <AssetDetail
        asset={opened}
        owned={openedOwned}
        canBuy={canBuyOpened}
        onBack={() => setOpenId(null)}
        onBuy={(id) => {
          buyAsset(id, Date.now());
          setOpenId(null);
        }}
        onSell={(id) => {
          sellAsset(id, Date.now());
          setOpenId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.6,
    color: TEXT_COLOR,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED_COLOR,
    marginTop: 2,
  },
  ownedLine: {
    fontSize: 12,
    color: CHIP_ON_TEXT,
    marginTop: 6,
    fontWeight: fontWeight.semibold,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 14,
  },
  chip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: CHIP_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CHIP_BORDER,
    alignItems: 'center',
  },
  chipOn: {
    backgroundColor: CHIP_ON_BG,
    borderColor: CHIP_ON_BORDER,
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: fontWeight.bold,
    color: CHIP_TEXT,
  },
  chipTextOn: {
    color: CHIP_ON_TEXT,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 13,
  },
  cell: {
    width: '48%',
    flexGrow: 1,
  },
});
