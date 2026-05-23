/**
 * PhoneStatusBar.tsx — the simulated phone status bar.
 * ------------------------------------------------------------------
 * The in-game phone's own status bar: the clock on the left, signal /
 * wifi / battery on the right. It fills the device's top safe-area
 * inset so it sits beside the real notch / Dynamic Island.
 *
 * Presentational. The clock is real time (CryptoLife runs on a
 * real-time calendar). For checkpoint 1 `now` is captured once at
 * launch; checkpoint 2's time engine makes it tick live.
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { color, fontSize, fontWeight, tabularNums } from '../theme/theme';

interface PhoneStatusBarProps {
  now: Date;
  /** Device top safe-area inset — the bar fills this to clear the notch. */
  topInset: number;
}

/** Format a Date as a 12-hour clock, e.g. "9:41". */
function formatClock(now: Date): string {
  const h = now.getHours();
  const m = now.getMinutes();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m < 10 ? `0${m}` : m}`;
}

export function PhoneStatusBar({ now, topInset }: PhoneStatusBarProps) {
  return (
    <View style={[styles.row, { height: Math.max(topInset, 44) }]}>
      <Text style={[styles.time, tabularNums]}>{formatClock(now)}</Text>

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
