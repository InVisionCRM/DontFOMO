# CHANGELOG — CryptoLife

Most recent first. Every entry: a UTC timestamp, a one-line summary, and
what changed / why / outcome. See CLAUDE.md §10 — updating this file
after any coding work is mandatory.

---

## 2026-05-23 12:44 UTC — Token logos switched to emojis
- Token logos are now bare emojis (no circle, no background), matching
  the original index.html prototype's identity and the satirical tone.
  💵 Dollar X · 🐷 MoonPig · 🐸 Pepe 2.0 · 🧠 NeuraNet · ⚡ VoltChain ·
  🌾 YieldX · 💪 GigaChad.
- Added an `emoji` field to the token catalogue; each token's
  `gradient` is kept as an accent colour (the Sponsored ad edge, etc.),
  no longer a logo background.
- New reusable `TokenBadge` component (renders the emoji at a given
  size); `TokenRow`, `HoldingRow`, `TokenDetail` and `ExchangeAd` now
  use it. The gradient-circle-with-initials badge is retired.
- Note: emojis render in each platform's own art style (Apple vs
  Google) — acceptable for a satirical game; Twemoji is the option if
  pixel-identical logos are ever needed.
- No new dependencies.
- Verification: token data type-checks clean under strict mode; the 46
  unit tests are unaffected (no engine/store change).
- Outcome: the Exchange's tokens have real character. Checkpoint 4's
  launch flow will use an emoji picker.

## 2026-05-23 11:14 UTC — Stage 3, checkpoint 3b: the trading UI
- Built the buy / sell trade sheet (`TradeSheet`) — slides up from the
  Sell / Buy bar on a token's detail: quick-amount buttons, a live
  "you receive" quote with the 0.3% exchange fee, and an in-sheet
  confirmation.
- Built the Portfolio tab — real holdings (`HoldingRow`) with live
  values; the balance card's crypto total is now real (`holdingsValue`).
- `TokenDetail`'s Buy / Sell buttons open the sheet; Sell is disabled
  for a token you do not own.
- Added the `formatTokenAmount` display formatter.
- No new dependencies.
- Verification: `format.ts` type-checks clean under strict mode; the
  46 engine / store unit tests are unaffected (3b is UI only). The
  trading flow is verified on device.
- Outcome: trading works end to end — your $500 buys tokens, the
  Portfolio tracks them, selling returns cash. Stage 3 checkpoints 1-3
  are complete; checkpoint 4 (player token launches) remains.

## 2026-05-23 11:10 UTC — Stage 3, checkpoint 3a: the trade engine
- New economy engine (`src/engine/economy/`) — `quoteBuy`, `quoteSell`
  (the 0.3% fee math) and `holdingsValue`. Pure TypeScript, 7 unit
  tests.
- Store: added `holdings` (ticker → amount owned) and the `buyToken` /
  `sellToken` actions — `buyToken` spends cash for tokens, `sellToken`
  returns cash and clears a fully-sold position. Holdings are saved
  and loaded; both actions are guarded against overspending.
- Save format bumped to v3 (the save now includes holdings); older
  saves reset to a fresh game on first launch.
- No new dependencies.
- Verification: pure-TS files type-check clean under strict mode; all
  46 unit tests pass (10 clock + 20 market + 9 store + 7 trade).
- Outcome: the money engine is live and tested. Next (checkpoint 3b):
  the buy/sell sheet and portfolio UI that drive it.

## 2026-05-23 08:27 UTC — Exchange satire: token descriptions + Sponsored ad
- Added a satirical `description` to every token in the catalogue —
  each parodies a real crypto archetype and quietly teaches healthy
  skepticism (the unaudited PDF, the same anon dev, "where does the
  yield come from"). The token detail screen now shows it.
- New `src/data/exchangeAds.ts` — six parody crypto-ad creatives, plus
  the constant fine print.
- New `ExchangeAd` component — a "Sponsored" banner at the top of the
  Markets list that rotates through the ad creatives (~every 7s, wall-
  clock-derived, no component timer) and opens the shilled token's
  detail when tapped. Groundwork for the see-hype → tap reflex the
  scam engine will use later.
- No new dependencies.
- Verification: the new data files type-check clean under strict mode;
  the 36 existing unit tests are unaffected. UI verified on device.
- Outcome: the Exchange now has character — funny token write-ups and
  a rotating fake ad.

## 2026-05-23 07:46 UTC — Stage 3, checkpoint 2: token detail + chart
- Added `toCandles` to the market engine — aggregates a price history
  into OHLC candles for the chart (5 new unit tests).
- Added `marketCap` / `volume24h` / `liquidity` flavour stats to the
  token catalogue.
- Built the token detail screen (`src/ui/exchange/`): `TokenDetail`
  (slides in from the right on a token tap — the live price, the
  candlestick chart, timeframe tabs, the stat grid, an about line, and
  the Buy / Sell bar) and `CandlestickChart` (react-native-svg OHLC
  candles over grid lines).
- `ExchangeScreen` now opens the detail when a token row is tapped;
  Back slides it away.
- The Buy / Sell bar is inert — trading is checkpoint 3.
- No new dependencies.
- Verification: pure-TS files type-check clean under strict mode; all
  36 unit tests pass (10 clock + 20 market + 6 store).
- Outcome: tap any token for its live candlestick chart and stats.
  Next (checkpoint 3): trading — buy/sell, the on/off-ramp, the
  portfolio.

## 2026-05-23 07:37 UTC — Stage 3, checkpoint 1b: the Exchange screen
- Wired the market into the game: the store now holds the `MarketState`,
  ticks it (`tickMarket`), fast-forwards it on the offline catch-up,
  and saves / loads it. `useGameLoop` runs a fast market tick (every
  3s) alongside the 20s calendar tick.
- Save format bumped to v2 (the save now includes the market). Older
  v1 saves are discarded gracefully to a fresh game on first launch.
- Built the Exchange app screen (`src/ui/exchange/`): `ExchangeScreen`
  (balance card, Markets / Portfolio segment, filter chips, the live
  token list), `BalanceCard`, `TokenRow`, plus a reusable `Sparkline`.
  Built to the approved Exchange mockup, themed with the design tokens.
- Added an app-screen registry (`appScreens.ts`); `AppView` now renders
  a real screen when one exists, the placeholder otherwise — so tapping
  the Exchange icon opens the real app.
- Added `formatTokenPrice` / `formatSignedPercent` display formatters.
- No new dependencies.
- Verification: pure-TS files type-check clean under strict mode; all
  31 unit tests pass (10 clock + 15 market + 6 store). The Exchange UI
  is verified on device.
- Outcome: the Exchange opens to a live market — seven tokens with
  prices moving every few seconds. Next (checkpoint 2): the token
  detail screen and candlestick chart.

## 2026-05-23 07:27 UTC — Stage 3, checkpoint 1a: the market engine
- Built the market simulation engine (`src/engine/market/`) — pure
  TypeScript, no React imports.
  - `random.ts` — a seeded PRNG (mulberry32) plus a Box-Muller
    gaussian, so the market is deterministic and unit-testable.
  - `market.ts` — the geometric random-walk price simulation ported
    from the original `index.html`: `createMarket`, `tickMarket`,
    `advanceMarket` (the offline catch-up), and `dayChangePercent`.
    The stablecoin wobbles in a tight band around $1; the market ticks
    independently of the calendar clock so charts stay alive.
- Added `src/data/tokens.ts` — the seven-token catalogue (USDX, MOONP,
  PEPE2, NEURA, VOLT, YIELDX, GIGA), each with its category, badge
  gradient, and per-token drift / volatility.
- Added `__tests__/market.test.ts` — 15 unit tests: PRNG determinism,
  the gaussian, price positivity over many ticks, history caps, the
  stablecoin peg, the offline advance, and the change math.
- Decision recorded: the token economy stays fully fictional and
  game-simulated for now (real-token integration deferred — KG).
- No new dependencies.
- Verification: pure-TS files type-check clean under strict mode; all
  25 engine tests pass (10 clock + 15 market) in a ts-jest harness.
- Outcome: the market engine is live and tested. Next (checkpoint 1b):
  the Exchange app screen that renders it.

## 2026-05-23 06:38 UTC — Stage 2, checkpoint 3b: apps open & close
- Apps now open and close. Tapping an icon opens it with an iOS-style
  zoom that grows from the icon's exact on-screen position; tapping the
  home bar zooms it back out.
- New `AppView` component (`src/ui/`) — the full-screen opened-app
  overlay. Reads `openAppId` from the store, renders a per-app
  placeholder screen, and runs the zoom in / out animation.
- The zoom uses React Native's built-in `Animated` (native-driver
  scale + fade). CLAUDE.md §4 lists Reanimated for app-open
  transitions; `Animated` was chosen here for zero setup risk on a
  simple triggered animation — Reanimated remains the stack choice for
  the later gesture-driven work (e.g. the swipe minigame).
- `AppIcon` now measures its on-screen rect on tap (`measureInWindow`)
  and reports it, so the zoom starts from the real icon position.
  Added the `APP_BY_ID` lookup to the app catalogue.
- `PhoneShell` wires icon taps to `openApp` plus the zoom origin, and
  renders the `AppView` overlay above the home screen.
- No new dependencies — `Animated` is part of React Native core.
- Verification: pure-TS files type-check clean under strict mode; the
  15 engine / store unit tests still pass. The animation is verified
  on device.
- Outcome: **Stage 2 complete** — a playable empty phone. Time flows,
  the game persists across a quit, and apps open and close.

## 2026-05-23 06:12 UTC — Stage 2, checkpoint 3a: save / load
- Built `AsyncStorageSaveAdapter` (`src/save/`) — the v1 `SaveAdapter`
  implementation, persisting the game with AsyncStorage (Expo Go
  compatible). Versioned save envelopes; corrupt data recovers
  gracefully to a fresh game; a genuine I/O failure still throws.
- Added the save-layer barrel `src/save/index.ts` exporting the shared
  `saveAdapter` instance.
- Store: added the `SavedGame` type, the `loadSaved` action (applies a
  save, then runs the offline catch-up), and the `serializeGame`
  helper.
- `useGameLoop` now also handles persistence: loads any save on launch,
  autosaves every 30 seconds, and saves when the app is backgrounded.
  The offline catch-up runs on every refocus.
- Added `__tests__/store.test.ts` — 5 unit tests for the store actions
  and `serializeGame`.
- New dependency: `@react-native-async-storage/async-storage`.
- Verification: all 15 unit tests pass (10 clock + 5 store) in an
  isolated ts-jest harness; pure engine files type-check clean under
  strict mode.
- Outcome: the game now persists — it survives a quit and reload.
  Checkpoint 3b (apps open / close with the iOS zoom) is next.

## 2026-05-23 04:24 UTC — Stage 2, checkpoint 2: live clock + game store
- Built the time engine `src/engine/time/clock.ts` — pure functions for
  the real-time game clock: `createClock`, `dayNumber`, `tickClock`,
  and `resumeClock` (the offline catch-up that later fast-forwards the
  world). No React / React Native imports.
- Built the central game store `src/state/store.ts` (Zustand) — holds
  the clock, cash, followers, handle, and which app is open. Actions:
  `newGame`, `tick`, `resume`, `openApp`, `closeApp`.
- Built `src/state/useGameLoop.ts` — drives the store from real time: a
  20-second foreground tick plus an `AppState` listener that runs the
  offline catch-up when the app refocuses. Mounted once in `App.tsx`.
- Added `src/ui/format.ts` — display formatters (time, date, currency).
- Connected the UI to the store: `PhoneStatusBar` shows the live
  ticking clock; `HomeWidgets` read cash / followers / handle / date /
  day from the store. `PhoneShell` is now purely structural.
- Testing: added `jest.config.js` (ts-jest preset) and
  `__tests__/clock.test.ts` — 10 unit tests covering `createClock`,
  `dayNumber`, `tickClock` and `resumeClock`, including immutability
  and a backwards-device-clock clamp.
- New dependency: `zustand` (runtime). New test dependencies: `jest`,
  `ts-jest`.
- Verification: pure-TS engine files type-check clean under strict
  mode; all 10 clock tests pass (run in an isolated ts-jest harness).
  The store / UI wiring is verified on device after `zustand` installs.
- Outcome: checkpoint 2 code complete — the clock ticks live and the
  widgets show real game state once `zustand` is installed.

## 2026-05-23 04:09 UTC — Stage 2, checkpoint 1: the static phone shell
- Built the in-game phone home screen as React Native, matching the
  approved HomeScreen mockup and the interactive preview KG signed off.
- New data file `src/data/apps.ts` — the 12-app catalogue (id, name,
  SVG icon glyph, icon gradient, dock flag) as data (CLAUDE.md §5).
- New theme token `theme.wallpaper` — wallpaper gradient + colour
  blobs, so no colours are hardcoded in components.
- New `src/ui/` components: `Wallpaper`, `GlassSurface` (frosted glass
  via expo-blur), `AppIcon`, `PhoneStatusBar`, `HomeWidgets`, `Dock`,
  `HomeScreen`, `PhoneShell`. `App.tsx` now mounts the shell with the
  OS status bar hidden, so the simulated status bar is the only one.
- New runtime dependencies (installed with `npx expo install`):
  `expo-linear-gradient`, `react-native-svg`, `expo-blur`,
  `react-native-safe-area-context` — all run inside Expo Go on SDK 54.
- The status-bar clock and the widget values are placeholders captured
  at launch; checkpoint 2 (time engine + Zustand store) makes the clock
  tick and feeds real game state.
- Verification: pure-TS files (theme, app catalogue, save interface)
  type-check clean under strict mode. The `.tsx` components are
  verified on device after the four packages install and a reload.
- Outcome: checkpoint 1 code complete — the home screen renders with
  wallpaper, widgets, app grid and dock once the packages are added.

## 2026-05-23 03:44 UTC — Pinned to Expo SDK 54 (Expo Go compatibility)
- The scaffold installed SDK 56 (the current stable, ~2 weeks old).
  SDK 56 would not open in Expo Go on device. A first downgrade to
  SDK 55 failed the same way — the public Expo Go on the App Store
  currently ships SDK 54, so both 56 and 55 were too new for it.
- Confirmed with KG that their (latest) Expo Go supports SDK 54, then
  pinned `package.json` to the official SDK 54 blank-typescript
  template versions: `expo ~54.0.33`, `react 19.1.0`,
  `react-native 0.81.5`, `expo-status-bar ~3.0.9`, `typescript ~5.9.2`,
  `@types/react ~19.1.0`. Versions sourced from
  `expo-template-blank-typescript@sdk-54` — not guessed.
- Updated the SDK references in `cryptolife/CLAUDE.md` and `AGENTS.md`
  to `v54.0.0`.
- Verification: pure-TS files type-check clean under strict mode.
  On-device Expo Go boot to be confirmed by KG after a clean reinstall.
- Note: the project must still move to a development build later —
  `react-native-mmkv` (planned storage) is a native module that cannot
  run in Expo Go on any SDK. SDK 54 + Expo Go covers the early,
  pure-JavaScript stages; the dev build is a planned later stage.
- Outcome: project pinned to SDK 54, the SDK the current public Expo
  Go supports.

## 2026-05-23 03:12 UTC — Expo / React Native project scaffolded (Stage 1)
- Created the Expo project in `cryptolife/` via `create-expo-app` with the
  `blank-typescript` template: Expo SDK 56, React Native 0.85, React 19,
  TypeScript in strict mode.
- Built the architecture skeleton from CLAUDE.md §6:
  `src/engine/` (with `time/ market/ economy/ scam-director/ social/`
  subfolders), `src/state/`, `src/save/`, `src/data/`, `src/ui/`,
  `src/theme/`, plus `__tests__/` and `docs/`.
- Added `src/theme/theme.ts` — the full design-token file (colours,
  per-app accents, spacing, radii, typography, glass, elevation, motion)
  from CLAUDE.md §8. Single source of truth for all visual values.
- Added `src/save/SaveAdapter.ts` — the versioned persistence interface
  (`load` / `save` / `clear`) plus the save-envelope and migration types.
  Lets a `CloudSaveAdapter` drop in later without touching game code.
- Added placeholder `index.ts` files in `engine/`, `state/`, `data/`,
  `ui/` documenting each layer's rules. They keep the folders in git and
  state the architecture contract.
- Reshaped `App.tsx` into a minimal dark boot screen that renders the
  CryptoLife wordmark using the theme tokens. Set `userInterfaceStyle`
  to `dark` and the display name to `CryptoLife` in `app.json`.
- Added this `CHANGELOG.md` and a plain-language `README.md`.
- Verification: `tsc --noEmit` run on the pure-TS files (theme,
  SaveAdapter, index files) — compiles clean under strict mode, no `any`.
- Outcome: scaffold complete and type-safe. `npm install` then
  `npx expo start` will boot the app to the dark boot screen.
  Next: Stage 2 — the phone shell and game clock.
