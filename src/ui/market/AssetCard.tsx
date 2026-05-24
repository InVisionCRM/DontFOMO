/**
 * AssetCard.tsx — one item in the Market grid.
 * ------------------------------------------------------------------
 * Gradient hero, OWNED badge if applicable, name + price + follower
 * boost line. Pure presentational.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { AssetDefinition } from '../../engine/assets';
import { formatCurrency } from '../format';
import { fontWeight, tabularNums } from '../../theme/theme';

interface AssetCardProps {
  asset: AssetDefinition;
  owned: boolean;
  onPress: (id: string) => void;
}

const CARD_BG = '#1C1825';
const CARD_BORDER = '#2C2638';
const NAME_COLOR = '#F1EEF5';
const META_COLOR = '#9B93A8';
const PRICE_COLOR = '#EC88BE';
const OWNED_BG = 'rgba(0,0,0,0.5)';

export function AssetCard({ asset, owned, onPress }: AssetCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(asset.id)}
      accessibilityRole="button"
      accessibilityLabel={`${asset.name}, ${formatCurrency(asset.price)}${owned ? ', owned' : ''}`}
    >
      <LinearGradient
        colors={asset.thumbGradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.thumb}
      >
        {owned && (
          <View style={styles.ownedTag}>
            <Text style={styles.ownedText}>OWNED</Text>
          </View>
        )}
      </LinearGradient>
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {asset.name}
        </Text>
        <Text style={[styles.price, tabularNums]}>
          {formatCurrency(asset.price)}
        </Text>
        <Text style={styles.followers}>
          +{asset.followersBoost.toLocaleString('en-US')} followers
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CARD_BORDER,
    borderRadius: 18,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.85,
  },
  thumb: {
    height: 108,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    padding: 9,
  },
  ownedTag: {
    backgroundColor: OWNED_BG,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ownedText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  meta: {
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  name: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: NAME_COLOR,
  },
  price: {
    fontSize: 13.5,
    fontWeight: fontWeight.bold,
    color: PRICE_COLOR,
    marginTop: 4,
  },
  followers: {
    fontSize: 11,
    color: META_COLOR,
    marginTop: 3,
  },
});
