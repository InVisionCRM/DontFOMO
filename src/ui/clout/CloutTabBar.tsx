/**
 * CloutTabBar.tsx — the bottom tab bar inside the Clout app.
 * ------------------------------------------------------------------
 * Visual port of the four-tab bar from `DontFOMO_X_App_Mockup.html`
 * (Home, Search, Notifications, Profile). Local UI state owned by
 * `CloutScreen`; this is a sub-section of one app, not top-level
 * navigation, so it stays out of the game store.
 *
 * Per-screen palette stays inline (Clout is dark / X-style, not the
 * shared theme.ts dark surfaces). Active tint matches the mockup.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

export type CloutTab = 'home' | 'search' | 'notifications' | 'profile';

interface CloutTabBarProps {
  activeTab: CloutTab;
  onSelect: (tab: CloutTab) => void;
}

const BAR_BG = 'rgba(0,0,0,0.92)';
const BAR_BORDER = '#16181C';
const ICON_INACTIVE = '#71767B';
const ICON_ACTIVE = '#E7E9EA';

const HOME_PATH = 'M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10';
const SEARCH_CIRCLE = { cx: 11, cy: 11, r: 7 };
const SEARCH_LINE = 'M20.5 20.5l-4.4-4.4';
const BELL_PATH = 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z';
const BELL_CLAPPER = 'M10 21a2 2 0 0 0 4 0';
const USER_HEAD = { cx: 12, cy: 8, r: 4 };
const USER_BODY = 'M4 21v-1a8 8 0 0 1 16 0v1';

interface IconProps {
  active: boolean;
}

function HomeIcon({ active }: IconProps) {
  const color = active ? ICON_ACTIVE : ICON_INACTIVE;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d={HOME_PATH}
        stroke={color}
        strokeWidth={active ? 2.6 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SearchIcon({ active }: IconProps) {
  const color = active ? ICON_ACTIVE : ICON_INACTIVE;
  const stroke = active ? 2.6 : 2;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={SEARCH_CIRCLE.cx}
        cy={SEARCH_CIRCLE.cy}
        r={SEARCH_CIRCLE.r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
      />
      <Path
        d={SEARCH_LINE}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function BellIcon({ active }: IconProps) {
  const color = active ? ICON_ACTIVE : ICON_INACTIVE;
  const stroke = active ? 2.6 : 2;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d={BELL_PATH}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={BELL_CLAPPER}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function UserIcon({ active }: IconProps) {
  const color = active ? ICON_ACTIVE : ICON_INACTIVE;
  const stroke = active ? 2.6 : 2;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={USER_HEAD.cx}
        cy={USER_HEAD.cy}
        r={USER_HEAD.r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
      />
      <Path
        d={USER_BODY}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  );
}

interface TabSpec {
  id: CloutTab;
  label: string;
  Icon: (props: IconProps) => React.ReactElement;
}

const TABS: readonly TabSpec[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'search', label: 'Search', Icon: SearchIcon },
  { id: 'notifications', label: 'Notifications', Icon: BellIcon },
  { id: 'profile', label: 'Profile', Icon: UserIcon },
];

export function CloutTabBar({ activeTab, onSelect }: CloutTabBarProps) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {TABS.map(({ id, label, Icon }) => {
        const active = id === activeTab;
        return (
          <Pressable
            key={id}
            onPress={() => onSelect(id)}
            style={({ pressed }) => [
              styles.tab,
              pressed && styles.tabPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            hitSlop={8}
          >
            <Icon active={active} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 78,
    paddingBottom: 22,
    backgroundColor: BAR_BG,
    borderTopWidth: 1,
    borderTopColor: BAR_BORDER,
    flexDirection: 'row',
    zIndex: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  tabPressed: {
    opacity: 0.6,
  },
});
