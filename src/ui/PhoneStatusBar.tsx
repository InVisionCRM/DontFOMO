/**
 * PhoneStatusBar.tsx — the simulated phone status bar.
 * ------------------------------------------------------------------
 * The in-game phone's own status bar: the clock on the left, signal /
 * wifi / battery on the right. It fills the device's top safe-area
 * inset so it sits beside the real notch / Dynamic Island.
 *
 * Connected to the game store — it reads the live clock, so the time
 * ticks forward as real time passes (DON'T FOMO runs on a real-time
 * calendar, Design Bible §2).
 */
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useGameStore } from '../state/store';
import { formatStatusTime } from './format';
import { color, fontSize, fontWeight, tabularNums } from '../theme/theme';

export function PhoneStatusBar() {
  const insets = useSafeAreaInsets();
  const time = useGameStore((s) => formatStatusTime(s.clock.now));

  return (
    <View style={[styles.row, { height: Math.max(insets.top, 44) }]}>
      <Text style={[styles.time, tabularNums]}>{time}</Text>

      <View style={styles.right}>
        <View style={styles.signal}>
          {[4, 6, 8, 10].map((barHeight) => (
            <View key={barHeight} style={[styles.bar, { height: barHeight }]} />
          ))}
        </View>

        <Svg width={17} height={12} viewBox="0 0 24 18">
          <Path
            d="M3.5 7.5c5 -5 12 -5 17 0"
            stroke="#FFFFFF"
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M7 11c3 -3 7 -3 10 0"
            stroke="#FFFFFF"
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M10.5 14.5c1.4 -1.4 2.6 -1.4 4 0"
            stroke="#FFFFFF"
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>

        <View style={styles.battery}>
          <View style={styles.batteryFill} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  time: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  signal: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 10,
  },
  bar: {
    width: 3,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  battery: {
    width: 25,
    height: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 3,
    padding: 1.5,
    justifyContent: 'center',
  },
  batteryFill: {
    width: '70%',
    height: '100%',
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
});
