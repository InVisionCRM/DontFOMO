# CHANGELOG — CryptoLife

Most recent first. Every entry: a UTC timestamp, a one-line summary, and
what changed / why / outcome. See CLAUDE.md §10 — updating this file
after any coding work is mandatory.

---

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
