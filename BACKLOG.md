# DON'T FOMO — automation backlog

First unchecked item wins. The automation agent marks `[x]` when an item lands on `main`.

- [x] Stage 6 verified on main: four scams, Wallet, News, Rug Radar, Settings reset, tests green
- [ ] Save migration framework in `src/save/`: vN→vN+1 migrations, retire save wipes, test one migration path
- [ ] Save audit: defensive defaults in both `loadSaved` and `serializeGame`
- [ ] Tick loop + offline catch-up: fix double-fire or drift; add tests
- [ ] Bank UI polish: copy, loading states, a11y labels on withdrawal/hold
- [ ] Mail UI polish: sender styling, read/unread, timestamps
- [ ] Clout: bottom tab bar (RN; ref `DontFOMO-design/DontFOMO_X_App_Mockup.html`)
- [ ] Clout: notifications panel shell (read-only v1)
- [ ] Wallet: empty state, copy, tabular balance figures
- [ ] News: category chips + relative timestamps in `src/data/news.ts`
- [ ] Messages: thread list polish — avatars, preview, unread badges
- [ ] Settings: save version + last-saved hint
- [ ] Wire `expo-haptics` on one meaningful banner action (Bible §5)
- [ ] Banner audit: economic actions set banner in store reducers
- [ ] EAS Build skeleton: `eas.json`, app identifiers, build profiles
- [ ] Accessibility pass on Wallet or Settings
- [ ] Privacy disclosure stub in `DontFOMO-design/` (on-device only)
- [ ] Final QA checklist in `DontFOMO-design/`
