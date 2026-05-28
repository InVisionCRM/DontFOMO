# DON'T FOMO — automation backlog

First unchecked item wins. The automation agent marks `[x]` when an item lands on `main`.

- [x] Stage 6 verified on main: four scams, Wallet, News, Rug Radar, Settings reset, tests green
- [x] Save migration framework in `src/save/`: vN→vN+1 migrations, retire save wipes, test one migration path
- [x] Save audit: defensive defaults in both `loadSaved` and `serializeGame`
- [x] Tick loop + offline catch-up: fix double-fire or drift; add tests
- [x] Bank UI polish: copy, loading states, a11y labels on withdrawal/hold
- [x] Mail UI polish: sender styling, read/unread, timestamps
- [x] Clout: bottom tab bar (RN; ref `DontFOMO-design/DontFOMO_X_App_Mockup.html`)
- [x] Clout: notifications panel shell (read-only v1)
- [x] Wallet: empty state, copy, tabular balance figures
- [x] News: category chips + relative timestamps in `src/data/news.ts`
- [x] Messages: thread list polish — avatars, preview, unread badges
- [x] Settings: save version + last-saved hint
- [x] Wire `expo-haptics` on one meaningful banner action (Bible §5)
- [x] Banner audit: economic actions set banner in store reducers
- [x] EAS Build skeleton: `eas.json`, app identifiers, build profiles
- [ ] Accessibility pass on Wallet or Settings
- [ ] Privacy disclosure stub in `DontFOMO-design/` (on-device only)
- [ ] Final QA checklist in `DontFOMO-design/`
