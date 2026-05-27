# CHANGELOG — DON'T FOMO

Most recent first. Every entry: a UTC timestamp, a one-line summary, and
what changed / why / outcome. See CLAUDE.md §10 — updating this file
after any coding work is mandatory.

---

## 2026-05-27 — Tick loop hardening: fix offline-catch-up double-fire

Two real bugs in the foreground tick + AppState handling, both producing the same symptom — the market jumping further on resume than the actual offline gap warrants.

- **`src/engine/time/clock.ts` — `tickClock` now advances `lastSeenAt` alongside `now`.** Before, `lastSeenAt` only moved on `resumeClock`. After a long foreground session, the next `resume(now)` computed `elapsedMs = now - lastSeenAt` and replayed every foreground tick that had already executed during the session as if it were an offline gap, double-advancing the market. The fix treats a foreground tick as proof the engine is synced with reality and moves the offline anchor with it. `now` is clamped against `lastSeenAt` so a backwards device clock cannot push the anchor into the past.
- **`src/state/useGameLoop.ts` — AppState handler now only catches up on `background → active`.** Previously it called `resume(Date.now())` on *every* state change, including the `active → background` edge. That replayed the entire foreground session as catch-up at the moment of backgrounding, with no real offline time elapsed. The handler now `resume()`s only when `next === 'active'` and `save()`s on every other transition. Combined with the `tickClock` fix above, an in-session background→active round-trip is now a no-op for the market.
- **`__tests__/clock.test.ts`:** updated the two `tickClock` cases that asserted the buggy "leaves anchors untouched" behaviour, and added three regression cases: backwards-clock clamp, `tickClock → resumeClock(same now)` reports ~0 elapsed, and `tickClock(1h) → resumeClock(7h)` reports exactly 6h.
- **Verification:** `npx tsc --noEmit` clean. **441 tests across 26 suites — all green** (up from 438/26).
- **Complexity:** 25/100 — three small, surgical edits in a pure module and one wiring file; one test file updated. Engine remains React-free.
- **Outcome:** the BACKLOG.md item *"Tick loop + offline catch-up: fix double-fire or drift; add tests"* is done. Resume catches up exactly the genuine offline gap; foreground ticks no longer get replayed.

---

## 2026-05-26 — Save audit + corrupt-blob rejection

- **New — `src/save/validate.ts`:** `validateSaveData(data)` checks the migrated blob's identity fields and throws `CorruptSaveError(reason)` on the first structural problem (clock / cash / followers / handle / market.tokens / bank / cashSwipe). Optional fields and lists are not checked — those have defensive `??` defaults in `store.loadSaved` already.
- **`src/save/index.ts`:** re-exports `CorruptSaveError` and `validateSaveData`.
- **`src/state/useGameLoop.ts`:** load path is now `adapter.load → migrateSave → validateSaveData → store.loadSaved`. A corrupt blob (e.g. truncated AsyncStorage write, external edit) is caught and logged with the field-level reason instead of silently restarting the player at $1000 / `@newhandle` with the corrupt state's partial fields layered on top.
- **`store.serializeGame` left as-is** after audit: every defaultable field already had a `??`, and the `state.bank` spread is intentionally fail-loud (a TypeError on undefined bank surfaces in the save-failed warning while the on-disk save survives — defending it would silently overwrite a good save with a fresh-bank one).
- **New — `__tests__/saveAudit.test.ts` (14 cases):** happy path, one rejection per core field with a descriptive `reason`, NaN / wrong-type rejections, and the round-trip invariant — `serializeGame(useGameStore.getState())` always validates clean.
- **Verification:** `npx tsc --noEmit` clean. **438 tests across 26 suites — all green** (up from 424/25).
- **Outcome:** the BACKLOG.md item *"Save audit: defensive defaults in both `loadSaved` and `serializeGame`"* is done. The save subsystem now has three layered defences: migrations (cross-version), validation (corrupt blob), and defensive backfills in `loadSaved` (partial in-memory state, e.g. hot-reload poisoning).

---

## 2026-05-26 — Save migration framework

- **New — `src/save/migrations.ts`:** forward-only migration chain. `MIGRATIONS` registry (v15→16, v16→17, v17→18, v18→19) + `migrateSave(envelope, target)` runner. Each migration is a pure transform `(data, ctx) => data'` where `ctx.savedAt` is the envelope's write timestamp (used by v15→16 for the pacing-state anchor). Three typed errors: `TooOldSaveError`, `FutureSaveError`, `MissingMigrationError`.
- **`src/save/SaveAdapter.ts`:** added `MIN_SUPPORTED_VERSION = 15` constant and the `MigrationContext` type. Extended `SaveMigration.migrate` from `(data) => unknown` to `(data, ctx) => unknown` — no existing callers; signature change is safe.
- **`src/save/index.ts`:** re-exports `MIN_SUPPORTED_VERSION`, `MIGRATIONS`, `migrateSave`, the three error classes, and `MigrationContext`.
- **`src/state/useGameLoop.ts`:** **fixed the silent save-wipe bug.** The previous loader used `envelope.version === SAVE_VERSION` and routed every mismatch to `resume()`, which then autosaved a fresh game over the old one within milliseconds. Replaced with `migrateSave` + typed-error catch. Behavior now:
  - exact match → load directly (today's log message preserved)
  - in `[MIN_SUPPORTED_VERSION, SAVE_VERSION)` → migrate, then load, log `save migrated vN → vM`
  - below floor → warn `below MIN_SUPPORTED_VERSION`, start fresh (pre-launch policy; see SaveAdapter.ts comment for the App-Store-launch revisit)
  - newer than this build → warn `newer than this build`, start fresh
  - missing migration in the chain → warn, start fresh
- **Defensive backfills in `store.loadSaved` left in place** as an independent safety net for partial in-memory state (hot-reload poisoning). They are idempotent and run on top of the migrated data.
- **New — `__tests__/saveMigrations.test.ts` (11 cases):** invariants (identity, TooOld, Future, registry contiguous from MIN to SAVE), each step in isolation, idempotence on already-modern data, full v15→SAVE_VERSION walk, unrelated-field preservation across the chain.
- **Verification:** `npx tsc --noEmit` clean. **424 tests across 25 suites — all green** (up from 413/24).
- **Outcome:** the BACKLOG.md item *"Save migration framework in `src/save/`: vN→vN+1 migrations, retire save wipes, test one migration path"* is done. The next shape bump (v19 → v20) adds one entry to `MIGRATIONS` and one test case; the loader does not need to change again.

---

## 2026-05-26 — Parent CLAUDE.md realigned with shipped code

- **§3 working contract:** removed the "Mockup before code for any new UI" bullet. KG dropped this gate on 2026-05-24 (recorded in the 6.5a changelog entry); the rule was still in the brief.
- **§4 tech stack:** split into "Installed and in use" and "Planned — not yet installed." The old table listed five libraries that are not in `package.json` (`expo-router`, `react-native-mmkv`, `react-native-reanimated`, `expo-haptics`, `react-native-wagmi-charts`) as though they were live. "Installed" now reflects what's actually shipped: AsyncStorage, react-native-svg, expo-blur, expo-linear-gradient, expo-status-bar, react-native-safe-area-context, Zustand, Jest + ts-jest, plus Expo SDK 54 / RN 0.81 / TS strict. `react-native-wagmi-charts` called out as deferred — the Exchange uses an in-house `CandlestickChart`.
- **§6 project structure:** rewritten to show the real `CryptoLife/` ↔ `cryptolife/` layout. Replaced `app/  Expo Router entry` (no such directory) with `App.tsx` + `index.ts`. Removed the empty `cryptolife/docs/` line (design docs live one level up). Added `BACKLOG.md`. Corrected `LocalSaveAdapter` → `AsyncStorageSaveAdapter` to match the actual filename.
- **§13 current status:** replaced the 2026-05-22 "design phase complete, scaffold the project" snapshot with the 2026-05-26 reality — 12+ apps wired, four scam archetypes live, 413 tests / 24 suites green, save v19, CI + auto-merge running. Next-steps list rewritten to mirror `BACKLOG.md`, with lint/format gate and accessibility audit added.
- **Outcome:** the standing brief no longer disagrees with the code on five library names, three section topics, and the project's stage. No code touched; doc-only. `BACKLOG.md` items unchanged.

---

## 2026-05-26 — CI + auto-merge for automation PRs

- **GitHub Actions — `.github/workflows/ci.yml`:** runs `npm ci`, `tsc --noEmit`, and `npm test` on PRs and pushes to `main`. PRs from `automation/*` or `cursor/*` branches enable auto-merge after tests pass.
- **Repo settings:** `allow_auto_merge` and `delete_branch_on_merge` enabled on `InVisionCRM/DontFOMO`.
- **`BACKLOG.md`:** repo-backed automation task list; Stage 6 marked complete.
- **Outcome:** hourly automation PRs merge themselves when green — no manual merge step.

---

## 2026-05-25 — Stage 6.5b + 6.6: Frozen Withdrawal, Wallet, News

- **6.5b Frozen Withdrawal (Decision Point):** catalog entry `frozen-withdrawal` (reactive, Bank+Mail, difficulty 3, major). `deployFrozenWithdrawal` + tick timeout (expired → `waited`). `resolveScamFromPlayer` supports `decision: 'cancelled'` (no pacing tick). `bank.pendingWithdrawal` on `BankState`; save **v19**.
- **Data — `frozenWithdrawal.ts`:** paired Mail — genuine `notices@bank.com`, trap `notices@bannk.com`; secondary cancel action on the safe email.
- **Bank UI:** `BankWithdrawSheet`, withdrawal hold lockout (tx card + cancel ghost), `initiateBankWithdrawal` (≥ $10k triggers scam when pacing allows).
- **Mail UI:** `secondaryAction` on `MailMessage` + `MailDetail` ghost button.
- **6.6 Wallet:** `WalletScreen` — holdings list + estimated USD from market prices.
- **6.6 News:** `NewsScreen` + `news.ts` starter headlines (static feed v1).
- **Authority Notice:** paired emails reworked to bank typosquat (`notices@bannk.com` as second message); Marcus teaching lines updated.
- **Tests:** `__tests__/frozenWithdrawal.test.ts` (9 cases). **413 tests / 24 suites — all green.**
- **Outcome:** all four scam archetypes live; no placeholder grid apps remain.

---

## 2026-05-25 — Authority Notice email canon + roadmap (KG)

- **Authority Notice paired Mail:** second email is now `notices@bannk.com` (typosquat trap); genuine path stays `notices@bank.com` on the lock screen and the first paired message (`BANK_TYPOSQUAT_ADDRESS` exported). Replaced the old government-domain fake so both messages look like Bank mail — closer to real phish.
- **Teaching threads:** Marcus lines updated for the typosquat tell (double-n domain vs lock-screen match).
- **Frozen Withdrawal mockup:** fake sender updated to `notices@bannk.com` for 6.5b canon alignment.
- **Roadmap (parent `CLAUDE.md` §13):** 6.6 teaching modal **cancelled** — teaching stays in Messages for authenticity; **6.6 reprioritised** to Wallet + News apps; **6.7 simulation harness deferred**; 6.5b fake email canon = `notices@bannk.com`.
- **Outcome:** tests green; no teaching modal work planned.

---

## 2026-05-25 — Settings: Reset game

- **Store — `resetGame(now)`:** replaces in-memory state with `freshGame`, deletes `cryptolife.save` via `saveAdapter.clear()`, then writes a new save so the next launch stays on onboarding.
- **UI — `src/ui/settings/SettingsScreen.tsx`:** registered in `appScreens.ts`; destructive "Reset game" row with a two-step `Alert` confirmation and a busy state while persistence runs. On success, `App.tsx` swaps back to `OnboardingShell` because `hasOnboarded` is false.
- **Tests — `store.test.ts`:** mocks the save adapter; asserts reset restores starting cash, clears the open app, and persists `hasOnboarded: false`.
- **Outcome:** players and devs can start fresh from the Settings app on the home grid without wiping Expo Go.

---

## 2026-05-24 — Stage 6.5a: Golden Giveaway scam shipped (first proactive Inbound Lure on Clout)

- **Working contract change:** KG dropped the "mockup before code for any new UI" rule (parent `CLAUDE.md` §3) this session; all future UI goes straight to code. The mockup at `../DontFOMO_ScamEvent_GoldenGiveaway_Mockup.html` was the spec for this work; new screens after this will skip the mockup gate.
- **Catalog — `src/engine/scam-director/catalog.ts`:** added `GOLDEN_GIVEAWAY_ID = 'golden-giveaway'` (archetype `inbound-lure`, channels `['clout']`, difficulty 1, `maxSeverity: 'minor'`, `trigger: 'proactive'`). The picker now actually has to pick between two proactive entries in the newbie band — first real exercise of the difficulty-band overlap (1..3 / 2..4 / 3..5).
- **Director — `director.ts`:** new constant `GOLDEN_GIVEAWAY_TIMEOUT_DAYS = 3` (longer than Authority Notice's 1d because Inbound Lures have no ticking real-world consequence — the window only exists to garbage-collect abandoned instances). New tick branch resolves an expired Golden Giveaway as **caught** with `reason: 'expired'` — opposite polarity from the Authority Notice's expired-as-fell-for because ignoring an Inbound Lure *is* the safe choice per Bible §11. `mintProactiveInstance` extended with the giveaway branch. `resolveProactiveInstance` extended to emit `golden-giveaway-resolved` on the tap path.
- **New `DirectorEffect` variants** (in `types.ts`): `golden-giveaway-deployed { instanceId, expiresAt }` and `golden-giveaway-resolved { instanceId, caught, reason: 'tapped' | 'expired' }`.
- **Content data — `src/data/goldenGiveaway.ts`:** `GOLDEN_GIVEAWAY_CANON` (real `@vancereiter` joined 2019 / 1.4M followers / pinned anti-scam tweet; clone `@vancereiter_eth` 3 days old / 412 followers / gold check; takeover title/body, contract address, suggested 0.5 ETH send) plus `buildGoldenGiveawayTakeover(instanceId, expiresAt)`. UI reads the per-instance snapshot exclusively (never the canon directly) so a canon rename can never break in-flight instances pinned in a save.
- **Teaching content — `src/data/scamTeachings.ts`:** `golden-giveaway` caught + fell-for friend-voice threads, matching the existing voice rules (short lines, blame-shield on fell-for, quiet "respect" on caught).
- **Store wiring — `src/state/store.ts`:** new top-level `cloutTakeover: GoldenGiveawayTakeover | null` slot on `GameState` / `SavedGame` (parallels `bank.regulatoryHold` but lives at top level because Clout has no dedicated state slice in v1). `applyDirectorEffects` extended:
  - `golden-giveaway-deployed` → pins the takeover snapshot; fires "Clout" banner.
  - `golden-giveaway-resolved` → clears the takeover; always lands the teaching thread.
    - `caught + reason 'tapped'` (Report) → pays `vigilanceRewardFor('minor')` (+25 followers) + "Fake account reported" banner.
    - `caught + reason 'expired'` (player let the 3d window pass) → no follower reward, no banner. Inaction shouldn't pay the same as active vigilance — would distort the player-skill model.
    - `!caught` (Participate) → drain 30% of cash + 30% of every crypto holding (Scam Library v1.1 Event 10 damage matrix). Bank balance, Market assets, and player-launched tokens' supply untouched — the trap only takes what the player actually sent. "Wallet drained" banner.
- **Save shape — `SAVE_VERSION 17 → 18`.** Defensive backfill: `saved.cloutTakeover ?? null`. v17 saves load cleanly.
- **Clout UI — `src/ui/clout/CloutScreen.tsx`:** swap to the takeover overlay when `cloutTakeover !== null` (mirrors the Bank screen's `regulatoryHold` swap pattern). Two new components:
  - **`GoldenGiveawayTakeover.tsx`** — the full-screen "LIVE giveaway" overlay. Three buttons: Participate (opens an in-component MetaPocket-styled send-confirm sheet → Confirm resolves as fell-for), Verify @handle (caller-supplied — opens the compare view), and "Dismiss for now" (deliberately does NOT resolve — shakes via `Animated.sequence` and flips its label to "It will come back. Resolve it." The lockout-pressure flavour Scam Library §11 specifies for this Inbound Lure).
  - **`GoldenGiveawayCompare.tsx`** — the side-by-side compare. Two accounts rendered with pill badges (warn-tone on the clone's "Joined 3 days ago" + "Handle ends in _eth"; good-tone on the real founder's "Joined 2019" + "Original handle") and the real founder's pinned warning quoted in full. Two CTAs: "Report fake account" (resolve as caught) / "Participate anyway" (resolve as fell-for).
- **Tests — new `__tests__/goldenGiveaway.test.ts` (12 cases):**
  - Picker: Golden Giveaway is in candidates for a fresh game, reactive Clipboard excluded, returned when sole in-band proactive entry, null while an instance is in flight.
  - Director: arms + emits `deployed` with the 3d expiry; auto-resolves as CAUGHT (not fell-for) on timeout — Inbound Lure polarity check; `resolveProactiveInstance` produces correct tapped effects + pacing bookkeeping.
  - Store: deployment pins the snapshot + fires the Clout banner; correct (Report) resolution clears + pays minor reward + leaves cash/holdings alone; wrong (Participate) drains 30%/30% + leaves bank alone + posts "Wallet drained"; expired (ignored) credits caught but pays 0 followers; save round-trip preserves the snapshot.
- **Existing tests updated for the new 2-proactive-entry catalog:**
  - `__tests__/authorityNotice.test.ts` — picker assertions now scope to an `AUTHORITY_ONLY_CATALOG` (`SCAM_CATALOG.filter(d => d.id !== GOLDEN_GIVEAWAY_ID)`); store integration tests pre-seed a sham in-flight Golden Giveaway via a new `blockGoldenGiveaway(now)` helper so the picker deterministically picks Authority Notice.
  - `__tests__/store.test.ts` — `serializeGame`'s expected key list now includes `'cloutTakeover'`.
  - `__tests__/onboarding.test.ts` — `SavedGame` fixture now includes `cloutTakeover: null`.
- **Verification:** `npx tsc --noEmit` clean under strict mode. **403 tests across 23 suites — all green** (up from 391/22 at the 6.4 cut).
- **Outcome:** the Stage 6 catalogue now spans three of the four §11 archetypes (Slow Burn, Lockout, Inbound Lure). Only Decision Point remains, due in 6.5b. The picker now exercises the difficulty-band overlap rule in production for the first time — newbie players in the 1..3 band can face either of the two proactive scams.
- **Next:** **6.5b — Frozen Withdrawal** (Decision Point, Bank + Mail; mockup already at `../DontFOMO_ScamEvent_FrozenWithdrawal_Mockup.html`). Then 6.6 (teaching modal) and 6.7 (simulation harness).

---

## 2026-05-24 23:00 UTC — Stage 6.5b mockup: Frozen Withdrawal (autonomous run)
- Created [`../DontFOMO_ScamEvent_FrozenWithdrawal_Mockup.html`](../DontFOMO_ScamEvent_FrozenWithdrawal_Mockup.html) — the third Bank+Mail scam, **Decision Point** archetype (vs the Authority Notice's Lockout). Same family resemblance as 6.4 so the engine pipeline lines up: lockout-style hold modal on Bank, two staggered Mail emails, outcome screens with tells. The framing change is the lesson: this trap fires because the *player* started a large withdrawal — the scam rides on a real action they chose.
- **The teaching twist:** the correct move is to **do nothing**. The real Bank email (`notices@bank.com`, matching 6.4's canon) says "no action needed, your transfer clears overnight." The fake (`release@bank-secure-clearance.com`) demands a 0.018 BTC "release fee" — classic advance-fee fraud. Legit platforms deduct fees *from* your funds; they never collect upfront to release your own money.
- **New canonical outcome — "cancelled":** the hold modal exposes a `Cancel the withdrawal · funds stay in Bank` ghost button (mirrored as a secondary CTA inside the real email), giving the Decision Point a **clean third exit**: un-start the action the trap rides on. 0 cash damage, 0 follower change, transfer doesn't complete. Bible §11's "scams are setbacks, never fatal" gets a graceful zero-cost option specifically for Decision Points. Scam Library v1.3 promotes cancel-as-escape to canon for the family.
- **Sunk-cost surface:** the hold modal renders the in-flight withdrawal — amount ($20,000), destination wallet (truncated `0x…9b4f`), reference (`WD-2026-0517-3140`), pulsing amber "Held — compliance review" status row. Surfacing the pending action is what makes the sunk-cost lever bite (the player feels their money already half-gone).
- **Engine shape — confirmed doable for 6.5b:** the new `Decision Point + cancel` outcome plugs into the picker pipeline 6.4 just shipped. Needed:
  - **Catalog entry** in `src/data/scamCatalog.ts` (or `src/data/frozenWithdrawal.ts` alongside `authorityNotice.ts`): archetype `decision-point`, channels `bank` + `mail`, `trigger: 'reactive'` (action-initiated by the player's `withdrawCash(amount)` action over a threshold), difficulty 3, `maxSeverity: 'major'`.
  - **New Bank state:** `bank.pendingWithdrawal: PendingWithdrawal | null` (amount, destination, ref, holdExpiresAt). Add to `RegulatoryHold`'s sibling pattern; both clear on resolution.
  - **Three resolution paths** for the generic `resolveScamInstance` action: `caught` (open the real email → transfer completes at `holdExpiresAt`, pay `vigilanceRewardFor('major')`), `fellFor` (pay the fake fee → drain cash to 0, transfer never completes), `cancelled` (new) — return the pending amount to the available balance, scrub the paired emails, no follower change.
  - **No new engine capability needed beyond the cancelled outcome.** Reuses everything from 6.4: paired-email primitive, `MailAction.scamResolution`, picker pipeline, pacing gate, Bank lockout component, teaching threads. `vigilanceRewardFor` already has the `major` tier.
- **Est. 25/100** unchanged from the Scam Library spec, plus ~5 for the cancelled outcome path (cancel is just a return-to-baseline reducer — small).
- **Docs updated this run:** Scam Library v1.3 (Event 7 mockup pin + canon for cancel-as-escape + email domains); parent [`CLAUDE.md`](../CLAUDE.md) §13 6.5b row updated from "Needs mockup" to "Mockup ready" with canon link.
- **Outcome:** mockup visible in the preview panel; all three paths (pay the fake fee → drained, wait/trust the real email → cleared, cancel the withdrawal → clean exit) are wired. No engine code shipped — intentional, mockup-before-code per CLAUDE.md §3.
- **Not done / next steps:** KG approval on cancel-as-escape becoming a Decision-Point family convention; if approved, codify a `cancelled` branch in `applyDirectorEffects` alongside `caught` / `fellFor` so future Decision Points (Approval Trap, Lookalike Address, Honeypot Unlock) all inherit it for free. After that, **6.5a — Golden Giveaway** is next on the build queue (its mockup is already ready per parent CLAUDE.md §13).

---

## 2026-05-24 22:30 UTC — Stage 6.4: Authority Notice scam (first proactive Lockout)
- KG approved the mockup ([`../DontFOMO_ScamEvent_AuthorityNotice_Mockup.html`](../DontFOMO_ScamEvent_AuthorityNotice_Mockup.html)) and the three design calls: drain 100% of bank cash but leave crypto/assets untouched, introduce a `vigilanceRewardFor(severity)` ladder, and make the countdown real (24 in-game hours → auto fell-for).
- **Catalog — `src/engine/scam-director/catalog.ts`:** added `AUTHORITY_NOTICE_ID = 'authority-notice'` (archetype `lockout`, channels `bank`+`mail`, difficulty 3, `maxSeverity: 'major'`, `trigger: 'proactive'`). Also added the `ScamTrigger` discriminant (`reactive`/`proactive`) and tagged the existing Clipboard Scam as `reactive`. Reactive scams arm in response to player actions and bypass the pacing budget; proactive scams are picked by the Director and gated.
- **Vigilance reward ladder — `pacing.ts`:** new `VIGILANCE_REWARDS` (minor:25 / major:75 / severe:150) and `vigilanceRewardFor(severity)`. The store's legacy `VIGILANCE_REWARD_FOLLOWERS` becomes a derived re-export equal to `vigilanceRewardFor('minor')`, so the existing Clipboard-scam test contract is preserved literally. Authority Notice pays the `major` tier (+75) on a correct resolution.
- **Proactive picker — `src/engine/scam-director/picker.ts` (~95 LoC):** `pickProactiveScam(catalog, state, now, rand)` plus a public `proactiveCandidates(catalog, state)` for harness + test introspection. Filters: trigger must be `proactive`, difficulty in the player-skill band, def must not have a live instance, pacing gate (`canArmProactive`) must allow.
- **Difficulty bands now overlap** (1..3 / 2..4 / 3..5). v1 has one proactive scam (difficulty 3); without overlap a newbie band (1..2) would starve the catalog and the Director would never fire. Overlap also lets the Director surf difficulty smoothly as the player improves instead of jumping bands. 6.3's test for the newbie band was updated; a new test asserts adjacent bands overlap.
- **Director — `director.ts`:** `tickDirector` now accepts a catalog parameter (defaults to `SCAM_CATALOG`); handles in-flight Authority Notice timeout (auto fell-for on `now >= scheduledAt`); after the reactive Clipboard step, calls `pickProactiveScam` and mints a deployed instance + `authority-notice-deployed` effect. New pure helper `resolveProactiveInstance(state, instanceId, caught, now)` handles the player-tap path used by the store action.
- **New `DirectorEffect` variants** (in `types.ts`):
  - `authority-notice-deployed { instanceId, caseRef, expiresAt }`
  - `authority-notice-resolved { instanceId, caught, reason: 'tapped' | 'expired' }`
- **`MailAction` extended — `engine/mail/mail.ts`:** new optional `scamResolution: { scamId, instanceId, caught }` metadata. The UI dispatches `resolveScamInstance(instanceId, caught)` generically when the tapped action carries this, so the Mail screen stays scam-agnostic and future paired-email scams (Frozen Withdrawal, etc.) plug in without UI changes.
- **Content data — `src/data/authorityNotice.ts`:** `BANK_OFFICIAL_ADDRESS` (`notices@bank.com` — the answer key printed on the lock screen and used as the genuine email's `fromAddress`); `buildRegulatoryHoldNotice(instanceId, expiresAt)`; `buildAuthorityNoticePair(instanceId, caseRef, arrivedAt)`. The fake's `fromAddress` is `compliance@fccb-notice.gov.us-treasury.com` — the actual TLD is `.com`, the "gov" is a subdomain trick. Neither email carries `isSuspicious: true` — the player has to spot the fake themselves, which is the lesson.
- **Teaching content — `src/data/scamTeachings.ts`:** friend-voice `caught` and `fellFor` threads for `authority-notice`, mirroring the existing Clipboard pattern (short lines, blame-shield on fell-for, quiet "respect" on caught).
- **Bank state — `src/engine/economy/bank.ts`:** new `RegulatoryHold` type + `bank.regulatoryHold: RegulatoryHold | null`. All five bank-reconstruction sites in `store.ts` switched to spread (`{ ...s.bank, ... }`) so future bank fields don't trigger the same five-site bug.
- **Store wiring — `src/state/store.ts`:** `applyDirectorEffects` extended with two branches — `deployed` (sets the hold, pushes the two paired emails, fires "Regulatory hold placed" banner) and `resolved` (clears the hold + scrubs the paired emails always; on `caught` pays the `major` follower reward + fires "Hold cleared" banner; on `!caught` drains `state.cash` to zero but leaves `holdings` and `assets` untouched + fires "Bank drained" banner, with a wording variant for `reason: 'expired'`). New action `resolveScamInstance(instanceId, caught)` — the generic Mail-UI entry point.
- **Save shape — `SAVE_VERSION 16 → 17`.** Defensive backfill: `saved.bank.regulatoryHold ?? null`. v16 saves load cleanly.
- **Bank UI — `src/ui/bank/BankScreen.tsx`:** new in-file `RegulatoryHoldLockout` component renders when `bank.regulatoryHold !== null`. SVG seal, FCCB agency tag, case-ref row, live countdown bound to `state.clock.now`, teal "Open Mail to resolve" CTA (dispatches `openApp('mail')`), and a support line printing `notices@bank.com` — the answer key. Mockup-derived palette inline per CLAUDE.md §13 convention.
- **Mail UI — `src/ui/mail/MailDetail.tsx` + `MailScreen.tsx`:** `MailDetail` accepts a new optional `onAction(action, message)` prop and wires `onPress` on the action button. `MailScreen` passes a handler that, when the action carries `scamResolution`, closes the detail and dispatches `resolveScamInstance`. Inert actions stay inert.
- **Tests — new `__tests__/authorityNotice.test.ts` (13 cases):**
  - Picker: excludes reactive, picks Authority Notice for a fresh player, null while cooldown is running, null while an instance is in flight, null when no in-band candidate exists.
  - Director: arms + emits `deployed`, auto-resolves as fell-for on timeout, `resolveProactiveInstance` emits `tapped` with the supplied outcome, no-op for unknown ids.
  - Store: deployment places the hold + both paired emails; correct resolution lifts the hold + pays `vigilanceRewardFor('major')` + scrubs the pair + leaves cash/holdings alone; wrong resolution drains cash to 0 but holdings stay; save round-trip preserves an in-flight hold.
- **Test scoping** for the new cross-scam interaction: existing scamDirector / scamPacing / clipboardScamFlow suites now constrain to a Clipboard-only catalog (or push the pacing cooldown past the test horizon in the store-level Clipboard flow) so they exercise only their unit-under-test. Cross-scam interactions belong in `authorityNotice.test.ts`.
- **Verification:** `npx tsc --noEmit` clean. **391 tests across 22 suites — all green.**
- **Next:** **6.5a — Golden Giveaway** (Inbound Lure, Clout). Needs a mockup. Same picker pipeline; the new ground will be the Clout-feed surface for an Inbound Lure (no lockout this time — the scam *arrives* and sits there).

---

## 2026-05-24 19:10 UTC — Phase 2.6: GigDrop mockup (off-roadmap, autonomous run)
- Created [`DontFOMO_GigDrop_App_Mockup.html`](../DontFOMO_GigDrop_App_Mockup.html) — a
  fourth USD-earning surface to sit beside CashSwipe, Sniper, and Rug
  Radar. Bible §15 had left the "future minigames" slot open; this
  fills it with a microtask app (captcha tiles, ad watches, ratings,
  surveys) that pays USD into Bank under a low daily cap (~$30/day).
- **The point isn't the income.** $30/day is intentionally below
  CashSwipe and Sniper — GigDrop is filler money. Its real value is
  hosting **Scam Event 16 — The Task Trap** (Scam Library v1.2): a
  "VIP recruiter" Inbound Lure DM that demands a 50 USDX "trust
  deposit" to unlock higher-paying work. Tapping the DM ribbon opens
  a resolution surface with two actions — Report & delete (vigilance
  reward) and Pay (wallet drain). Cleanest possible teaching moment
  for real-world WhatsApp/Telegram task scams.
- **Slots into Stage 6 cleanly.** With 6.3's pacing layer just
  shipped, The Task Trap becomes a natural second proactive catalog
  entry alongside Stage 6.4's planned Authority Notice — both
  consult `canArmProactive`, both exercise the cooldown + per-window
  cap gate, and they hit different archetypes (Inbound Lure vs
  Lockout) and different apps (GigDrop vs Bank+Mail) so the Director
  has real choice in what to arm.
- **Mockup wiring:** the prototype's logic mirrors what the RN engine
  will own — pure gig spawner (5 templates × 4 kinds), one playable
  tile-captcha minigame (3-of-9, strict mistake budget), payout into
  a fake "Bank" with the daily cap enforced, rating stat (0–100) that
  ticks down on misses and up on cleans, banner+buzz on every settle
  per Bible §5. The scam path is fully click-through so KG can feel
  both outcomes in the preview.
- **Style alignment:** matches the established 414×868 device shell,
  status bar, header pill, HUD strip, glass overlays, breathing
  primary CTA, top-edge buzz banner. Lime accent (`#A3E635`) chosen
  as a distinct per-app identity not yet used elsewhere (CashSwipe is
  the brighter `#22C55E`).
- **Types & engine shape — confirmed doable:** the eventual RN port
  is the same template as CashSwipe / Sniper / Rug Radar:
  ```
  src/engine/gigDrop/gigDrop.ts   // pure: spawn / accept / submit / settle
  src/data/gigDrop.ts             // GIG_POOL templates + TILE_SET
  src/state/...                   // GigState slice + completeGig action
  src/ui/screens/GigDrop/         // list + minigame overlay + scam overlay
  ```
  Key types in the mockup script (`GigKind`, `Gig`, `GigState`, the
  captcha grading function) are written so a direct TS port is
  one-to-one. The scam path uses the existing `applyDirectorEffects`
  drain primitive from 6.2 at a fixed 50 USDX — no new engine
  capability needed. New `GigState` save field follows CLAUDE.md
  §13's defensive-defaults pattern (next bump: `SAVE_VERSION 16 → 17`).
- **Estimated build complexity** (RN port, when scheduled): **38/100.**
  Drivers: engine + data is small (the gig shape is trivial), the
  tile-captcha grader is ~25 LoC, the scam Inbound Lure piggybacks
  on existing wallet-drain + banner+buzz + Director-catalog
  primitives, and the screens are a list + two overlays.
- **Docs updated this run:** Design Bible v0.10 (§5 GigDrop row
  added; §15 open-items note advanced; changelog entry); Scam Library
  v1.2 (Event 16 added, removed from bonus list, quick-select row);
  parent [`CLAUDE.md`](../CLAUDE.md) §13 mockup note.
- **Outcome:** mockup visible in the preview panel; both paths
  (legitimate gig completion + scam DM open / report / pay) are
  wired and click-through. No engine code shipped — intentional, per
  the project's mockup-before-code convention.
- **Not done / next steps:** KG approval on the lime accent and the
  microtask UX; spec the precise gig-payout curve (current values
  illustrative); decide ordering vs Stage 6.4 — recommend the
  Authority Notice ships first (already in the Director's roadmap)
  and GigDrop + Task Trap lands as Stage 6.5 or 6.6 so the second
  proactive scam meets a Director that already has live competitive
  budgeting.

---

## 2026-05-24 18:00 UTC — Stage 6.3: Scam Director pacing engine + player-skill model
- Started Stage 6's adaptive layer per [`DontFOMO_React_Migration_Plan.md`](../DontFOMO_React_Migration_Plan.md) §4.2 (Jobs 1 + 2 — pacing and adaptivity). Pure-engine only; no UI, no mockup needed.
- **Audit before code:** confirmed sub-checkpoints 6.1 (skeleton) and 6.2 (Clipboard Scam end-to-end) were already shipped — `applyDirectorEffects` in `src/state/store.ts` drains holdings, scrubs sensitive clipboard entries, fires the "Wallet drained" banner, pushes friend-voice teaching threads to Messages, and rewards followers on defuse. The prior CLAUDE.md "Known gaps: Clipboard Scam detonation" line was stale and has been corrected (see §13 below).
- **New types — `src/engine/scam-director/types.ts`:** `ResolutionRecord`, `PacingState`, `PlayerSkill`. `DirectorState` gained `pacing: PacingState`.
- **New module — `src/engine/scam-director/pacing.ts` (~190 LoC):** `createPacingState`, `recordResolution`, `computePlayerSkill`, `difficultyBandFor`, `proactiveCapFor`, `canArmReactive`, `canArmProactive`, `defaultSeverityFor`. Defensible tuning constants in `PACING_DEFAULTS` (cooldown 1.5d / severe 3d, rolling window 7d, newbie cap 1 / sharp cap 3, sample size 10, band cuts 0.3 / 0.7). Stage 6.7's simulation harness will retune; do not adjust by intuition.
- **Two-tier arming gate:** `canArmReactive` (player-triggered scams — always permissive) vs `canArmProactive` (Director-chosen scams — cooldown + per-window cap). The Clipboard Scam is reactive; future Authority Notice / Golden Giveaway / Frozen Withdrawal (6.4 / 6.5) will be proactive and consult the gate.
- **`tickDirector` integration:** on every defuse or detonation, records a `ResolutionRecord` (with realised severity derived from the catalog entry) into `pacing.recentResolutions` and extends `cooldownUntil`. Reactive Clipboard arming still fires unconditionally — but now the cooldown bookkeeping is in place for proactive scams to consult. Same-tick no-op preserves pacing reference identity.
- **Save shape bump — `SAVE_VERSION 15 → 16`.** Defensive backfill in `store.ts` `loadSaved` and `serializeGame`: a v15 `saved.director` without `pacing` gets a fresh `createPacingState(now)` (CLAUDE.md §13's defensive-default pattern). v15 saves load cleanly; v14-and-below already widened to `createDirectorState(now)`.
- **Tests — new `__tests__/scamPacing.test.ts` (24 cases):** `createPacingState`, `recordResolution` (cooldown extension by severity, never-shorten, window pruning), `computePlayerSkill` (zero state, single-catch confidence weighting, ceiling at full sample, sliding window), `difficultyBandFor` (newbie/middle/sharp bands), `proactiveCapFor` (monotonic interpolation), `canArmReactive` (always true), `canArmProactive` (cooldown gate, post-cooldown allow, cap-reached deny, newbie one-per-window), `defaultSeverityFor` (band mapping + cap clipping), and a `tickDirector` integration block confirming pacing records both defuse and detonation.
- **Fixture updates:** two hand-rolled `DirectorState` fixtures in `onboarding.test.ts` and `store.test.ts` gained `pacing: { cooldownUntil: 0, recentResolutions: [] }` to satisfy the new field. The store's `loadSaved` defensive default handles real v15-shaped saves on disk; the fixtures are just typed literals.
- **Verification:** `npx tsc --noEmit` clean. **376 tests across 21 suites — all green** (was 302/17 at last CLAUDE.md update; intermediate growth was unrecorded).
- **Next:** **Stage 6.4 — Authority Notice scam (Lockout archetype, Bank + Mail).** First proactive catalog entry. Per CLAUDE.md §3, the in-app fake-notice UI needs a mockup before code. The pacing layer's `canArmProactive` gate will be exercised end-to-end as soon as the second scam exists to compete with the first for budget.

---

## 2026-05-24 07:00 UTC — Phase 2.5: Rug Radar minigame (off-roadmap, KG-approved)
- KG approved an unscheduled feature insertion: **Rug Radar**, the
  second minigame. Bible §15 explicitly left this slot open ("future
  minigames beyond CashSwipe — to be added later"). Decision logged
  as Phase 2.5 because it slots between the Phase-2 onboarding/
  Clipboard primer and the Stage-6 Scam Director (which remains the
  next planned stage per [`DontFOMO_React_Migration_Plan.md`](../DontFOMO_React_Migration_Plan.md)).
- **Design (mocked + approved):** card-based "spot the scam" minigame.
  Player is shown a 10-card daily deck — token launches, tweets, DMs,
  emails, wallet permissions — and judges each LEGIT or SCAM. Honors
  Bible §4 (pays USD, the income-floor rule) and Bible §11 (3-in-a-row
  streak pays a follower bonus — the cleanest expression of the
  vigilance reward). Cards mirror Scam Library v1.1 archetypes so
  grinding Rug Radar rehearses the same patterns the Scam Director
  will throw at the player live.
- **Engine — `src/engine/rugRadar/rugRadar.ts`:** pure TS. Exposes
  `RugRadarCard`, `RugRadarSession`, `RugRadarState`, `JudgeOutcome`,
  `SessionSummary`, the constants (`RUG_RADAR_DECK_SIZE = 10`,
  `RUG_RADAR_STREAK_BONUS_USD = 50`, `RUG_RADAR_STREAK_BONUS_FOLLOWERS = 5`,
  `RUG_RADAR_PERFECT_DECK_BONUS_USD = 100`), and pure functions
  `createRugRadar`, `refreshRugRadarDay`, `decksRemainingToday`,
  `isDeckCapReached`, `startSession`, `judgeCard`, `abandonSession`,
  `lifetimeAccuracy`. Daily cap reuses CashSwipe's `localDayKey` so
  "today" stays consistent across both minigames.
- **Tests — `__tests__/rugRadar.test.ts`:** 29 cases covering day
  refresh across midnight, deck-cap behaviour, per-judgement payout,
  streak bonus on every 3rd correct, perfect-deck bonus, lifetime
  totals across decks, session-clearing on completion, guard throws
  on misuse, and abandonment.
- **Data — `src/data/rugRadar.ts`:** the 10-card library ported from
  the approved mockup (`DontFOMO_RugRadar_App_Mockup.html`). Each
  card is typed (`token` / `tweet` / `dm` / `email` / `perm`) with a
  discriminated `content` payload, `isScam` truth, `pay` tuning,
  `difficulty` and an educational `reason`. `dailyDeck(dayKey)`
  returns the fixed library for v1; signature is future-proofed for
  seed-shuffled rotation once the library grows past 10.
- **Store — `src/state/store.ts`:** added `rugRadar: RugRadarState` to
  both `SavedGame` and `GameState`; defensive defaults on both sides
  of `loadSaved` and `serializeGame` per the §13 pattern; bumped
  `SAVE_VERSION` 14 → 15. Two new actions:
  - `startRugRadarSession(now)` — no-op if cap spent or session live.
  - `judgeRugRadarCard(calledScam)` — credits USD (card + streak
    bonus + perfect bonus), credits followers from streaks, posts
    the deck-complete banner per Bible §5, and **returns the
    engine's outcome** so the screen can drive its animation without
    importing the engine.
  - New exported type `RugRadarJudgeOutcome` is the store-boundary
    name for the engine's outcome shape — keeps UI code free of
    direct engine type imports.
- **UI — `src/ui/rugRadar/`:**
  - `RugRadarScreen.tsx`: orchestrates three local view-states (start
    / game / result), an `Animated.Value` driven card-exit (translate +
    rotate + fade) on the native thread, the HUD with earned/streak/
    card progress, the verdict buttons.
  - `RugRadarCardView.tsx`: discriminated renderer for the four card
    surfaces. Per-card-type chip palette and tone colours inline per
    §13's mockup-derived-colour rule; foundation/spacing/typography
    pulled from `theme.ts`.
- **Home grid:** added `rugradar` AppId, AppDefinition (amber→red
  gradient `#FB923C → #B91C1C`, concentric-rings glyph), registered
  in `APP_SCREENS`. `useAppBadges()` now surfaces a `1` badge on the
  Rug Radar icon whenever today's deck has not yet been played.
- **Honest scope flag:** this is **off the Migration Plan roadmap**.
  Stage 6 — the Scam Director (including the Clipboard Scam
  detonation half) — remains the next planned stage and is now
  delayed by this insertion. Re-prioritising at KG's call.
- **Outcome:** all 350 unit tests across 20 suites pass; `tsc --noEmit`
  clean under strict mode. Per-card review list on the result screen
  is deferred (flagged in `RugRadarScreen.tsx`); polish-pass
  follow-ups: real swipe gestures (currently tap), haptic on each
  judgement, sound on perfect-deck banner, library expansion past
  10 with daily-shuffled deck.

## 2026-05-24 06:15 UTC — Stage 6 checkpoints 6.1 + 6.2: the Clipboard Scam fires
- Two-checkpoint pass: 6.1 builds the Scam Director's skeleton +
  catalog data shape; 6.2 wires the flagship Clipboard Scam end to
  end. The arming half shipped in Phase 2 (the player tapping Copy
  during onboarding plants the sensitive entry). Today's work adds
  the detonation half — a 1–3 in-game-day window, a drain
  consequence, the defuse path, and a friend-voice teaching thread.
- **Engine — `src/engine/scam-director/`:**
  - `types.ts`: `ScamArchetype` (lockout / slow-burn / inbound-lure
    / decision-point per Bible §11), `ScamChannel`, the per-instance
    `ScamLifecycleState` machine (armed → deployed → presented →
    awaiting-response → resolved → cooldown — Migration Plan §4.3),
    `ScamSeverity` (Migration Plan §4.4), `ScamEventDef` (catalog),
    `ScamInstance` (live), `DirectorState` (instances + lifetime
    counters), and the `DirectorEffect` discriminated union the
    store consumes.
  - `catalog.ts`: `SCAM_CATALOG` now carries the first entry — the
    Clipboard Scam (Scam Library v1.1 Event #5).
  - `director.ts`: `createDirectorState` + pure `tickDirector`.
    Scans the clipboard each tick; arms when a sensitive entry is
    present and no active instance exists; transitions to resolved
    on detonation (`now >= scheduledAt`) or defuse (sensitive entry
    gone). Detonation delay is a random 1–3 in-game days (via the
    existing mulberry32 generator). Defuse beats detonation if both
    fire on the same tick.
- **Data — `src/data/scamTeachings.ts`:** friend-voice Mail/Messages
  content keyed by scam id. The Clipboard Scam's teachings come
  from **Marcus** (the existing trader-friend NPC), one thread for
  caught + one for fell-for, four short lines each. Voice per KG:
  "Hey, I looked into it — looks like you [did X]. lesson is [Y]"
  with blame-shielding and hope on the fall-for path.
- **Store — `src/state/store.ts`:**
  - New `director: DirectorState` slice on GameState/SavedGame with
    defensive defaults; `freshGame` seeds it via
    `createDirectorState(now)`.
  - `applyDirectorEffects` helper folds the Director's effect list
    into a partial update: `armed` is silent, `detonated` zeroes
    holdings + clears sensitive clipboard entries (the drainer
    "consumed" them) + fires a "Wallet drained" banner + appends
    Marcus's fell-for thread, `defused` adds
    `VIGILANCE_REWARD_FOLLOWERS` (+25) + appends the caught thread,
    no banner per Bible §5.
  - `runDirectorTick` runs the tick from inside the `tick`,
    `resume`, and `loadSaved` actions. Skips entirely while
    `onboarding.hasOnboarded === false` — scams cannot fire during
    setup. The `loadSaved` integration is what surfaces a
    detonation that came due during the offline gap.
  - **`SAVE_VERSION` bumped 13 → 14.** v13 wipes per precedent.
- **Tests:** `__tests__/scamDirector.test.ts` extended to 13 cases
  (arming, detonation, defuse, defuse-beats-detonation, purity,
  catalog lookup). New `__tests__/clipboardScamFlow.test.ts` with 6
  end-to-end cases through the store (arm → tick → detonate → drain
  + teaching; arm → delete → defuse + reward; pre-detonation
  no-fire; onboarding gate; loadSaved offline-catch-up). The
  unemployment anchor is pushed forward in the test fixture to
  keep multi-day ticks from accidentally crediting cash. **321
  tests across 19 suites passing; `tsc --noEmit` clean strict.**
- **Outcome:** the headline mechanic is now real. A player who
  taps Copy during onboarding has their crypto holdings wiped 1–3
  in-game days later, sees a "Wallet drained" banner, and receives
  a four-line Marcus DM explaining what happened and what to do
  next time. A player who deletes the entry from the Clipboard
  before the window earns +25 followers and gets a quieter Marcus
  DM congratulating them. Pacing, the player-skill model,
  inter-scam cooldowns, and the remaining three scams (Authority
  Notice / Golden Giveaway / Frozen Withdrawal) ship in
  6.3 / 6.4 / 6.5.

## 2026-05-24 03:30 UTC — Onboarding flow + the Clipboard Scam primer
- Bible §13's first-launch flow + the flagship Slow Burn's arming
  mechanism (Scam Library v1.1 Event #5). Players who tap "Copy to
  clipboard" during wallet setup leave the 12-word recovery phrase
  in the Clipboard app, defusable by deleting it. The detonation
  pathway will be wired by the Scam Director in Stage 6.
- **Engine — `src/engine/clipboard/`:** new `ClipboardEntry` model
  (`id`, `content`, `copiedAt`, `isSensitive`, optional `source`).
  Pure helpers: `addEntry` (newest first, capped at
  `CLIPBOARD_HISTORY_CAP = 20`), `deleteEntry`, `findSensitive`,
  `readLatest`.
- **Engine — `src/engine/onboarding/`:** cosmetic seed-phrase
  generator. `pickPhrase(seed, count)` runs Fisher-Yates over a
  96-word in-game wordlist via the existing `createRandom`
  (mulberry32). NOT BIP-39 — DON'T FOMO is a simulation, not a
  custodial wallet (CLAUDE.md §7). Companions: `phraseToText`,
  `looksLikePhrase` (the defensive shape-detector for the scan tick).
- **Engine — `src/engine/scam-director/clipboardScan.ts`:** the
  foundational primitive for clipboard-class Slow Burns. Pure
  scanner — returns the first entry flagged `isSensitive`, falling
  back to the shape-detector. Full Director (Stage 6) wraps this
  with cooldown + detonation delay + drain + teaching.
- **Store integration (`src/state/store.ts`):**
  - Two new fields on `GameState` / `SavedGame`: `clipboard:
    ClipboardEntry[]` and `onboarding: { hasOnboarded,
    pendingSeedPhrase }`. Seeded by `freshGame`; `loadSaved` +
    `serializeGame` carry them through with defensive defaults.
  - Pre-v13 saves default to `hasOnboarded: true` so existing
    players are never punted into the onboarding flow.
  - Five new actions: `setProfile(name, bio)` slugifies the handle
    and trims the bio; `generateWallet(seed?)` parks a fresh
    12-word phrase on the onboarding slice; `copySeedToClipboard
    (now)` arms the trap as a sensitive entry tagged "Recovery
    phrase"; `deleteClipboardEntry(id)` is the defuse path;
    `finishOnboarding()` flips the gate and clears the pending
    phrase.
  - **`SAVE_VERSION` bumped 12 → 13.** v12 saves wipe per
    precedent (Stage 7 brings the proper migration framework).
- **Top-level routing (`App.tsx`):** state-driven shell switch
  reads `onboarding.hasOnboarded` and mounts `<OnboardingShell />`
  or `<PhoneShell />`. No Expo Router yet — kept lighter and
  consistent with the in-game state-driven app switching. Can
  introduce Expo Router later when a second top-level flow appears.
- **UI — `src/ui/onboarding/`:**
  - `OnboardingShell` owns the linear step index and renders the
    right step against the existing `Wallpaper` + `PhoneStatusBar`.
  - Six steps to the mockup (`DontFOMO_Onboarding_Flow_Mockup.html`):
    Welcome → Profile → Wallet intro → Seed phrase → Confirm →
    Done. Welcome's brand line says "DON'T FOMO" (mockup said
    "CryptoLife" — pre-rename).
  - Profile auto-derives the avatar initial from the typed name
    (orange gradient per the mockup). Continue is disabled until
    a name is typed.
  - Seed phrase step shows the 12 words from
    `onboarding.pendingSeedPhrase`, a warning callout, the "Copy
    to clipboard" ghost button (the trap — dispatches
    `copySeedToClipboard`), and the primary Continue button. Copy
    does NOT advance — the player still has to tap Continue.
  - Confirm step's "Paste from clipboard" reads the latest
    clipboard entry and fills the 12 grid slots; a safe-path
    "I wrote it down — mark as saved" link fills from the
    pending phrase so a player who avoided Copy isn't stuck.
  - Done step dispatches `finishOnboarding` → App.tsx flips to
    PhoneShell.
- **UI — `src/ui/clipboard/ClipboardScreen.tsx`:** real screen,
  registered in `appScreens.ts` (replaces the placeholder). Header
  + list of entries; each row shows source label / content /
  relative timestamp / delete button. Sensitive entries get the
  danger border, filled delete button, and the on-screen teaching
  callout ("Anyone who reads it controls your entire wallet —
  delete it now"). Built to `DontFOMO_Clipboard_App_Mockup.html`.
- **UI — `useAppBadges`:** Clipboard now reports a "1" badge
  whenever a sensitive entry sits in history. Quiet, pull-based
  nudge per Bible §5 — the player learns that a Clipboard badge
  means something dangerous to address.
- **Tests:** four new suites — `clipboard.test.ts` (12),
  `seedPhrase.test.ts` (14), `clipboardScan.test.ts` (4),
  `onboarding.test.ts` (17). Existing `store.test.ts` updated for
  the new SavedGame shape. **All 17 suites / 302 tests passing;
  `tsc --noEmit` clean under strict mode.**
- **Outcome:** Phase 2 closed end-to-end. The Clipboard Scam is
  armable today (player taps Copy in onboarding → sensitive entry
  sits in Clipboard with the red badge), defusable today (delete
  in Clipboard → badge clears, scan returns clean), and primed for
  Stage 6 to add the detonation half (drain + teaching). Device
  verification on Expo Go is the open follow-up; the existing
  comm-app tap-through still holds.

## 2026-05-24 00:26 UTC — Stage 5, checkpoint 5: the Market app + Stage 5 complete
- Last comm app. Cars, watches, houses — assets bought with USD
  only (Bible §4), each giving a **follower boost while owned**
  (Bible §5) and counting toward **`peakNetWorth`** (Bible §14).
  Selling returns USD at a 70% haircut and gives back the follower
  boost. Stage 5 is now done.
- **Engine** (`src/engine/assets/assets.ts`): pure-TS catalogue
  model. `AssetDefinition` (id, name, category, price,
  followersBoost, thumbGradient, description, optional
  `resaleRate`), `OwnedAsset` (id + acquiredAt), three categories
  (`Cars` / `Watches` / `Houses`). Pure helpers: `findAsset`,
  `isOwned`, `ownedValue` (sum of book-value prices),
  `ownedFollowerBoost`, `resaleValue` (default 70%), `addOwned`
  (idempotent), `removeOwned`.
- **Data** (`src/data/assets.ts`): nine catalogue entries from the
  approved mockup — 3 tiers per category:
  - Cars: City Hatchback $24k / +15, Sports Coupe $140k / +120,
    Hypercar $1.2M / +850.
  - Watches: Steel Diver $9k / +40, Gold Chrono $52k / +260,
    Diamond Piece $480k / +1,400.
  - Houses: Studio $180k / +90, Suburban $720k / +520,
    Beachfront Villa $4.2M / +3,200.
  All keep the mockup's satirical descriptions.
- **Store integration:**
  - New `assets: OwnedAsset[]` field on `GameState` and
    `SavedGame`. Seeded empty in `freshGame`; `loadSaved` +
    `serializeGame` carry it through with the defensive default
    pattern.
  - **`netWorthOf` updated** to `cash + holdingsValue + ownedValue`
    (the full Bible §14 formula). `tick` / `resume` / `loadSaved`
    all pass `s.assets` through; `peakNetWorth` now climbs with
    every asset bought.
  - New actions: `buyAsset(id, now)` charges price, adds the owned
    record, bumps `followers` by `followersBoost`, posts a Market
    banner (with the follower-boost note). `sellAsset(id, now)`
    returns the resale value, removes the owned record, subtracts
    `followersBoost` (floored at 0), posts a sale banner. Both
    are guarded against duplicates / missing ids / insufficient
    cash.
  - **`SAVE_VERSION` bumped 11 → 12.** v11 wipes per precedent.
- **UI** (`src/ui/market/`):
  - `MarketScreen` — pink-accented dark screen. Title + subtitle,
    three category filter chips (Cars / Watches / Houses), 2-column
    `AssetCard` grid filtered by the active chip, slide-in
    `AssetDetail`. Uses the stable empty-array fallback pattern.
  - `AssetCard` — gradient thumbnail with optional OWNED badge,
    name + pink price + "+N followers" caption.
  - `AssetDetail` — 280px gradient hero with back chevron, asset
    name + big pink price, "+N followers while owned" call-out
    card (with a user icon), description, **Buy** button at the
    bottom (disabled / "Not enough cash" when short on USD) or a
    **Sell for $X** button when owned. Resale percentage shown as
    a flavour line above the action bar when owned.
- **Tests:**
  - New `__tests__/assets.test.ts` — 13 engine tests covering
    `findAsset`, `isOwned`, `ownedValue` + `ownedFollowerBoost`
    (including ghost ids), `resaleValue` defaults + per-asset
    override, `addOwned` idempotency + purity, `removeOwned`.
  - 7 new store tests: zero starting assets, buy deducts +
    follows, refuses on short cash, idempotency, sell at resale,
    no-op for unowned, **owned assets bump `peakNetWorth`**, and
    save/load round-trip.
  - One existing test updated for the new `SavedGame` field.
  - Suite is **13/13 green at 257 tests** (was 236).
- No new runtime dependencies.
- Verification: `npx tsc --noEmit` exits 0; `npm test` 257/257.
- **Stage 5 (Communication apps) is complete.** Mail, Tunnel,
  Messages, Clout, Market — all live. The scam-channel substrate
  Stage 6's Scam Director will assemble on top of is in place:
  every Bible-§11 scam pattern (Hijacked Friend in Messages,
  duplicate channel + fake support in Tunnel, typo-squat phish in
  Clout + Mail, recovery-vulture-style mail) has its UI vessel
  ready. Net-worth completion (cash + crypto + assets) means
  peakNetWorth is now correct; the Thursday unemployment check
  finally scales off the player's full lifetime peak.

## 2026-05-24 00:12 UTC — Stage 5, checkpoint 4: the Clout app + daily Post + Diamonds
- Heaviest comm app — public identity (Bible §6) plus the feed
  where alpha + scam tweets arrive (Bible §8) plus the **daily
  Post** consistency hook with streak rewards and Diamond drops
  (Bible §6 + §12). Single-screen v1 (profile strip on top, feed
  below, floating Post button) — bottom-tab UI, search panel and
  notifications panel are deferred polish.
- **Engine** (`src/engine/clout/clout.ts`): pure-TS.
  - `Tweet` / `TweetAuthor` / `TweetLinkCard` / `TweetStats`
    types. `isSuspicious` flag drives the danger tint for typo-
    squat / fake-founder tweets.
  - `DailyPostState` (`lastPostAt`, `currentStreakDays`,
    `graceDays`).
  - Rules: ramp +1..+7 over days 1-7, flat +7 from day 8; every
    7-day milestone bumps **+1 Diamond** and banks **+1 grace
    day** (cap 3); a missed day spends grace automatically; if
    grace runs out the streak breaks, resets to day 1, and stings
    **-3 followers** once.
  - Pure helpers: `dayKey`, `daysBetween`, `canPostToday`,
    `streakReward`, `applyDailyPost`, `pushTweet`, `clampFeed`.
- **Data** (`src/data/clout.ts`): five seed tweets — Ape House
  alpha tip with a `stablefarm.xyz` link card, a verified Crypto
  Desk satire post, a **typo-squat phish** from
  `@DAVE_protoco1` (note the digit `1` — Bible §11's "every
  opportunity has a fake twin" primer), sarah's degen humour,
  chart fairy's $PEPE2 take. Plus `DEFAULT_BIO`.
- **Store integration:**
  - New fields on `GameState` and `SavedGame`: `bio: string`,
    `cloutFeed: Tweet[]`, `dailyPost: DailyPostState`,
    `diamonds: number`.
  - New actions: `postDailyClout(now)` (runs the engine, credits
    followers + diamonds, posts a "Day N. +N followers." banner —
    or the streak-broken variant), `pushTweet(tweet)` (for the
    Scam Director / future events).
  - `freshGame` seeds the feed + zero diamonds + an empty
    DailyPost state. `loadSaved` normalises each field with
    defensive defaults; `serializeGame` carries them through.
  - **`SAVE_VERSION` bumped 10 → 11.** v10 saves wipe.
- **UI** (`src/ui/clout/`):
  - `CloutScreen` — single scrollable view. ProfileStrip on top,
    feed (capped to 5 per Bible §6) below, floating PostFAB. Uses
    the stable empty-array fallback pattern.
  - `CloutProfileStrip` — purple/pink gradient banner, avatar
    overlap, display name + handle + bio + Following/Followers
    counts, streak card (orange flame, "N-day post streak" /
    "Post today to keep it alive" or "Already posted today ✓").
  - `TweetCard` — gradient avatar, name + verified-blue badge,
    handle + relative time, body text, optional link-preview
    card (gradient thumbnail + domain + headline), action-stat
    row (reply / repost / heart / views, formatted as 1.2K /
    44K / 1.2M). Suspicious tweets get a subtle red tint on the
    row.
  - `PostFAB` — bottom-right blue circle. Streak-badge in the
    top-right shows a flame + day count when canPost; flips to a
    ✓ when already posted today; the FAB itself dims to 0.45
    opacity then.
- **Banner copy:** Day-N posts say
  `"Day N. +N followers."`; milestone posts add
  `", +1 diamond."`; broken streaks say
  `"Streak broken — back to day 1. -2 followers."`.
- **Tests:**
  - New `__tests__/clout.test.ts` — 18 engine tests
    (`dayKey` / `daysBetween`, `canPostToday` midnight rollover,
    `streakReward` ramp + plateau, `applyDailyPost` first / 1-7 /
    plateau / milestone / grace-cap, same-day no-op, grace
    absorbs miss, streak break with -3 sting, `pushTweet` /
    `clampFeed`).
  - 6 new store tests for the daily-post action + tweet push +
    save/load round-trip.
  - One existing test updated for the four new `SavedGame`
    fields.
  - Suite is 12/12 green at **236 tests** (was 212).
- No new runtime dependencies.
- Verification: `npx tsc --noEmit` exits 0; `npm test` 236/236.
  On-device walkthrough still owed.
- Outcome: Stage 5 cp4 done. Four of five comm apps live; the
  daily-Post / streak / Diamond economy is operational. Next
  (5.5): Market — the assets (cars/watches/houses) that complete
  the `peakNetWorth` formula and the long-tail "destinations" the
  game's win ladder points at.

## 2026-05-24 00:02 UTC — Stage 5, checkpoint 3: the Messages app
- Third comm app — Bible §5's "real friends" inbox. Held separate
  from Tunnel because the scam vector is different: Tunnel hosts
  fake channels / fake support DMs; Messages hosts the **Hijacked
  Friend** (Bible §11 / Scam Library #9) — a trusted contact whose
  account has been compromised, sliding from chit-chat into a
  $5,000 airdrop link.
- **Engine** (`src/engine/messages/messages.ts`): pure-TS data
  model. `Conversation` carries id + contactName + avatarGradient
  + optional `isSuspicious` (compromised-account flag) +
  `messages: MessageItem[]` + `unreadCount`. `MessageItem` is
  either a text bubble OR a link-preview card (`link?:
  MessageLink`) — never both. Pure helpers:
  `totalUnreadCount`, `findConversation`, `lastMessage`,
  `previewText` (collapses a link bubble to its title for the
  inbox row), `markConversationRead` (idempotent, preserves
  reference when already read), `addConversationMessage` (incoming
  bumps unread; outgoing doesn't), `addConversation`,
  `contactInitials`.
- **Data** (`src/data/messages.ts`): five seed conversations —
  Sarah (chit-chat), Marcus (VOLT trade banter), **Jordan**
  (`isSuspicious: true`, the Hijacked Friend primer — starts
  normal, escalates to "BRO, claim this $5,000 airdrop, just
  connect your wallet" with a `free-airdrop-claim.live` link
  card), Dad ("call your mother"), Mom ("did you eat today").
- **Store integration:**
  - New `messages: Conversation[]` field on `GameState` and
    `SavedGame`.
  - New actions: `openConversation(id)` (zeros unread),
    `pushConversationMessage(id, msg)`.
  - `freshGame` seeds via `createStartingMessages(now)`;
    `loadSaved` and `serializeGame` carry it through with the
    same defensive defaults the other comm apps use.
  - **`SAVE_VERSION` bumped 9 → 10.** v9 saves wipe.
- **UI** (`src/ui/messages/`):
  - `MessagesScreen` — iMessage-style black screen with the big
    "Messages" title, decorative search bar, the `ConversationRow`
    list, and the slide-in detail. Uses the stable empty-array
    fallback pattern.
  - `ConversationRow` — reserved unread-dot column (so rows
    align), gradient avatar, contact name, relative time, single-
    line preview (`previewText` collapses link bubbles).
  - `MessagesDetail` — slide-in from the right. Centred avatar +
    contact name at the top, left-aligned blue back chevron.
    Inline date stamps ("Today 9:41 AM" / "Yesterday 11:02 AM" /
    "Tuesday 7:14 PM" / "Mar 14, 9:30 AM") emitted whenever the
    calendar day changes between two adjacent messages. Auto-
    scrolls to the bottom on open. Decorative iMessage composer
    at the foot.
  - `MessageBubble` — either an iMessage-blue outgoing bubble, a
    dark-gray incoming bubble, or a left-aligned link-preview
    card with a coloured thumbnail + URL + headline.
- **Badge pipeline extended** — `useAppBadges` now reports the
  total Messages unread alongside Mail and Tunnel; the Messages
  icon on the home grid shows the red bubble.
- **Tests:**
  - New `__tests__/messages.test.ts` — 16 engine tests
    (`totalUnreadCount`, `findConversation`, `lastMessage`,
    `previewText` text + link + empty, `markConversationRead`
    idempotency, `addConversationMessage` incoming/outgoing,
    `contactInitials` edges).
  - 4 new store tests for `openConversation` /
    `pushConversationMessage` + seed presence + save/load
    round-trip.
  - One existing test updated for the new `SavedGame` field.
  - Suite is now 11/11 green at **212 tests** (was 192).
- No new runtime dependencies.
- Verification: `npx tsc --noEmit` exits 0; `npm test` 212/212.
- Outcome: Stage 5 cp3 done — three of five comm apps live.
  Next (5.4): Clout (followers + feed + daily Post + the alpha
  source for the yield-farm link).

## 2026-05-23 23:52 UTC — Stage 5, checkpoint 2: the Tunnel chat app
- Second of Stage 5's comm apps. Telegram-style chat list inside the
  in-game phone — channels + DMs, slide-in detail with bubbles, the
  unread-badge pipeline extended.
- **Engine** (`src/engine/tunnel/tunnel.ts`): pure-TS data model and
  helpers. `TunnelChat` carries `id`, `name`, `avatarGradient`,
  `kind` (`'channel' | 'dm'`), optional `memberCount` /
  `onlineCount`, `verified` (blue check), `isSuspicious`
  (phishing/duplicate-channel flag → red unread badge),
  `pinned`, `messages: TunnelMessage[]`, `unreadCount`.
  `TunnelMessage` carries `id`, optional `sender`/`outgoing`,
  `text`, `sentAt`. Pure helpers: `totalUnreadCount`,
  `findTunnelChat`, `lastMessage`, `markChatRead` (preserves the
  same array reference when already read — keeps Zustand snapshot
  stable), `addTunnelMessage` (bumps unread for incoming only),
  `addTunnelChat`, `chatInitials`, deterministic `senderColour`
  (Telegram-style coloured names hashed to a fixed 8-colour
  palette).
- **Data** (`src/data/tunnel.ts`): six starter chats —
  MoonPig Community (verified channel, the open thread from the
  mockup), MoonP1g Community (suspicious duplicate per Bible §11's
  "spot the fake channel" primer), DeFi Degens (verified, big
  unread), Tunnel Support (fake DM phish), Marcus + Sarah (friend
  DMs).
- **Store integration:**
  - New `tunnel: TunnelChat[]` field on `GameState` and `SavedGame`.
  - New actions: `openTunnelChat(chatId)` (zeros unread via
    `markChatRead`), `pushTunnelMessage(chatId, msg)` (appends +
    bumps unread for incoming).
  - `freshGame` seeds via `createStartingTunnel(now)`; `loadSaved`
    normalises a missing slice to fresh starter chats;
    `serializeGame` carries the array through, with `?? []` defence.
  - **`SAVE_VERSION` bumped 8 → 9.** Existing v8 saves wipe.
- **UI** (`src/ui/tunnel/`):
  - `TunnelScreen` — navy header (`Tunnel` title + decorative
    search bar), flat list of `TunnelChatRow`s, slide-in
    `TunnelChatDetail`. Uses the **stable empty-array fallback**
    pattern (`?? EMPTY_TUNNEL` outside the selector) so Fast
    Refresh schema bumps don't trip the snapshot-cache loop again.
  - `TunnelChatRow` — gradient avatar, name + blue-checkmark SVG
    badge for verified, last-message preview with `You:` / sender
    prefix, time, unread badge (red tint when `isSuspicious`).
  - `TunnelChatDetail` — slide-in from the right. Navy header
    (back arrow + small avatar + name + members/online subtitle),
    optional pinned-message bar (blue left border + pin icon),
    auto-scrolls to the bottom on open, decorative composer at
    the foot.
  - `MessageBubble` — incoming bubbles align left with a coloured
    sender name above; outgoing bubbles align right with lighter
    blue background and no sender label.
- **Badge pipeline extended:** `useAppBadges` now also reports the
  total Tunnel unread (`totalUnreadCount(chats)`); the home-grid
  Tunnel icon shows the red bubble alongside Mail's.
- **Tests:**
  - New `__tests__/tunnel.test.ts` — 18 engine tests covering
    every helper (totals, markRead idempotency,
    outgoing-vs-incoming unread, `senderColour` determinism, etc.).
  - 4 new store tests for `openTunnelChat`, `pushTunnelMessage`,
    seed presence, and a save/load round-trip.
  - Suite is 10/10 green at **192 tests**.
- No new runtime dependencies.
- Verification: `npx tsc --noEmit` exits 0; `npm test` 192/192.
  On-device walkthrough still owed (Tunnel home icon → chat list →
  tap MoonPig → see bubbles + pinned bar).
- Outcome: Stage 5 cp2 done. Two of five comm apps live; the
  pattern (engine + data + slide-in detail + badge) is now well-
  worn — Messages, Clout, and Market should each follow more
  briskly.

## 2026-05-23 23:11 UTC — Fix: stable empty-array fallback in Mail selectors
- The previous `?? []` fallback inside Zustand selectors created a
  brand-new empty array on every selector call whenever `s.mail`
  was undefined. Zustand uses the selector's return for change
  detection, so the constant-new reference looked like fresh data
  every render — React tripped "The result of getSnapshot should be
  cached to avoid an infinite loop" and then "Maximum update depth
  exceeded" (per KG's redbox screenshots).
- Fix: pull the empty-array fallback OUT of the selector to a
  module-level `EMPTY_MAIL` constant. The selector returns the live
  value or `undefined`; the `?? EMPTY_MAIL` resolution happens once
  on the result. Same array reference each call → stable snapshot →
  no loop.
- Applied to both `useAppBadges.ts` and `MailScreen.tsx`.
- Verification: tsc clean; npm test 170/170. Awaiting on-device
  confirmation.

## 2026-05-23 23:07 UTC — Fix: full stale-state defence — store actions, loadSaved, serialize
- The prior fix patched the read selectors but missed three other
  attack surfaces, which produced new crashes when KG hot-reloaded
  past the v8 bump:
  1. **Three mail actions** (`openMailMessage`, `deleteMailMessage`,
     `pushMailMessage`) feed `s.mail` straight into `markRead` /
     `deleteMessage` / `addMessage`, which iterate the input. If
     `s.mail` was undefined (stale state), they threw the same
     `Cannot convert undefined value to object`.
  2. **`serializeGame`** would persist an undefined field as
     missing JSON, which on next load came back as undefined and
     poisoned the freshly-launched store too.
  3. **`loadSaved`** never normalised the loaded shape — a partial
     save (from any prior poisoning) would override the fresh
     `freshGame` defaults with undefineds.
- Patches:
  - Mail actions now `?? []` their input.
  - `serializeGame` guards every nullable / collection field with
    `??` defaults (`holdings`, `playerTokens`, `bank`, `cashSwipe`,
    `peakNetWorth`, `lastUnemploymentCheckAt`, `mail`).
  - `loadSaved` reads every restored slice through a normaliser
    that backstops a missing field with `freshGame`-equivalent
    defaults (`createBank(now)`, `createCashSwipe(now)`,
    `createStartingMail(now)`, etc.). A partial save can no longer
    poison the next load.
- Proper save migrations remain Stage 7 work per the Migration
  Plan — this is just enough defence to survive Fast Refresh and
  recover from any saves that were poisoned during the v7→v8
  bump.
- Verification: tsc clean; npm test 170/170.

## 2026-05-23 22:38 UTC — Fix: guard Mail selectors against stale hot-reload state
- KG hit a "Cannot convert undefined value to object" crash at
  `unreadCount` (`mail.ts:55`) right after the v7 → v8 schema bump.
  Cause: Zustand's store instance survives Metro Fast Refresh, so
  immediately after a schema bump the in-memory state can be missing
  the newly-added field — `s.mail` reads back undefined, and the
  `for (const m of messages)` loop in `unreadCount` throws.
- A full app reload (Expo Go shake → Reload, or `r` in the Metro
  terminal) clears it, because the store re-initialises via
  `freshGame`. But we shouldn't crash mid-refresh either.
- Added `?? []` guards on both `useAppBadges` and `MailScreen`'s
  selector for `s.mail`. The selectors now safely degrade to an
  empty inbox during the brief window where stale state lacks the
  field. The crash is fully prevented; the next full reload seeds
  the real mail.
- No behavioural change in production builds (where Fast Refresh
  isn't in play).
- Verification: tsc clean.

## 2026-05-23 22:31 UTC — Stage 5, checkpoint 1: the Mail app + app-icon badges
- First of Stage 5's communication apps (Mail, Tunnel, Messages,
  Clout, Market). Sets the inbox / read-state / detail pattern the
  other comm apps will reuse.
- **Engine** (`src/engine/mail/mail.ts`): pure-TS message model and
  helpers. `MailMessage` carries `id`, `from`, `fromAddress`,
  `subject`, `preview`, `body`, `arrivedAt`, `unread`, optional
  `isSuspicious` (drives the SUSPICIOUS tag), optional in-body
  `action` button (kind: phish / safe / info — inert in v1; wired
  by the Scam Director in Stage 6). Pure helpers: `unreadCount`,
  `markRead`, `addMessage`, `deleteMessage`, `findMessage`,
  `senderInitials`.
- **Data** (`src/data/mail.ts`): `createStartingMail(now)` seeds
  five flavour messages — a welcome from the DON'T FOMO Team, an
  early-game phishing primer (so the player meets the
  SUSPICIOUS-tag pattern from minute one, Bible §11), a bank
  statement, the DON'T FOMO Weekly newsletter, and a friend tip.
  Three of the five are unread on game start.
- **Store integration:**
  - New `mail: MailMessage[]` field on `GameState` and `SavedGame`.
  - New actions: `openMailMessage(id)` (flips unread → read),
    `deleteMailMessage(id)`, `pushMailMessage(msg)`.
  - `freshGame` seeds via `createStartingMail(now)`; `loadSaved`
    and `serializeGame` carry the inbox through save/load.
  - **`SAVE_VERSION` bumped 7 → 8.** Existing v7 saves wipe — same
    precedent.
- **UI** (`src/ui/mail/`):
  - `MailScreen` — inbox: large "Inbox" title + `N unread` line,
    decorative search bar, the MailRow list, the slide-in detail
    overlay.
  - `MailRow` — blue unread dot, sender + SUSPICIOUS tag, relative
    time (h:mm / Yesterday / weekday / month day), subject,
    one-line preview. Tap fires `openMailMessage` AND opens detail.
  - `MailDetail` — slides in from the right (TokenDetail pattern).
    Avatar with sender initials in a sender-derived gradient
    (suspicious senders get red), email address (red when
    suspicious), big subject, body split on `\n\n` into paragraphs,
    optional kind-coloured action button.
  - Registered in `appScreens.ts` — tapping the Mail icon opens
    the real screen.
- **App-icon badges** (Bible §5: "rewards stay quiet and pull-based
  — app-icon badges, a counter ticking"):
  - `AppIcon` accepts an optional `badge?: number` and renders a
    small red bubble at top-right (with a hairline dark border so
    it pops on any tile gradient). "99+" cap for very large counts.
  - New `useAppBadges()` hook subscribes to the store and returns a
    per-app count map. Currently feeds only `mail` (unread count);
    Tunnel/Clout/Messages will plug in here as they land.
  - `HomeScreen` and `Dock` both use `useAppBadges()` and forward
    the badge to their icons.
- **Relative-time formatter** added to `src/ui/format.ts`
  (`formatRelativeTime(at, now)`) — used by MailRow.
- **Tests:**
  - New `__tests__/mail.test.ts` — 13 engine tests
    (`unreadCount`, `markRead`, `addMessage`, `deleteMessage`,
    `findMessage`, `senderInitials` edge cases).
  - 5 new store tests covering the three mail actions and a
    save/load round-trip.
  - One existing test updated for the new `SavedGame` field.
  - Suite is 9/9 green at **170 tests** (was 152).
- No new runtime dependencies.
- Verification: `npx tsc --noEmit --project tsconfig.json` exits 0;
  `npm test` passes 170/170. On-device tap-through still owed.
- Outcome: Stage 5 cp1 complete — Mail is playable end to end. The
  unread badge on the home screen ticks down as you open messages.
  Next (5.2): Tunnel (chat channels + DMs) — reuses the MailDetail
  slide pattern and the badge pipeline.

## 2026-05-23 22:21 UTC — CashSwipe polish pass 2: bigger bills, glowing counter, dev reset
- **Bills.** Stack bills now **220×530** (up from 160×386 ~~110×266~~).
  The stack is slid 132px below the screen edge so ~1/4 of each bill
  clips off — reads as a wad you're pulling singles off of, not a
  fully-displayed pile. Stack-step (gap between bills in the pile)
  dropped to **2px** — they sit nearly flush. Flying bills are now
  deliberately small (56×135) for the visual contrast.
- **Stack centring bug.** The stack was anchored at `left: '50%'`
  AND given an explicit width, which placed its LEFT edge at the
  midpoint and pushed everything into the right half. Replaced with
  a full-width container that centres bills via their own
  `left: '50%' + translateX(-W/2)`.
- **"Swipe up" hint** moved up — `bottom: 360 → 500` — so it sits
  in the free space between the HUD and the wad.
- **Counter goes crazy on a streak.** New `excitement` Animated.Value
  drives three native-driver effects on the earned amount:
  - **Scale** — 1.0× → 1.8× as excitement rises.
  - **Glow** — a layered gold Text behind the white number with a
    24px gold text-shadow; opacity fades in past 0.25 excitement.
    Halos around the digits when you're on a tear.
  - **Shake** — a continuous ±1 loop multiplied by an
    excitement-derived amplitude (0px at idle, ±7px at full). The
    number wobbles when the streak is hot.
- **Deflate is debounced**, not continuous: every swipe resets a
  2-second timer; when it fires, scale/glow/shake all spring back
  to baseline at once. No more constant tick-down decay.
- **`__DEV__`-gated "Reset cap (dev)" pill** on the EmptyCap state
  via new `resetCashSwipeToday(now)` store action. One tap returns
  today's count to zero so testers don't have to wait for local
  midnight. Compiled out of production builds.
- **`FLY_START_BOTTOM` retuned** to 280 — bills emerge from near
  the new (clipped-bottom) stack top.
- Sound + `expo-haptics` buzz remain explicit polish-pass per
  CLAUDE.md §9 — only visuals ship here.
- No new runtime dependencies.
- Verification: `npx tsc --noEmit` exits 0; `npm test` 152/152 green
  (UI-only changes — engine + store tests untouched).
- Outcome: CashSwipe now reads as a real coin-pusher-style minigame
  — big satisfying wad, tiny zippy bills, a counter that lifts off
  on a streak and snaps back when you stop. KG verified on Expo Go.

## 2026-05-23 21:17 UTC — Stage 4, checkpoint 5b: global banner + Stage 4 complete
- Lifted the Bank-screen-inline banner to a **global, store-driven
  notification** mounted in `PhoneShell` (Bible §5). Any action can
  now fire one via `useGameStore.getState().postBanner(title, body)`
  and the banner floats above whichever app is open.
- **Store:**
  - New `banner: BannerMessage | null` slot on `GameState`
    (transient — NOT in `SavedGame`, so it never persists across
    launches).
  - Two new actions: `postBanner(title, body)` and
    `dismissBanner(id)`. The id is fresh per post, so the same
    banner text re-animates if posted twice.
  - `payBill`, `takeLoan`, `repayLoanInstallment` now set the
    banner in their reducer (one set call per action — no chained
    side effects). The Bible §5 contract says the action *is* the
    banner-worthy event, so the action owns the notification.
  - `tick`, `resume`, `loadSaved` set the banner alongside the
    unemployment-check credit, so the player sees `"Unemployment:
    your check for $X arrived."` whenever it fires — live or on
    return from an offline gap.
- **New global mount:** `src/ui/Banner.tsx` — slides in from the
  top, sits ~2.9s, slides out, then calls `dismissBanner(id)`. A
  newer posted banner immediately replaces an in-flight one
  (last-write-wins; queueing can come later if Stage 5 needs it).
- **PhoneShell.tsx** mounts `<Banner />` last in the tree so it
  overlays both the home screen AND the open app.
- **BankScreen.tsx** dropped its inline-banner state machine and
  the `post()` helper — the store actions now own the
  notification. Affordability guards stay in the screen so we
  don't even attempt actions that would no-op.
- **`src/ui/bank/BankBanner.tsx` deleted** — its job is done by
  the global Banner.
- **Tests:** 6 new banner tests covering `postBanner` /
  `dismissBanner` (initial null, set/clear, id-mismatch no-op,
  payBill fires "Paid Rent $1,200.00", serializeGame does NOT
  include the transient banner). Suite is now 8/8 green at **152
  tests**.
- Sound + `expo-haptics` buzz remain explicit polish-pass per
  CLAUDE.md §9 — only the visual slide ships here.
- No new runtime dependencies.
- Verification: `npx tsc --noEmit` exits 0; `npm test` 152/152
  (~9s). On-device verification of the Bank actions firing banners
  and the unemployment-check banner is owed (the latter needs a
  Thursday 8pm Eastern moment, or a system-clock shift to trigger).
- **Outcome: Stage 4 (Survival & money pressure) is complete.**
  Bank with bills + loans + late fees, CashSwipe with daily cap +
  swipe-up gesture + bill physics, the Thursday unemployment check,
  and a global banner pipeline. The pressure layer the Scam
  Director (Stage 6) will exploit is live; players can now feel
  real consequences.

## 2026-05-23 21:12 UTC — Stage 4, checkpoint 5a: unemployment-check engine + store
- The Thursday 8pm Eastern unemployment check (Bible §14), engine
  and store wiring. UI-side delivery (banner + buzz) is checkpoint
  5b in the next commit; this one auto-credits silently so the
  engine half is independently verifiable.
- **Engine** (`src/engine/economy/unemploymentCheck.ts`): pure TS.
  Eastern-time handling via `Intl.DateTimeFormat` (`America/New_York`)
  — RN/Hermes ship full Intl, no extra deps. Exports:
  - `easternHourAndDayOfWeek` / `easternDayKey` — primitives.
  - `mostRecentThursday8pmEastern(now)` — the boundary anchor,
    iterates back up to a week's worth of hours.
  - `isCheckDue(lastCheckAt, now)` — true if a Thursday 8pm Eastern
    boundary has passed AND no check has been credited since;
    works for both live and offline-resume.
  - `unemploymentAmount(peakNetWorth)` — floor $50, rate 4% of
    lifetime peak, cap $25,000. Scales with the player's career
    (Bible §14 examples), not their current balance.
- **Store integration:**
  - Added `peakNetWorth: number` and
    `lastUnemploymentCheckAt: number` to `GameState` and
    `SavedGame`. Seeded in `freshGame`: peak = `STARTING_CASH`
    ($500), lastCheck = `now` so the first check fires on the
    upcoming Thursday 8pm Eastern.
  - `tick` extended: every calendar tick (20s) updates
    `peakNetWorth` (running max of `cash + holdingsValue`) and
    fires the check via `isCheckDue` / `unemploymentAmount`.
  - `resume` and `loadSaved` apply the same peak update + due-check
    logic, so an offline player who crossed a Thursday 8pm boundary
    finds the check on their cash balance when they return.
  - One check per Thursday — multiple missed Thursdays during a
    long absence still credit just one. (Tunable later if KG wants
    backlog stacking.)
- **`SAVE_VERSION` bumped 6 → 7**, wiping any v6 saves (same
  precedent). Migration framework remains Stage 7 work.
- **Tests:**
  - New `__tests__/unemploymentCheck.test.ts` — 17 tests covering
    Eastern day-of-week / hour / day-key math (across both EDT and
    EST), the boundary search, due-check logic (not yet, exactly,
    after, offline-resume, no double-credit), and the amount
    formula (floor, scale, cap, integer).
  - Updated `__tests__/store.test.ts` for the new `SavedGame`
    fields; added 6 store-level tests (peak rises with tick, peak
    never falls, credit at boundary, no double-credit, floor for
    zero peak, single credit on resume across an offline gap).
- Net worth currently = `cash + holdingsValue(holdings, market)`.
  Market-app assets (cars/watches/houses) join the formula when
  Stage 5 lands them — a one-line edit to `netWorthOf`.
- Verification: tsc clean, 8 suites / **146 tests** green (was 122).
- Outcome: the safety-net half of Stage 4 is engine-ready. Next
  (5b): lift the BankScreen's inline banner to a global store-driven
  mount in PhoneShell, and post a banner from the unemployment
  credit so the player actually sees the check arrive.

## 2026-05-23 21:04 UTC — CashSwipe polish: bill art, HUD lift, z-order
- **Bill art.** KG dropped in the satirical "WORTHLESS PAPER NOTE /
  THE FORMERLY UNITED STATES OF DEBT / ONE IOU" bill — sad-clown
  portrait — as `assets/bill.png` (1584 × 656 landscape). I created
  a pre-rotated portrait copy at `assets/bill-portrait.png` via
  `sips -r 90` (656 × 1584), because RN's `transform: rotate` does
  not change layout bounds and a CSS-style rotation would have left
  the layout in landscape. Rotating the asset once is the clean
  fix.
- **FlyingBill + BillStack** swapped their hand-drawn green tile
  (gradient + inner border + corner "100"s + `$` seal) for the real
  bill image. Container aspect now matches the source (0.414 : 1),
  so the image fills with no letterboxing or stretching:
  - Stack bills: **110 × 266**, seven stacked with 18px steps —
    reads as a real wad of cash.
  - Flying bills: **56 × 135** — small enough to feel zippy,
    readable mid-flight.
- **HUD lifted onto a 3D-feeling panel** (`CashSwipeHUD.tsx`):
  moved from `top: 70` to `top: 108`, wrapped in a dark glass-ish
  slab with a heavy drop shadow (offset 14, radius 26, opacity
  0.55) and a 1px top-edge highlight. Numbers grew: title 13 → 14,
  earned 52 → 64, "left" 13 → 14.
- **Z-order fix** (`CashSwipeScreen.tsx`): the flying-bills layer
  now renders BEFORE the HUD in JSX, so bills pass *behind* the
  lifted HUD panel. The panel has `pointerEvents="none"` so it
  doesn't intercept swipes.
- **Stronger bill shadows.** FlyingBill: opacity 0.3 → 0.6, offset
  4 → 6, radius 10 → 14. BillStack: opacity 0.25 → 0.5, offset
  -3 → -5, radius 8 → 12 (still negative-Y so the pile reads as
  bills resting on each other).
- No new dependencies; tsc clean; 122/122 tests still green
  (CashSwipe tests are engine-only, untouched by this UI polish).
- Outcome: CashSwipe now feels like the satirical money game it
  always wanted to be — the sad-clown bill is the bill. Stage 4 is
  one checkpoint from done.

## 2026-05-23 20:14 UTC — Stage 4, checkpoint 4: the CashSwipe UI
- Built the CashSwipe screen to the approved mockup, plus the store
  wiring that drives it. The minigame is now playable: swipe up,
  bills fly, cash climbs by $1 per swipe, the daily cap holds.
- **Store integration.** Added `cashSwipe: CashSwipeState` to
  `GameState` and `SavedGame`. New action `swipeOnce(now)` calls the
  engine's `applySwipe`: when below the cap it credits $1 to cash
  and stores the new swipe count; when capped it persists any day
  refresh but credits nothing.
- **SAVE_VERSION bumped 5 → 6.** Existing v5 saves discard on first
  launch — same precedent as the prior bumps. Migrations are still
  Stage 7 work.
- **New `src/ui/cashSwipe/`.** Five focused components:
  - `CashSwipeScreen` — top-level orchestrator. Green radial-ish
    gradient background, the HUD overlay, the static stack at the
    bottom, the swipe-up `PanResponder`, and the live set of flying
    bills. A 15-second tick keeps the HUD and countdown live across
    midnight rolls. The "Swipe up to make it rain" hint hides once
    three bills are airborne.
  - `BillStack` — seven slightly-rotated bills stacked at the
    bottom; the topmost carries the $ seal. Rotations are frozen
    on mount so the pile doesn't twitch.
  - `FlyingBill` — one bill, three native-driver Animated.Values:
    a sequenced parabolic Y trajectory (cubic-out up, cubic-in
    down), linear X drift, linear rotation. Calls `onComplete(id)`
    on finish so the parent drops it.
  - `CashSwipeHUD` — title + earned + "N swipes left today."
  - `EmptyCap` — out-of-swipes state with a live countdown to
    local midnight ("Come back in 14h 22m").
- **Why approximate physics, not real physics.** Real gravity needs
  per-frame JS or Reanimated worklets; both add scope. The cubic
  ease-out-up / ease-in-down sequence reads as gravity, ships on
  native-driver Animated, and looks right at 60fps on Expo Go. We
  can swap to Reanimated when it's added to the stack (CLAUDE.md §4
  has it as a target dependency).
- **Registered.** `appScreens.ts` now resolves the `cashswipe` app
  id to `CashSwipeScreen`.
- **Tests.** Updated 3 existing store tests for the new
  `cashSwipe` field. Added 4 `swipeOnce` tests (credit on success,
  no-op when capped, midnight-roll-then-spend, save/load
  round-trip). Suite is now 7/7 green at **122 tests** (10 clock +
  21 market + 16 store + 7 trade + 16 player-token + 22 bank + 22
  cashSwipe + 8 misc).
- No new runtime dependencies.
- Verification: `npx tsc --noEmit --project tsconfig.json` exits 0;
  `npm test` passes 122/122 (~5.6s). On-device gesture / physics
  verification owed.
- Outcome: Stage 4 cp 4.4 complete. CashSwipe is a real income
  floor — the guaranteed-comeback path is live. Next (4.5, the
  last of Stage 4): the Thursday 8pm Eastern unemployment check
  with the `peakNetWorth` lifetime-peak save field.

## 2026-05-23 20:07 UTC — Stage 4, checkpoint 3: the CashSwipe engine
- New `src/engine/economy/cashSwipe.ts` — pure TypeScript, no React
  imports. The engine half of the CashSwipe minigame: the income
  floor and the player's guaranteed comeback path (Design Bible §3).
- **Cap.** **1,000 swipes per day**, each paying **$1**. Cap resets
  at the player's **local midnight** (KG, 2026-05-23). Encoded as a
  `localDayKey` (`YYYY-MM-DD`, anchored to the device's local
  timezone): when today's key differs from the state's, the count
  refreshes to zero.
- **Pure API.** `createCashSwipe(now)`, `refreshDay(state, now)`,
  `swipesRemaining(state, now)`, `isCapReached(state, now)`,
  `applySwipe(state, now)` → `{ state, earned }`,
  `earnedToday(state, now)`, plus `msUntilLocalMidnight(now)` for
  the UI's "comes back at midnight" countdown.
- **Offline catch-up is implicit.** Any call after a midnight has
  passed refreshes the day automatically — there's no separate
  catch-up function to remember to call. A player who was away for
  several days lands on a fresh cap on first interaction.
- **Reset behaviour.** `applySwipe` rolls the day *first*, then
  spends a swipe — so a swipe attempted seconds after midnight on a
  fully-capped state pays $1 and starts the new day with one used.
- New `__tests__/cashSwipe.test.ts` — 22 tests covering: dayKey
  formatting + stability + midnight rollover + zero-padding;
  `msUntilLocalMidnight` boundaries; `createCashSwipe`,
  `refreshDay` (no-op + reset + purity), `swipesRemaining` /
  `isCapReached` at all states (fresh, mid, capped, day-rolled),
  and `applySwipe` (success, refusal at cap, midnight-roll-then-
  spend, full-day exhaustion exactness).
- Engine is store-free — actions return the new state and $0/$1
  earned, the store action (added in cp 4.4) credits cash and
  applies the state change. Mirrors the bank engine's pattern.
- Wired into the economy barrel; no new dependencies.
- Verification: `npx tsc --noEmit --project tsconfig.json` exits 0;
  `npm test` passes 7 suites / **118 tests** (10 clock + 21 market
  + 12 store + 7 trade + 16 player-token + 22 bank + 22 swipe + 8
  bank-action store tests).
- Outcome: the CashSwipe rules are engine-ready. Next (4.4): the
  CashSwipe screen — the swipe-up bill physics, the HUD, the
  out-of-swipes empty state, and the store wiring.

## 2026-05-23 20:03 UTC — AppView open animation: icon-colour launch overlay
- The iOS-style zoom-open animation was technically running for every
  app, but on screens whose first impression is dark (e.g. Bank's
  deep-teal balance card on `bg.base`) the scale-up was invisible —
  a dark rectangle growing on a dark background reads as a snap-in.
  Bright screens (Exchange's blue card) hid the issue.
- Fix in `src/ui/AppView.tsx`: a parallel `Animated.Value`
  (`launchOverlay`) drives a full-screen overlay using the tapped
  app's `gradient[0]` colour. It is fully opaque at the start of the
  open animation and fades to 0 in parallel with the existing scale +
  translate over `motion.duration.slow` (420ms). The overlay snaps
  back to 0 on close so the shrink-out animation is unaffected.
- The overlay is only rendered when a real `Screen` is present — the
  placeholder branch keeps its existing accent strip, so the
  "screen built in a later stage" visual is unchanged.
- Universal effect: every app now gets the iOS launch-screen visual
  continuity from icon to screen. Validated on device by KG against
  Bank and Exchange.
- No new dependencies; tsc clean.
- Outcome: dark screens now feel native to open. Future dark screens
  (Wallet, Settings, etc.) inherit the same behaviour automatically.

## 2026-05-23 19:49 UTC — Stage 4, checkpoint 2: the Bank UI
- Built the Bank screen to the approved mockup, plus the store
  integration that drives it. The Bank app is now playable end to
  end: pay bills, take loans, repay weekly installments.
- **Store integration.** Added `bank: BankState` to `GameState` and
  `SavedGame`. New actions:
  - `payBill(billId, now)` — guards against insufficient cash, then
    charges face amount + accrued late fee and advances the bill's
    due date by one 7-day cycle.
  - `takeLoan(tierId, now)` — refuses if a loan is already active or
    the tier is unknown; otherwise credits the principal to cash
    and opens a new `LoanState`.
  - `repayLoanInstallment(now)` — pays the next weekly installment,
    advances the due date, and clears the loan when the balance
    reaches zero.
- **Offline catch-up.** `resume` and `loadSaved` now call
  `accrueMissedInstallments` on the active loan, so a player who is
  away for several weeks comes back to a correctly-compounded
  balance and an advanced due date.
- **SAVE_VERSION bumped 4 → 5.** Existing v4 saves on device will
  be wiped to a fresh game on first launch — the same behaviour as
  the prior v2/v3/v4 bumps. A proper migration framework remains a
  Stage 7 deliverable per the Migration Plan.
- **New `src/ui/bank/`.** Six focused components, matching the
  approved mockup:
  - `BankScreen` — top-level layout; balance card, bills section
    (with running total), loan section, and the borrow-sheet
    overlay. Wires the three store actions and posts a banner on
    each success.
  - `BankBalanceCard` — the deep-teal gradient "Cash on hand" card,
    using `expo-linear-gradient`.
  - `BillRow` — one bill with overdue styling (red tint + border),
    the "Due in N days" / "Overdue by N days" line, the live total
    (face amount + late fee), and a Pay button that disables when
    cash is short.
  - `LoanCard` — two modes: active loan (balance, APR, next-payment
    line, Repay + Borrow-more buttons) or empty ("Borrow when you
    need cash").
  - `LoanBorrowSheet` — the bottom-sheet of loan tiers; slide-in
    animation mirrors Stage 3's `TradeSheet`.
  - `BankBanner` — the dry top-edge confirmation banner. Inline to
    Bank for v1; will lift to a global notification slot in Stage 5
    when more screens need it. Per CLAUDE.md §9, sound and
    `expo-haptics` are explicitly polish-pass and not wired here —
    only the visual slide-in.
- **Registered.** `appScreens.ts` now resolves the `bank` app id to
  `BankScreen`; tapping the Bank icon on the home grid opens the
  real screen.
- **Theme.** Renamed the unused `appAccent.fiatAndCo` token to
  `appAccent.bank` to match the locked app name (no consumer
  changed; the legacy `coinDeck` key still in use is a separate
  polish job).
- **Tests.** Updated 3 existing store tests for the new `bank`
  field. Added 11 new tests covering `payBill` (success, refusal,
  late-fee accrual), `takeLoan` (success, one-at-a-time guard,
  unknown tier), `repayLoanInstallment` (success, payoff, no-loan
  no-op, insufficient-cash refusal), and a bank save/load
  round-trip. Suite is now 6/6 green at **96 tests**.
- No new runtime dependencies.
- Verification: `npx tsc --noEmit --project tsconfig.json` exits 0;
  `npm test` passes 96/96 (~4s). On-device visual / tap-through
  verification needed on Expo Go.
- Outcome: Stage 4 cp 4.2 complete. The Bank is real, the money-
  pressure layer is live, and the player can run low on cash, owe
  bills, take loans, repay them, and feel the consequences. Next
  (4.3): the CashSwipe engine — the daily cap (1000 swipes / $1000)
  with the local-midnight reset.

## 2026-05-23 19:33 UTC — Project renamed: CryptoLife → DON'T FOMO
- KG locked the new product name. **`CryptoLife` → `DON'T FOMO`** across
  every user-facing surface, with the code identifier `dontfomo`
  (matching the GitHub repo handle `DontFOMO`).
- **app.json:** `expo.name` `CryptoLife` → `DON'T FOMO` (the on-device
  app label under the icon); `expo.slug` `cryptolife` → `dontfomo`
  (Expo's URL-safe identifier).
- **package.json:** `name` `cryptolife` → `dontfomo`. The package-lock
  still references the old name; it'll regenerate on the next
  `npm install`.
- **Source comments and log namespaces:** the `[CryptoLife]` console
  prefix in `useGameLoop.ts` and `AsyncStorageSaveAdapter.ts` is now
  `[DontFOMO]` (no apostrophe — clean for a log tag). Comments in
  `theme.ts`, `clock.ts`, `PhoneStatusBar.tsx` updated to the new
  product name.
- **Save namespace deliberately preserved.** `STORAGE_KEY` stays as
  `'cryptolife.save'` so the rename does not orphan any on-device
  saves from prior testing. A new comment in the file explains why
  and points future migrations at the `SaveAdapter` interface.
- **Folders deliberately preserved.** Per KG, the on-disk paths stay
  as `/Users/kyle/CryptoLife/` (design docs) and
  `/Users/kyle/CryptoLife/cryptolife/` (the app). Folder names are
  invisible to users and renaming them would break shell aliases,
  IDE workspaces, and this session's cwd. Path references in docs
  were caught and reverted from a bulk substitution that wrongly
  swept them.
- **Design docs renamed (outside this repo):** the 25 design-doc files
  in the parent directory — Bible, Migration Plan, Milestones, the
  refreshed Scam Library, plus all 14 `*_Mockup.html` files, the
  Brand Naming Board, the Connected Prototype, and the prototype
  bridge — were filename-renamed from `CryptoLife_*` to `DontFOMO_*`
  and content-swept. They live in an untracked dir; KG will commit
  them when he initializes a separate repo for the design docs.
- **Excluded from the rename:** `index.html` (CLAUDE.md §2 marks it
  preservation-only as the original prototype behavioural reference)
  and `DontFOMO_prototype_bridge.js` (prototype-adjacent).
- **One mockup string fix:** the Mail mockup's bank-brand strings
  (`'Bank of DON'T FOMO'`, `'DON'T FOMO Weekly'`) switched from
  single to double quotes — the apostrophe in the new name was
  terminating the JS strings.
- Verification: `npx tsc --noEmit` exits 0; `npm test` runs 6 suites
  / 85 tests green; grep audit confirms every remaining `CryptoLife`
  / `cryptolife` reference is intentional (filesystem path, folder
  identifier, save key, or honest history in older changelog
  entries).
- Outcome: the app is now DON'T FOMO everywhere it shows.
  Engineering identifiers (`dontfomo`) and the GitHub repo handle
  (`DontFOMO`) are aligned. Ready for the first push to
  `InVisionCRM/DontFOMO`.

## 2026-05-23 16:33 UTC — Stage 4, checkpoint 1: the Bank engine
- New `src/engine/economy/bank.ts` — pure TypeScript, no React imports.
  Bills, loans and the per-tick mechanics that make them tick. Wired
  into the economy barrel.
- **Bills.** Fixed **7-day cycles** (KG, 2026-05-23) — every bill recurs
  exactly one week after it is paid. Three starter bills seeded for
  every new game (Rent $1200, Utilities $180, Phone plan $60), all due
  one cycle out so a fresh player gets a full week to acclimate before
  any pressure hits. When a bill is overdue, a late fee accrues at
  **1% of the face amount per whole day overdue**, capped at **50%**.
  Pure helpers: `daysUntilDue`, `daysOverdue`, `isOverdue`,
  `billLateFee`, `billTotalDue`, `applyBillPayment`, `billsTotalDue`.
- **Loans.** Three tiers exactly as shown in the Bank mockup —
  `tier_1k` ($1,000 @ 8% APR / 4 weeks), `tier_5k` ($5,000 @ 14% / 8),
  `tier_20k` ($20,000 @ 22% / 16). Flat-interest model: the player
  receives the principal in cash and owes `principal + interest`,
  repaid as equal weekly installments (`loanWeeklyPayment`,
  `loanTotalCost`). `createLoan` returns the new loan + the cash
  credit; `applyInstallment` clears one week and returns `null` when
  the loan is fully paid; `accrueMissedInstallments` is the
  offline-catch-up function — every full week past the due date
  compounds a **2% missed-payment penalty** onto the remaining
  balance and advances the due date. v1 supports one active loan at
  a time.
- Engine is store-free — `createLoan` returns the cash credit, the
  caller deducts the cost from `nextInstallmentCost` / `billTotalDue`
  before applying state. Mirrors the buyToken / sellToken pattern
  from Stage 3.
- New `__tests__/bank.test.ts` — 22 unit tests covering bill cycle
  math, late-fee accrual + cap, payment advance, the weekly-payment
  formula per tier, `applyInstallment` payoff + return-null, missed-
  installment compounding, and purity (no input mutation).
- No new runtime dependencies.
- Verification: `npm test` runs 6 suites / **85 tests** green
  (10 clock + 21 market + 9 store + 7 trade + 16 player-token +
  22 bank). `npx tsc --noEmit --project tsconfig.json` exits 0.
- Outcome: Stage 4's engine half for the Bank is feature-complete
  and tested. Next (4.2): the Bank screen UI built to the approved
  mockup — balance card, bills list with late styling, the loan
  card, and the borrow-tier sheet. No store wiring yet (4.2 is UI;
  store wiring happens alongside it).

## 2026-05-23 16:12 UTC — Test runner persisted in package.json
- Prior sessions verified the 63 unit tests in an ad-hoc ts-jest harness,
  but `jest` / `ts-jest` / `@jest/globals` / `@types/jest` were never
  saved to `devDependencies`. As a result `npm test` failed on a clean
  install and `tsc --noEmit` flagged the test files for missing
  `@jest/globals` types — a Definition-of-Done §12 violation.
- Pinned the jest-29 line for ts-jest 29.4.x compatibility:
  `jest@29.7.0`, `@jest/globals@29.7.0`, `@types/jest@29.5.14`,
  `ts-jest@29.4.11`. Installed as devDependencies; no runtime deps
  changed.
- Verification: `npm test` runs all 5 suites green from a clean state
  (10 clock + 21 market + 9 store + 7 trade + 16 player-token = 63
  tests, ~11.7s). `npx tsc --noEmit --project tsconfig.json` exits 0
  with no errors.
- Note: `npm install` reports 11 moderate-severity advisories in
  jest 29's transitive deps. Known to the jest team and only resolved
  by moving to jest 30 — that move requires a ts-jest 30 release, so
  leaving as-is for now.
- Outcome: tests and type-check are reproducible from a fresh clone.
  Stage 3 is back to a clean DoD state; Stage 4 unblocked.

## 2026-05-23 13:39 UTC — Stage 3, checkpoint 4c: the token-launch UI
- Built the player token-launch flow — the last piece of Stage 3.
- New `LaunchWizard` — a three-step, slide-in flow: pick a logo from a
  curated emoji grid; name the token and choose a ticker (validated
  live — 3–6 letters, must not collide with a listed ticker); review
  the cost and launch. On launch it drives `launchToken`, then opens
  the new token's detail screen as the confirmation (Design Bible §5,
  no success toast).
- New `LaunchTokenCard` — the entry point on the Portfolio tab. Shows
  the next launch's cost (the first is free), and switches to a quiet
  disabled state once both lifetime launches are used.
- New `OwnBadge` — the inline "YOURS" pill. `TokenRow`, `HoldingRow`
  and `TokenDetail` show it on a token the player launched.
- Player tokens now trade like any catalogue token: `playerTokenView`
  widens a `PlayerTokenDef` into a display `TokenDefinition`, so player
  tokens flow through the Markets list, the detail screen and the trade
  sheet unchanged. `ExchangeScreen`, `TokenDetail` and `TradeSheet`
  resolve any token id — catalogue or player.
- New `src/data/launch.ts` — the 24-emoji curated set and the player-
  token "about" blurb, as data (CLAUDE.md §5).
- Added `brandSoft` / `brandText` brand tints to the theme so the
  launch flow's violet accents stay token-driven (no hardcoded colour).
- New content files only — no new dependencies.
- Verification: the whole project type-checks clean under strict mode;
  all 63 unit tests still pass (cp4c is UI-only — it touches no engine
  or store code). Visual / tap-through behaviour needs an Expo Go run
  on device.
- Outcome: Stage 3 is feature-complete — the Exchange now supports
  launching, trading and tracking the player's own tokens. Next: a
  full Stage 3 verification pass, then Stage 4.

## 2026-05-23 13:06 UTC — Stage 3, checkpoint 4b: player-token store integration
- Wired the player-token engine into the live game store. New
  `launchToken` action: it guards against the two-token cap, a ticker
  that already exists in the market, and a launch the player cannot
  afford; on success it charges the cost, adds the token to
  `playerTokens`, and joins it to the live market so it ticks and
  trades like any other token.
- `tickMarket`, `resume` and `loadSaved` now feed the market a
  follower-aware `paramsFor` lookup, so a player token's volatility
  tracks the player's follower count (Bible §9).
- Follower side-effects: buying your own token grows followers
  (`followersFromPump`, diminishing returns); selling it costs
  followers (`followersFromDump`, founder scrutiny). Catalogue-token
  trades leave followers untouched.
- `playerTokens` is now part of the saved game: added to `SavedGame`,
  `freshGame`, `loadSaved` and `serializeGame`. `SAVE_VERSION` bumped
  3 → 4 (v4 = player tokens) so older saves still load.
- Updated `__tests__/store.test.ts` for the new field and added 6
  `launchToken` tests (free first launch, paid second + third refused,
  duplicate-ticker refused, pump grows followers, dump loses them,
  save/load round-trip).
- No new dependencies. UI is unchanged — this checkpoint is store-only.
- Verification: the app/engine/store type-check clean under strict
  mode; all 63 unit tests pass (10 clock + 21 market + 9 store +
  7 trade + 9 player-token + the 6 new + 1 catalogue-trade test).
- Outcome: a launched token is fully alive in the simulation. Next
  (4c, the last of Stage 3): the launch screen UI — an emoji picker,
  the "Launch your own token" card on the Portfolio tab, and player
  tokens shown in the Exchange list and detail.

## 2026-05-23 12:50 UTC — Stage 3, checkpoint 4a: the player-token engine
- Refactored the market engine so it can tick tokens created at
  runtime: `nextPrice` now takes generic `SimParams`, `tickMarket` /
  `advanceMarket` accept an optional `getParams` lookup, and
  `seedTokenState` is extracted and exported. The static-token path and
  existing behaviour are unchanged (the default `getParams` is the
  catalogue), so no existing tests changed.
- New `src/engine/economy/playerToken.ts` — the pure rules for
  player-created tokens (Bible §9): `MAX_PLAYER_TOKENS`,
  `tokenLaunchCost` (free first, rising second), `followerVolatility`
  (a token's movement scales with followers), `followersFromPump` /
  `followersFromDump` (the diminishing-returns and founder-scrutiny
  curves), and `createPlayerToken`.
- New `__tests__/playerToken.test.ts` — 9 tests; plus a market test
  for the runtime-added-token path.
- No new dependencies.
- Verification: pure-TS files type-check clean under strict mode; all
  56 unit tests pass (10 clock + 21 market + 9 store + 7 trade +
  9 player-token).
- Outcome: the player-token rules are engine-ready. Next (4b): the
  store integration — `launchToken`, the token joining the market, and
  the pump / dump follower effects.

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
  DON'T FOMO wordmark using the theme tokens. Set `userInterfaceStyle`
  to `dark` and the display name to `DON'T FOMO` in `app.json`.
- Added this `CHANGELOG.md` and a plain-language `README.md`.
- Verification: `tsc --noEmit` run on the pure-TS files (theme,
  SaveAdapter, index files) — compiles clean under strict mode, no `any`.
- Outcome: scaffold complete and type-safe. `npm install` then
  `npx expo start` will boot the app to the dark boot screen.
  Next: Stage 2 — the phone shell and game clock.
