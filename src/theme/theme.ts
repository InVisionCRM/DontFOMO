/**
 * theme.ts — CryptoLife design tokens
 * ------------------------------------------------------------------
 * The single source of truth for every colour, size, font, radius and
 * motion value in the app. Components MUST read from here and never
 * hardcode visual values. Derived from CLAUDE.md §8 (the approved
 * mockups). If a value needs to change, change it here once.
 *
 * Pure data — no React, no React Native imports. Safe to use anywhere.
 */

/** Foundation colours — the app is dark by default. */
export const color = {
  bg: {
    /** App background. */
    base: '#0C0D12',
    /** Cards, panels. */
    surface: '#16171F',
    /** Inputs, raised surfaces. */
    elevated: '#1E2029',
  },
  border: {
    /** Default 0.5px borders. */
    hairline: 'rgba(255,255,255,0.10)',
    /** Hover / emphasis. */
    strong: 'rgba(255,255,255,0.16)',
  },
  text: {
    /** Primary text. */
    primary: '#F2F3F7',
    /** Secondary text. */
    secondary: '#9A9DAB',
    /** Hints, disabled. */
    tertiary: '#5E616E',
  },

  /** Semantic colours — meaning, not decoration. */
  success: '#16C784', // gains, price up, safe outcomes
  danger: '#EA3943', // losses, price down, scams
  warning: '#F7A83A', // caution, risk flags
  info: '#3B82F6', // neutral informational

  /** Brand. */
  brand: '#7C5CFF', // CryptoLife's signature violet
  brandGradient: ['#7C5CFF', '#D4537E'] as const, // hero / wallpaper gradient
} as const;

/**
 * Per-app accent identities. Each in-game app keeps its own accent so
 * the apps feel like distinct, real products.
 */
export const appAccent = {
  clout: '#1D9BF0',
  coinDeck: '#3B82F6',
  metaPocket: '#F7A83A',
  tunnel: '#2AABEE',
  theWire: '#EF4444',
  mail: '#2F8FFF',
  flex: '#EC4899',
  fiatAndCo: '#2DD4BF',
  cashSwipe: '#22C55E',
  clipboard: '#94A3B8',
  settings: '#8E8E93',
  messages: '#30D158',
} as const;

export type AppAccentKey = keyof typeof appAccent;

/** Spacing — strict 4-point grid. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

/** Corner radii. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
} as const;

/**
 * Typography. Family is the platform system font (SF Pro on iOS,
 * Roboto on Android) — React Native uses it automatically when no
 * `fontFamily` is set, so we leave family undefined on purpose.
 *
 * All prices, balances and stats must additionally set
 * `fontVariant: ['tabular-nums']` so digits don't jitter as values
 * change. See `tabularNums` below.
 */
export const fontSize = {
  display: 32,
  title: 22,
  heading: 17,
  body: 15,
  label: 13,
  caption: 11,
} as const;

export const fontWeight = {
  regular: '400',
  semibold: '600',
  bold: '700',
} as const;

/** Apply to any Text showing numeric values (prices, balances, stats). */
export const tabularNums = { fontVariant: ['tabular-nums' as const] };

/**
 * Glass — widgets, dock, banners. React Native cannot do CSS
 * `backdrop-filter`; a real blur needs `expo-blur` (added in a later
 * stage). These tokens record the design intent and give a usable
 * solid-fill fallback until the blur layer is wired.
 */
export const glass = {
  blur: 20, // px — for expo-blur `intensity` when added
  saturate: 1.6, // 160%
  fill: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.14)',
} as const;

/** Elevation — drop shadows. */
export const elevation = {
  e1: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4, // Android
  },
  e2: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10, // Android
  },
} as const;

/** Motion — iOS-like easing and durations. */
export const motion = {
  /** cubic-bezier(0.32, 0.72, 0, 1) */
  easing: [0.32, 0.72, 0, 1] as const,
  duration: {
    fast: 180,
    base: 320,
    slow: 420,
  },
} as const;

/**
 * Home-screen wallpaper — the dark purple→pink gradient plus three
 * soft colour blobs, taken from the approved HomeScreen mockup. Blob
 * `x`/`y`/`r` are fractions of the screen width (r) and width/height
 * (x/y), so the wallpaper scales to any device.
 */
export const wallpaper = {
  gradient: {
    stops: ['#2B1D52', '#5A2D7E', '#93336F', '#C5526A'],
    locations: [0, 0.46, 0.76, 1],
  },
  blobs: [
    { color: '#FFC496', opacity: 0.55, x: 0.22, y: 0.16, r: 0.62 },
    { color: '#637AFF', opacity: 0.55, x: 0.84, y: 0.88, r: 0.7 },
    { color: '#FF78CD', opacity: 0.42, x: 0.8, y: 0.12, r: 0.55 },
  ],
} as const;

/** The whole theme, bundled. Import `theme` for convenient access. */
export const theme = {
  color,
  appAccent,
  spacing,
  radius,
  fontSize,
  fontWeight,
  tabularNums,
  glass,
  elevation,
  motion,
  wallpaper,
} as const;

export type Theme = typeof theme;

export default theme;
