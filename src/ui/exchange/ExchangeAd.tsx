/**
 * ExchangeAd.tsx — the Exchange "Sponsored" ad banner.
 * ------------------------------------------------------------------
 * A rotating parody crypto ad shilling a listed token. Tapping it
 * opens that token's detail — the see-hype → tap reflex the scam
 * engine will later lean on.
 *
 * The creative rotates roughly every 7 seconds, derived from the wall
 * clock — no component timer needed, since the Exchange already
 * re-renders frequently as the market ticks.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AD_FINE_PRINT, EXCHANGE_ADS } from '../../data/exchangeAds';
import { TOKEN_BY_ID } from '../../data/tokens';
import { color, fontSize, fontWeight, radius, spacing } from '../../theme/theme';

/** How long each ad creative shows before the next. */
const AD_ROTATE_MS = 7000;

interface ExchangeAdProps {
  onPress: (tokenId: string) => void;
}

export function ExchangeAd({ onPress }: ExchangeAdProps) {
  const index = Math.floor(Date.now() / AD_ROTATE_MS) % EXCHANGE_ADS.length;
  const ad = EXCHANGE_ADS[index];
  const token = TOKEN_BY_ID[ad.tokenId];

  return (
    <Pressable
      style={[styles.card, { borderColor: token.gradient[0] }]}
      onPress={() => onPress(ad.tokenId)}
      accessibilityRole="button"
      accessibilityLabel={`Sponsored ad for ${token.name}`}
    >
      <LinearGradient
        colors={token.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.badge}
      >
        <Text style={styles.badgeText}>{token.id.slice(0, 2)}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.tag}>SPONSORED</Text>
        <Text style={styles.headline}>{ad.headline}</Text>
        <Text style={styles.fine}>{AD_FINE_PRINT}</Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  tag: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: color.text.tertiary,
    letterSpacing: 0.8,
  },
  headline: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
    marginTop: 2,
  },
  fine: {
    fontSize: fontSize.caption,
    color: color.text.tertiary,
    marginTop: 3,
  },
  chevron: {
    fontSize: fontSize.title,
    color: color.text.tertiary,
  },
});
