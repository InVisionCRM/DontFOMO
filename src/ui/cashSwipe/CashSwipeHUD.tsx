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

export function CashSwipeHUD({
  earned,
  remaining,
  capped,
}: CashSwipeHUDProps) {
  return (
    <View style={styles.hud} pointerEvents="none">
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
  );
}

const styles = StyleSheet.create({
  hud: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    color: TITLE_COLOR,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  earned: {
    fontSize: 52,
    fontWeight: fontWeight.bold,
    color: EARNED_COLOR,
    letterSpacing: -2,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 16,
  },
  left: {
    fontSize: 13,
    color: LEFT_COLOR,
    marginTop: 4,
  },
});
