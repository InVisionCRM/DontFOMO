# CHANGELOG — CryptoLife

Most recent first. Every entry: a UTC timestamp, a one-line summary, and
what changed / why / outcome. See CLAUDE.md §10 — updating this file
after any coding work is mandatory.

---

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
