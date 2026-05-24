/**
 * AssetDetail.tsx — slide-in detail for one Market asset.
 * ------------------------------------------------------------------
 * 280px gradient hero, back chevron in a blurred-ish pill, asset
 * name + price, the "+N followers while owned" call-out, satirical
 * description, and the Buy / Sell button at the foot.
 */
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import {
  resaleValue,
  type AssetDefinition,
} from '../../engine/assets';
import { formatCurrency } from '../format';
import { fontWeight, motion, tabularNums } from '../../theme/theme';

interface AssetDetailProps {
  asset: AssetDefinition | null;
  owned: boolean;
  /** True if the player has enough cash to buy this asset right now. */
  canBuy: boolean;
  onBack: () => void;
  onBuy: (id: string) => void;
  onSell: (id: string) => void;
}

const SCREEN_BG = '#0F0D13';
const TEXT_COLOR = '#F1EEF5';
const DESC_COLOR = '#C4BCCE';
const PRICE_COLOR = '#EC88BE';
const PINK = '#EC4899';
const PINK_TEXT = '#2A0A1C';
const SELL_BG = '#3A1F33';
const SELL_TEXT = '#F9C8E0';
const DIVIDER = '#221C2C';

const FOLLOW_BG_FROM = 'rgba(236,72,153,0.16)';
const FOLLOW_BG_TO = 'rgba(168,85,247,0.12)';
const FOLLOW_BORDER = 'rgba(236,72,153,0.32)';
const FOLLOW_TITLE = '#FFFFFF';
const FOLLOW_SUB = '#C8A8C0';
const FOLLOW_ICON = '#EC4899';

const USER_ICON_PATH =
  'M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2';

export function AssetDetail({
  asset,
  owned,
  canBuy,
  onBack,
  onBuy,
  onSell,
}: AssetDetailProps) {
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: asset ? 1 : 0,
      duration: motion.duration.base,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: true,
    }).start();
  }, [asset, progress]);

  if (!asset) return null;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  });
  const resale = resaleValue(asset);

  return (
    <Animated.View style={[styles.root, { transform: [{ translateX }] }]}>
      <LinearGradient
        colors={asset.thumbGradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.hero}
      >
        <Pressable
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Market"
          hitSlop={8}
        >
          <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 6l-6 6l6 6"
              stroke="#FFFFFF"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.name}>{asset.name}</Text>
        <Text style={[styles.price, tabularNums]}>
          {formatCurrency(asset.price)}
        </Text>

        <View style={styles.followCard}>
          <LinearGradient
            colors={[FOLLOW_BG_FROM, FOLLOW_BG_TO]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d={USER_ICON_PATH}
              stroke={FOLLOW_ICON}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <View style={styles.followText}>
            <Text style={styles.followTitle}>
              +{asset.followersBoost.toLocaleString('en-US')} followers while owned
            </Text>
            <Text style={styles.followSub}>
              Sell this asset and the follower boost goes with it.
            </Text>
          </View>
        </View>

        <Text style={styles.desc}>{asset.description}</Text>

        {owned && (
          <Text style={styles.resaleHint}>
            Sells back for {formatCurrency(resale)} (
            {Math.round(
              (resale / asset.price) * 100,
            )}
            %).
          </Text>
        )}
      </ScrollView>

      <View style={styles.actionBar}>
        {owned ? (
          <Pressable
            style={styles.sellBtn}
            onPress={() => onSell(asset.id)}
            accessibilityRole="button"
            accessibilityLabel={`Sell ${asset.name} for ${formatCurrency(resale)}`}
          >
            <Text style={styles.sellText}>
              Sell for {formatCurrency(resale)}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.buyBtn, !canBuy && styles.buyBtnDisabled]}
            onPress={() => canBuy && onBuy(asset.id)}
            disabled={!canBuy}
            accessibilityRole="button"
            accessibilityLabel={
              canBuy
                ? `Buy ${asset.name} for ${formatCurrency(asset.price)}`
                : 'Not enough cash'
            }
          >
            <Text style={styles.buyText}>
              {canBuy
                ? `Buy for ${formatCurrency(asset.price)}`
                : 'Not enough cash'}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SCREEN_BG,
    flexDirection: 'column',
  },
  hero: {
    height: 280,
    paddingTop: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: TEXT_COLOR,
  },
  price: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: PRICE_COLOR,
    marginTop: 4,
  },
  followCard: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FOLLOW_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  followText: {
    flex: 1,
  },
  followTitle: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: FOLLOW_TITLE,
  },
  followSub: {
    fontSize: 12,
    color: FOLLOW_SUB,
    marginTop: 1,
  },
  desc: {
    fontSize: 14,
    lineHeight: 22,
    color: DESC_COLOR,
    marginTop: 16,
  },
  resaleHint: {
    fontSize: 12.5,
    color: DESC_COLOR,
    marginTop: 14,
    fontStyle: 'italic',
  },
  actionBar: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 30,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DIVIDER,
  },
  buyBtn: {
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 15,
    backgroundColor: PINK,
  },
  buyBtnDisabled: {
    backgroundColor: SELL_BG,
  },
  buyText: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: PINK_TEXT,
  },
  sellBtn: {
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 15,
    backgroundColor: SELL_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PINK,
  },
  sellText: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: SELL_TEXT,
  },
});
