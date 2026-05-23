/**
 * Wallpaper.tsx — the home-screen background.
 * ------------------------------------------------------------------
 * The dark purple→pink gradient plus three soft colour blobs, drawn
 * with react-native-svg (React Native has no CSS gradients). All
 * values come from theme.wallpaper. Purely presentational.
 */
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { wallpaper } from '../theme/theme';

export function Wallpaper() {
  const { width, height } = useWindowDimensions();

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={width}
      height={height}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient
          id="wallpaperBase"
          x1={0}
          y1={0}
          x2={width * 0.27}
          y2={height}
          gradientUnits="userSpaceOnUse"
        >
          {wallpaper.gradient.stops.map((stop, i) => (
            <Stop
              key={stop}
              offset={wallpaper.gradient.locations[i]}
              stopColor={stop}
            />
          ))}
        </LinearGradient>

        {wallpaper.blobs.map((blob, i) => (
          <RadialGradient
            key={`def-${i}`}
            id={`wallpaperBlob${i}`}
            cx={width * blob.x}
            cy={height * blob.y}
            r={width * blob.r}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset={0} stopColor={blob.color} stopOpacity={blob.opacity} />
            <Stop offset={1} stopColor={blob.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>

      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="url(#wallpaperBase)"
      />
      {wallpaper.blobs.map((_, i) => (
        <Rect
          key={`rect-${i}`}
          x={0}
          y={0}
          width={width}
          height={height}
          fill={`url(#wallpaperBlob${i})`}
        />
      ))}
    </Svg>
  );
}
