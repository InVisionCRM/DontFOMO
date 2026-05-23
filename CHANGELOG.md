# CHANGELOG — CryptoLife

Most recent first. Every entry: a UTC timestamp, a one-line summary, and
what changed / why / outcome. See CLAUDE.md §10 — updating this file
after any coding work is mandatory.

---

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
