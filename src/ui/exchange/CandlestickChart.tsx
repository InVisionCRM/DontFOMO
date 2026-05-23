/**
 * CandlestickChart.tsx — an OHLC candlestick chart.
 * ------------------------------------------------------------------
 * Draws candles with react-native-svg: a wick (high→low) and a body
 * (open→close) per candle — green when the close is up, red when down
 * — over faint grid lines. Presentational; auto-scales to the data.
 */
import Svg, { G, Line, Rect } from 'react-native-svg';
import type { Candle } from '../../engine/market';
import { color } from '../../theme/theme';

interface CandlestickChartProps {
  candles: Candle[];
  width: number;
  height: number;
}

export function CandlestickChart({
  candles,
  width,
  height,
}: CandlestickChartProps) {
  if (candles.length === 0) {
    return <Svg width={width} height={height} />;
  }

  const pad = 8;
  let high = candles[0].high;
  let low = candles[0].low;
  for (const candle of candles) {
    if (candle.high > high) high = candle.high;
    if (candle.low < low) low = candle.low;
  }
  const range = high - low || 1;
  const plotHeight = height - pad * 2;
  const y = (value: number): number =>
    pad + (1 - (value - low) / range) * plotHeight;

  const slot = width / candles.length;
  const bodyWidth = Math.max(2, slot * 0.62);

  return (
    <Svg width={width} height={height}>
      {[1, 2, 3].map((line) => {
        const gridY = pad + (line * plotHeight) / 4;
        return (
          <Line
            key={`grid-${line}`}
            x1={0}
            y1={gridY}
            x2={width}
            y2={gridY}
            stroke={color.border.hairline}
            strokeWidth={1}
          />
        );
      })}
      {candles.map((candle, i) => {
        const cx = i * slot + slot / 2;
        const up = candle.close >= candle.open;
        const stroke = up ? color.success : color.danger;
        const bodyTop = y(Math.max(candle.open, candle.close));
        const bodyHeight = Math.max(
          1.5,
          Math.abs(y(candle.open) - y(candle.close)),
        );
        return (
          <G key={`candle-${i}`}>
            <Line
              x1={cx}
              y1={y(candle.high)}
              x2={cx}
              y2={y(candle.low)}
              stroke={stroke}
              strokeWidth={1.4}
            />
            <Rect
              x={cx - bodyWidth / 2}
              y={bodyTop}
              width={bodyWidth}
              height={bodyHeight}
              rx={1}
              fill={stroke}
            />
          </G>
        );
      })}
    </Svg>
  );
}
