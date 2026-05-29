/**
 * CandlestickChart.tsx — an OHLC candlestick chart.
 * ------------------------------------------------------------------
 * Draws candles with react-native-svg: a wick (high→low) and a body
 * (open→close) per candle — green when the close is up, red when down
 * — over faint grid lines, with a right-edge price axis. Presentational;
 * auto-scales to the data.
 */
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import type { Candle } from '../../engine/market';
import { formatTokenPrice } from '../format';
import { color } from '../../theme/theme';

interface CandlestickChartProps {
  candles: Candle[];
  width: number;
  height: number;
}

/** Width reserved on the right for the price-axis labels. */
const PRICE_AXIS_WIDTH = 56;
/** Vertical positions of the 5 price labels, top → bottom (0..1). */
const LABEL_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];

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
  const plotWidth = Math.max(0, width - PRICE_AXIS_WIDTH);
  const y = (value: number): number =>
    pad + (1 - (value - low) / range) * plotHeight;

  const slot = candles.length > 0 ? plotWidth / candles.length : 0;
  const bodyWidth = Math.max(2, slot * 0.62);

  return (
    <Svg width={width} height={height}>
      {/* Grid lines — only the 3 middle ones; top + bottom are at the
          chart edges so a line there is just visual clutter. */}
      {[1, 2, 3].map((line) => {
        const gridY = pad + (line * plotHeight) / 4;
        return (
          <Line
            key={`grid-${line}`}
            x1={0}
            y1={gridY}
            x2={plotWidth}
            y2={gridY}
            stroke={color.border.hairline}
            strokeWidth={1}
          />
        );
      })}

      {/* Candles. */}
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

      {/* Price-axis labels — right edge. Top label = chart high, bottom
          = chart low; the 3 middle labels align with the grid lines.
          `dy` baseline-shift centers each text on its grid line. */}
      {LABEL_FRACTIONS.map((fraction, i) => {
        const labelY = pad + fraction * plotHeight;
        const labelPrice = high - fraction * range;
        // Nudge top label down a hair and bottom up a hair so they
        // don't get clipped by the SVG edge.
        const baselineShift =
          fraction === 0 ? 8 : fraction === 1 ? -2 : 3;
        return (
          <SvgText
            key={`price-${i}`}
            x={plotWidth + 6}
            y={labelY + baselineShift}
            fill={color.text.tertiary}
            fontSize={10}
            fontWeight="500"
          >
            {formatTokenPrice(labelPrice)}
          </SvgText>
        );
      })}
    </Svg>
  );
}
