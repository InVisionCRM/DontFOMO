/**
 * CashSwipeHUD.tsx — the top HUD: title, earned, swipes-left.
 * ------------------------------------------------------------------
 * Centred top overlay. Pure presentational.
 */
import { StyleSheet, Text, View } from 'react-native';
import { fontWeight, tabularNums } from '../../theme/theme';

interface CashSwipeHUDProps {
  earned: number;
  remaining: number;
  capped: boolean;
}

const TITLE_COLOR = '#7FD3A4';
const EARNED_COLOR = '#EAFBF0';
const LEFT_COLOR = '#8FE0B3';

/**
 * The HUD sits in a lifted "control panel" — a dark glass-ish slab
 * with a heavy drop shadow, so the flying bills behind it read as
 * actually behind. The panel inhabits a fixed band near the top of
 * the screen and is non-interactive.
 */
export function CashSwipeHUD({
  earned,
  remaining,
  capped,
}: CashSwipeHUDProps) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.panel}>
        {/* Top-edge highlight — sells the embossed/lifted look. */}
        <View style={styles.highlight} pointerEvents="none" />

        <Text style={styles.title}>Cash Swipe</Text>
        <Text style={[styles.earned, tabularNums]}>
          ${earned.toLocaleString('en-US')}
        </Text>
        {!capped && (
          <Text style={[styles.left, tabularNums]}>
            {remaining.toLocaleString('en-US')} swipes left today
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 108,
    left: 22,
    right: 22,
    alignItems: 'center',
  },
  panel: {
    width: '100%',
    paddingVertical: 22,
    paddingHorizontal: 28,
    borderRadius: 26,
    backgroundColor: 'rgba(7, 38, 26, 0.78)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(143, 224, 179, 0.35)',
    // Heavy drop shadow — sells the lifted feel; bills behind read as behind.
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 26,
    elevation: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  title: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: TITLE_COLOR,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  earned: {
    fontSize: 64,
    fontWeight: fontWeight.bold,
    color: EARNED_COLOR,
    letterSpacing: -2.4,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 18,
  },
  left: {
    fontSize: 14,
    color: LEFT_COLOR,
    marginTop: 6,
  },
});
