/**
 * Sparkline.tsx — a tiny inline trend line.
 * ------------------------------------------------------------------
 * Draws a price series as a minimal SVG polyline, auto-scaled to the
 * given box. Presentational — used in the Exchange token rows.
 */
import Svg, { Polyline } from 'react-native-svg';

interface SparklineProps {
  /** The series to plot, oldest first. */
  data: number[];
  width: number;
  height: number;
  /** Line colour. */
  color: string;
}

export function Sparkline({ data, width, height, color }: SparklineProps) {
  if (data.length < 2) {
    return <Svg width={width} height={height} />;
  }

  let min = data[0];
  let max = data[0];
  for (const value of data) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const range = max - min || 1;
  const pad = 2;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = pad + (1 - (value - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
